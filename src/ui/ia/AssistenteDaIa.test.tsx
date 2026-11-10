import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { casoDaGestante, HOJE, pacienteDaGestante, planoDeAdulto, restricoesDoCaso } from '@/domain/ia.test-utils.ts'
import { SEM_PACIENTE_IA } from '@/domain/iaPedido.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { PerfilConta } from '@/domain/situacao.ts'
import type { Plano } from '@/domain/tipos.ts'
import type { DependenciasDaSugestao } from '../estado/usarSugestaoIa.ts'
import { TelaPlano } from '../plano/TelaPlano.tsx'
import { AssistenteDaIa } from './AssistenteDaIa.tsx'

const PERFIL: PerfilConta = { nome: 'Ana', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'conferido', crnDeclaradoEm: null, crnDecididoEm: null }
const USO = { usados: 7, limite: 20, renovaEm: '2026-12-01' }
const AUTORIZADA = { em: HOJE, versao: 'ia-1' }

const PLANO_VAZIO: Plano = { refeicoes: planoDeAdulto().refeicoes.map((r) => ({ ...r, opcoes: { principal: [], substituto1: [], substituto2: [] } })) }

/** A sugestão: pão, ovo e mamão no café; leite na opção 2 (a gestante tem alergia a leite). */
const SUGESTAO = {
  refeicoes: [
    { refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }, { alimentoId: 488, gramas: 50 }, { alimentoId: 226, gramas: 170 }], opcao2: [{ alimentoId: 458, gramas: 200 }] },
    { refeicao: 1, principal: [{ alimentoId: 3, gramas: 150 }, { alimentoId: 561, gramas: 140 }, { alimentoId: 410, gramas: 100 }], opcao2: [] },
  ],
  mudancas: [],
  pontosAConfirmar: ['Confirme o horário do sulfato ferroso.'],
}
const AJUSTES = {
  refeicoes: [],
  mudancas: [{ tipo: 'gramas', refeicao: 0, opcao: 'principal', item: 0, alimentoId: null, gramas: 25, motivo: '−75 kcal no café' }],
  pontosAConfirmar: [],
}

function dependencias(resposta: unknown = SUGESTAO, espera: Promise<void> = Promise.resolve()): DependenciasDaSugestao {
  return {
    chamar: vi.fn(async (_n: string, c: Record<string, unknown>) => {
      if (c['modo'] === 'uso') return { dados: { uso: USO }, falha: null }
      await espera
      return { dados: { resposta, uso: { ...USO, usados: 8 }, foraDaBase: 0, modelo: 'claude-opus-5-5' }, falha: null }
    }),
    salvarAgora: vi.fn(async () => true),
    online: () => true,
  }
}

function Tela({ deps, planoInicial, pacienteInicial }: { readonly deps: DependenciasDaSugestao; readonly planoInicial: Plano; readonly pacienteInicial: Paciente | null }) {
  const [caso, setCaso] = useState(() => casoDaGestante())
  const [plano, setPlano] = useState(planoInicial)
  const [paciente, setPaciente] = useState(pacienteInicial)
  return (
    <>
      <output data-testid="plano">{plano.refeicoes.map((r) => r.opcoes.principal.map((i) => i.alimentoId).join(',')).join('|')}</output>
      <output data-testid="origem">{JSON.stringify(caso.origemIa)}</output>
      <output data-testid="consentimento">{JSON.stringify(paciente?.consentimentoIa ?? null)}</output>
      <button type="button" onClick={() => setPlano((p) => ({ refeicoes: p.refeicoes.slice(1) }))}>
        mexer no plano
      </button>
      <AssistenteDaIa
        caso={caso}
        aoAlterarCaso={(m) => setCaso((c) => ({ ...c, ...m }))}
        plano={plano}
        aoAlterarPlano={setPlano}
        paciente={paciente}
        aoAlterarPaciente={setPaciente}
        restricoes={restricoesDoCaso(caso)}
        perfil={PERFIL}
        estudanteAprovado={false}
        basePronta
        aoVerPlanos={vi.fn()}
        aoEditarNaFicha={vi.fn()}
        conteudo={(e) => <TelaPlano plano={plano} aoAlterarPlano={setPlano} ferramentas={e.ferramentas} topo={e.topo} vaiPara={e.vaiPara} />}
        lateral={<p>Resumo do dia</p>}
        dependencias={deps}
      />
    </>
  )
}

const montar = (deps = dependencias(), planoInicial: Plano = planoDeAdulto(), pacienteInicial: Paciente | null = pacienteDaGestante({ consentimentoIa: AUTORIZADA })) =>
  render(<Tela deps={deps} planoInicial={planoInicial} pacienteInicial={pacienteInicial} />)

describe('AssistenteDaIa (spec assistente-ia, T34)', () => {
  it('CA-2360: "Sugerir plano com IA" ao lado de "Modelos de plano"; "Adequar com IA" só com itens', () => {
    const { unmount } = montar(dependencias(), PLANO_VAZIO)
    expect(screen.getByRole('button', { name: 'Modelos de plano' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sugerir plano com IA' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Adequar com IA' })).not.toBeInTheDocument()
    unmount()
    montar()
    expect(screen.getByRole('button', { name: 'Adequar com IA' })).toBeEnabled()
  })

  it('CA-2360: sem paciente, o botão desliga e a linha de baixo diz o motivo', () => {
    montar(dependencias(), planoDeAdulto(), null)
    expect(screen.getByRole('button', { name: 'Sugerir plano com IA' })).toBeDisabled()
    expect(screen.getByText(SEM_PACIENTE_IA)).toBeInTheDocument()
  })

  it('CA-2361: a gaveta abre com o pedido, o contador e o resto da tela no lugar', async () => {
    montar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    const gaveta = screen.getByRole('complementary', { name: 'Sugerir plano com IA' })
    expect(within(gaveta).getByRole('heading', { name: 'A ficha tem' })).toBeInTheDocument()
    await waitFor(() => expect(within(gaveta).getByText(/^7 de 20 sugestões em /)).toBeInTheDocument())
    expect(within(gaveta).getByRole('button', { name: 'Sugerir plano' })).toBeEnabled()
  })

  it('CA-2365 e CB-1313: sem a autorização, "Sugerir plano" desliga; ligar grava na ficha com o dia', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(), planoDeAdulto(), pacienteDaGestante())
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
    expect(screen.getByText('Registre na ficha a autorização do paciente.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('switch', { name: 'Paciente autorizou o uso de IA' }))
    expect(screen.getByTestId('consentimento').textContent).toMatch(/"versao":"ia-1"/)
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeEnabled()
    await usuario.click(screen.getByRole('switch', { name: 'Paciente autorizou o uso de IA' }))
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
  })

  it('CA-2367, CA-2368 e CA-2402: a proposta conferida; usar pede para substituir, marca a IA no caso e "Desfazer" volta tudo', async () => {
    const usuario = userEvent.setup()
    const deps = dependencias()
    montar(deps)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    expect(deps.salvarAgora).toHaveBeenCalled()
    await screen.findByRole('group', { name: 'Totais calculados pelo app' })
    expect(screen.getByText('Alergia: leite e derivados')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/^8 de 20 sugestões em /)).toBeInTheDocument())

    await usuario.click(screen.getByRole('button', { name: 'Usar como rascunho' }))
    expect(screen.getByRole('alertdialog', { name: 'O plano atual será substituído.' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Substituir' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByText('Sugestão da IA no plano, como rascunho.').closest('[role="status"]')).not.toBeNull()
    expect(JSON.parse(screen.getByTestId('origem').textContent ?? 'null')).toEqual({ em: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), modelo: 'claude-opus-5-5' })
    expect(screen.getByTestId('plano').textContent).toBe('53,488,226|3,561,410||')

    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.getByTestId('origem').textContent).toBe('null')
    expect(screen.queryByText('Sugestão da IA no plano, como rascunho.')).not.toBeInTheDocument()
    expect(screen.getByTestId('plano').textContent).toBe('53,488,226|3,561,410,78,157|182,448|3,561,377,88')
  })

  it('CA-2368: num plano vazio, "Usar como rascunho" entra direto', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(), PLANO_VAZIO)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    await usuario.click(await screen.findByRole('button', { name: 'Usar como rascunho' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Sugestão da IA no plano, como rascunho.')).toBeInTheDocument()
  })

  it('CA-2364: sem nenhuma refeição, "Sugerir plano" desliga com o motivo', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    for (const nome of ['Café da manhã', 'Almoço', 'Lanche da tarde', 'Jantar']) await usuario.click(screen.getByRole('button', { name: `Tirar ${nome} da sugestão` }))
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
    expect(screen.getByText('Deixe ao menos uma refeição.')).toBeInTheDocument()
  })

  it('CA-2366: "Cancelar" volta ao pedido, com o aviso de que a sugestão conta se a IA terminar', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(SUGESTAO, new Promise(() => {})))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    expect(await screen.findByText('Cancelar só fecha a espera; se a IA terminar, conta no limite.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeInTheDocument()
  })

  it('CA-2370 a CA-2372: o adequar marca o que ajustar, mostra "Vai para …" no plano e aplica só as aceitas', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(AJUSTES))
    await usuario.click(screen.getByRole('button', { name: 'Adequar com IA' }))
    const gaveta = screen.getByRole('complementary', { name: 'Adequar com IA' })
    expect(within(gaveta).getByRole('heading', { name: 'O que ajustar' })).toBeInTheDocument()
    expect(within(gaveta).getByText('Autorização do paciente na ficha desde ' + HOJE.split('-').reverse().join('/') + '.')).toBeInTheDocument()
    await usuario.click(within(gaveta).getByRole('button', { name: 'Sugerir ajustes' }))
    expect(await screen.findByRole('table', { name: 'Efeito no plano' })).toBeInTheDocument()
    expect(screen.getByText('Vai para 25 g')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Aplicar 1 mudança' }))
    expect(screen.getByText('1 mudança aplicada.').closest('[role="status"]')).not.toBeNull()
    expect(JSON.parse(screen.getByTestId('origem').textContent ?? 'null')).toMatchObject({ modelo: 'claude-opus-5-5' })
  })

  it('CA-2370: sem nada marcado e sem "Outro pedido", "Sugerir ajustes" desliga', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(AJUSTES))
    await usuario.click(screen.getByRole('button', { name: 'Adequar com IA' }))
    for (const caixa of screen.queryAllByRole('checkbox')) await usuario.click(caixa)
    expect(screen.getByRole('button', { name: 'Sugerir ajustes' })).toBeDisabled()
    expect(screen.getByText('Marque ao menos um ponto.')).toBeInTheDocument()
  })

  it('CA-2373: o plano mudou enquanto a IA respondia; as mudanças são descartadas', async () => {
    const usuario = userEvent.setup()
    let soltar: () => void = () => {}
    const espera = new Promise<void>((r) => {
      soltar = r
    })
    montar(dependencias(AJUSTES, espera))
    await usuario.click(screen.getByRole('button', { name: 'Adequar com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir ajustes' }))
    await usuario.click(screen.getByRole('button', { name: 'mexer no plano' }))
    await act(async () => soltar())
    expect(await screen.findByText('O plano mudou enquanto a IA respondia. Gere de novo.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Efeito no plano' })).not.toBeInTheDocument()
  })
})

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { casoDaGestante, HOJE, pacienteDaGestante, planoDeAdulto, restricoesDoCaso } from '@/domain/ia.test-utils.ts'
import { SEM_PACIENTE_IA } from '@/domain/iaPedido.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { PerfilConta } from '@/domain/situacao.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
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

function Tela({
  deps,
  planoInicial,
  pacienteInicial,
  casoInicial = casoDaGestante(),
}: {
  readonly deps: DependenciasDaSugestao
  readonly planoInicial: Plano
  readonly pacienteInicial: Paciente | null
  readonly casoInicial?: Caso
}) {
  const [caso, setCaso] = useState(casoInicial)
  const [plano, setPlano] = useState(planoInicial)
  const [paciente, setPaciente] = useState(pacienteInicial)
  return (
    <>
      <output data-testid="plano">{plano.refeicoes.map((r) => r.opcoes.principal.map((i) => i.alimentoId).join(',')).join('|')}</output>
      <output data-testid="origem">{JSON.stringify(caso.origemIa)}</output>
      <output data-testid="metaManual">{JSON.stringify(caso.energia.getManual)}</output>
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

  it('CA-2405: a resposta sem o contador (a função não o releu) mostra a proposta, e o contador é relido', async () => {
    const usuario = userEvent.setup()
    let lidas = 0
    const deps: DependenciasDaSugestao = {
      chamar: vi.fn(async (_n: string, c: Record<string, unknown>) => {
        if (c['modo'] !== 'uso') return { dados: { resposta: SUGESTAO, foraDaBase: 0, modelo: 'claude-opus-5-5' }, falha: null }
        lidas += 1
        return { dados: { uso: { ...USO, usados: lidas === 1 ? 7 : 8 } }, falha: null }
      }),
      salvarAgora: vi.fn(async () => true),
      online: () => true,
    }
    montar(deps)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await waitFor(() => expect(screen.getByText(/^7 de 20 sugestões em /)).toBeInTheDocument())
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    expect(await screen.findByRole('button', { name: 'Usar como rascunho' })).toBeEnabled()
    expect(screen.queryByText('As sugestões com IA estão indisponíveis agora. Tente mais tarde.')).not.toBeInTheDocument()
    expect(screen.getByText(/^8 de 20 sugestões em /)).toBeInTheDocument()
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

/**
 * CA-2406: a tela troca de plano sem desmontar o assistente (as props mudam, como no endereço trocado à mão). A `key` da
 * AreaDeTrabalho recomeça o estado; aqui vale a segunda defesa, o caso e o paciente guardados no pedido e no "Desfazer".
 */
function DoisPlanos({ deps }: { readonly deps: DependenciasDaSugestao }) {
  type Qual = 'A' | 'B'
  const [qual, setQual] = useState<Qual>('A')
  const [casos, setCasos] = useState(() => ({ A: casoDaGestante({ id: 'caso-a', pacienteId: 'pac-a' }), B: casoDaGestante({ id: 'caso-b', pacienteId: 'pac-b' }) }))
  const [planos, setPlanos] = useState<Record<Qual, Plano>>(() => ({ A: planoDeAdulto(), B: { refeicoes: planoDeAdulto().refeicoes.slice(0, 1) } }))
  const [pacientes, setPacientes] = useState<Record<Qual, Paciente>>(() => ({
    A: pacienteDaGestante({ id: 'pac-a', consentimentoIa: AUTORIZADA }),
    B: pacienteDaGestante({ id: 'pac-b', consentimentoIa: AUTORIZADA }),
  }))
  const resumo = (p: Plano) => p.refeicoes.map((r) => r.opcoes.principal.map((i) => i.alimentoId).join(',')).join('|')
  const mudarPlano = (p: Plano) => setPlanos((x) => ({ ...x, [qual]: p }))
  return (
    <>
      <output data-testid="A">{resumo(planos.A)}</output>
      <output data-testid="B">{resumo(planos.B)}</output>
      <output data-testid="origemB">{JSON.stringify(casos.B.origemIa)}</output>
      <button type="button" onClick={() => setQual(qual === 'A' ? 'B' : 'A')}>
        trocar de plano
      </button>
      <AssistenteDaIa
        caso={casos[qual]}
        aoAlterarCaso={(m) => setCasos((c) => ({ ...c, [qual]: { ...c[qual], ...m } }))}
        plano={planos[qual]}
        aoAlterarPlano={mudarPlano}
        paciente={pacientes[qual]}
        aoAlterarPaciente={(p) => setPacientes((x) => ({ ...x, [qual]: p }))}
        restricoes={restricoesDoCaso(casos[qual])}
        perfil={PERFIL}
        estudanteAprovado={false}
        basePronta
        aoVerPlanos={vi.fn()}
        aoEditarNaFicha={vi.fn()}
        conteudo={(e) => <TelaPlano plano={planos[qual]} aoAlterarPlano={mudarPlano} ferramentas={e.ferramentas} topo={e.topo} vaiPara={e.vaiPara} />}
        lateral={<p>Resumo do dia</p>}
        dependencias={deps}
      />
    </>
  )
}

describe('AssistenteDaIa: o estado de um plano só (CA-2406, D-1356)', () => {
  it('CA-2406: a faixa e o "Desfazer" do plano A não aparecem no plano B; de volta ao A, valem lá', async () => {
    const usuario = userEvent.setup()
    render(<DoisPlanos deps={dependencias()} />)
    const antesDeB = screen.getByTestId('B').textContent
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    await usuario.click(await screen.findByRole('button', { name: 'Usar como rascunho' }))
    await usuario.click(screen.getByRole('button', { name: 'Substituir' }))
    expect(screen.getByText('Sugestão da IA no plano, como rascunho.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'trocar de plano' }))
    expect(screen.queryByText('Sugestão da IA no plano, como rascunho.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
    expect(screen.getByTestId('B').textContent).toBe(antesDeB)
    await usuario.click(screen.getByRole('button', { name: 'trocar de plano' }))
    await usuario.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(screen.getByTestId('A').textContent).toBe('53,488,226|3,561,410,78,157|182,448|3,561,377,88')
    expect(screen.getByTestId('B').textContent).toBe(antesDeB)
  })

  it('CA-2406: a resposta pedida para A que chega com o plano B na tela não aparece em B nem entra nele', async () => {
    const usuario = userEvent.setup()
    let soltar: () => void = () => {}
    const espera = new Promise<void>((r) => {
      soltar = r
    })
    render(<DoisPlanos deps={dependencias(SUGESTAO, espera)} />)
    const antesDeB = screen.getByTestId('B').textContent
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    await usuario.click(screen.getByRole('button', { name: 'trocar de plano' }))
    await act(async () => soltar())
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar como rascunho' })).not.toBeInTheDocument()
    // Aberta de novo no plano B, a gaveta começa pelo pedido de B.
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar como rascunho' })).not.toBeInTheDocument()
    expect(screen.getByTestId('B').textContent).toBe(antesDeB)
    expect(screen.getByTestId('origemB').textContent).toBe('null')
  })
})

describe('AssistenteDaIa: a gaveta no fluxo, de 640 a 1180 px (CA-2407, D-1357)', () => {
  // Sem `matchMedia` (o jsdom), a tela vale como a do meio: a gaveta fica no fluxo da página.
  const depois = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

  it('CA-2407: a gaveta entra entre a linha de "Modelos de plano" e as refeições, e o foco vai ao título dela', async () => {
    montar()
    const botao = screen.getByRole('button', { name: 'Sugerir plano com IA' })
    await userEvent.setup().click(botao)
    const gaveta = screen.getByRole('complementary', { name: 'Sugerir plano com IA' })
    expect(depois(screen.getByRole('button', { name: 'Adequar com IA' }), gaveta)).toBe(true)
    expect(depois(gaveta, screen.getByRole('textbox', { name: 'Nome da refeição Café da manhã' }))).toBe(true)
    expect(document.activeElement).toBe(within(gaveta).getByRole('heading', { name: 'Sugerir plano com IA' }))
  })

  it('CA-2407: do título, o Tab entra na gaveta, e não nas refeições', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    await usuario.tab()
    expect(screen.getByRole('complementary', { name: 'Sugerir plano com IA' }).contains(document.activeElement)).toBe(true)
  })
})

describe('AssistenteDaIa: o foco ao fechar (CA-2408, D-1359)', () => {
  it('CA-2408: "Usar como rascunho" fecha a gaveta e o foco volta a "Sugerir plano com IA"', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(), PLANO_VAZIO)
    const botao = screen.getByRole('button', { name: 'Sugerir plano com IA' })
    await usuario.click(botao)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    await usuario.click(await screen.findByRole('button', { name: 'Usar como rascunho' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })

  it('CA-2408: o X fecha o adequar e o foco volta a "Adequar com IA"', async () => {
    const usuario = userEvent.setup()
    montar(dependencias(AJUSTES))
    const botao = screen.getByRole('button', { name: 'Adequar com IA' })
    await usuario.click(botao)
    await usuario.click(within(screen.getByRole('complementary', { name: 'Adequar com IA' })).getAllByRole('button', { name: 'Fechar' })[0] as HTMLElement)
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })
})

describe('AssistenteDaIa: a meta de energia da gaveta (CA-2413, D-1363)', () => {
  const comManual = () => {
    const caso = casoDaGestante()
    return { ...caso, energia: { ...caso.energia, getManual: 1800 } }
  }

  it('CA-2413: a meta aparece com o separador de milhar; digitar a calculada apaga a meta manual antiga', async () => {
    const usuario = userEvent.setup()
    render(<Tela deps={dependencias()} planoInicial={planoDeAdulto()} pacienteInicial={pacienteDaGestante({ consentimentoIa: AUTORIZADA })} casoInicial={comManual()} />)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    const campo = screen.getByRole('textbox', { name: 'Meta de energia do dia' })
    expect(campo).toHaveValue('1.800')
    const calculada = /Calculada pela ficha: ([\d.]+) kcal/.exec(document.body.textContent ?? '')?.[1] ?? ''
    expect(calculada).toMatch(/^\d\.\d{3}$/)
    await usuario.clear(campo)
    await usuario.type(campo, calculada)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano' }))
    expect(screen.getByTestId('metaManual').textContent).toBe('null')
  })

  it('CA-2413: a meta inválida avisa, marca o campo e desliga "Sugerir plano"', async () => {
    const usuario = userEvent.setup()
    const deps = dependencias()
    montar(deps)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    const campo = screen.getByRole('textbox', { name: 'Meta de energia do dia' })
    await usuario.clear(campo)
    await usuario.type(campo, '300')
    expect(screen.getByText('Informe uma meta entre 500 e 6.000 kcal.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription('Informe uma meta entre 500 e 6.000 kcal.')
    expect(screen.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
    expect(screen.getByText('Corrija a meta de energia.')).toBeInTheDocument()
    expect(deps.chamar).not.toHaveBeenCalledWith('sugerir-plano', expect.objectContaining({ modo: 'gerar' }))
  })
})

describe('AssistenteDaIa: o erro numa região que já existe (CA-2410, D-1364)', () => {
  it('CA-2410: a gaveta abre com a região viva vazia, e a frase do erro entra nela', async () => {
    const usuario = userEvent.setup()
    const deps: DependenciasDaSugestao = {
      chamar: vi.fn(async (_n: string, c: Record<string, unknown>) =>
        c['modo'] === 'uso' ? { dados: { uso: USO }, falha: null } : { dados: null, falha: { status: 503, codigo: 'indisponivel', erro: null } },
      ),
      salvarAgora: vi.fn(async () => true),
      online: () => true,
    }
    montar(deps)
    await usuario.click(screen.getByRole('button', { name: 'Sugerir plano com IA' }))
    const gaveta = screen.getByRole('complementary', { name: 'Sugerir plano com IA' })
    const regiao = within(gaveta).getByRole('status')
    expect(regiao).toHaveTextContent(/^$/)
    await usuario.click(within(gaveta).getByRole('button', { name: 'Sugerir plano' }))
    await waitFor(() => expect(regiao).toHaveTextContent('As sugestões com IA estão indisponíveis agora. Tente mais tarde.'))
    expect(regiao.isConnected).toBe(true)
  })
})

// O "Documento da avaliação": a prévia A4 e "Salvar em PDF" (spec antropometria-telas, D-1429 a D-1433, D-1489,
// D-1495, D-1499; T18).
import { screen, within } from '@testing-library/react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { FRASE_PROPOSTA } from '@/domain/documentoDoPaciente.ts'
import { gravarPerfil, PERFIL_VAZIO } from '@/domain/perfil.ts'
import type { Caso } from '@/domain/tipos.ts'
import { AGORA, montarComDados, moldura, planoDe, RENATA } from './apoioDosTestes.test-utils.tsx'
import { casoDe } from './apoioDaVista.test-utils.tsx'
import { TelaAntropometria } from './TelaAntropometria.tsx'

const NUTRICIONISTA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Lima · CRN-3 61427', origem: 'conta', nome: 'Ana Lima', responsavelTecnico: '' }
const ESTUDANTE: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Bia Souza', responsavelTecnico: 'Carla Dias' }

const COMPLETO = casoDe({
  pacienteId: 'renata',
  dataConsulta: '2026-11-03',
  pesoKg: 71.5,
  estaturaCm: 164,
  circunferenciaCinturaCm: 84,
  medidasCorporais: { pontoDaCintura: 'ponto-medio', quadrilCm: 104, bracoRelaxadoDireitoCm: 31 },
  composicao: { protocolo: 'jackson-pollock-7' },
  dobras: { tricipital: 24, subescapular: 20.5, peitoral: 12, axilarMedia: 16, suprailiacaAnt: 21, abdominal: 30, coxa: 34.5 },
  avaliacao: { modalidade: 'presencial', adipometro: 'lange', origemPesoEstatura: 'aferidas' },
})

function abrir({ assinatura = NUTRICIONISTA, bloqueio = null, caso = COMPLETO }: { assinatura?: AssinaturaDoPlano | null; bloqueio?: string | null; caso?: Partial<Caso> } = {}) {
  const montado = montarComDados({ pacientes: [RENATA], planos: [planoDe('nov', caso)] }, () => (
    <TelaAntropometria
      rota={{ tela: 'antropometria', casoId: 'nov', vista: 'avaliacao' }}
      navegar={() => undefined}
      moldura={moldura}
      aoNovaAvaliacao={() => undefined}
      assinatura={assinatura}
      bloqueio={bloqueio}
      agora={AGORA}
    />
  ))
  return montado
}

async function gerar(usuario: ReturnType<typeof abrir>['usuario']) {
  await usuario.click(within(screen.getByTestId('acoes')).getByRole('button', { name: 'Gerar documento' }))
  return screen.getByRole('dialog', { name: 'Documento da avaliação' })
}

const folha = () => {
  const area = document.querySelector('.area-impressao')
  if (!(area instanceof HTMLElement)) throw new Error('sem a área de impressão')
  return within(area)
}

beforeEach(() => {
  window.localStorage.clear()
  gravarPerfil(window.localStorage, { ...PERFIL_VAZIO, telefone: '(19) 3251-4870', email: 'contato@analima.com.br' })
})

describe('o documento da avaliação (T18)', () => {
  it('CA-2457: "Gerar documento" abre a prévia com o papel claro, "Salvar em PDF" imprime e "Fechar" fecha', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const { usuario } = abrir()
    const dialogo = await gerar(usuario)
    expect(document.querySelector('.area-impressao .papel')).not.toBeNull()
    expect(folha().getByRole('heading', { name: 'Avaliação antropométrica' })).toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar em PDF' }))
    expect(imprimir).toHaveBeenCalledTimes(1)
    // O "Fechar" do rodapé (a janela também tem o "×", com o mesmo nome).
    const fechar = within(dialogo).getAllByRole('button', { name: 'Fechar' })
    expect(fechar.length).toBeGreaterThan(0)
    await usuario.click(fechar[0] as HTMLElement)
    expect(screen.queryByRole('dialog', { name: 'Documento da avaliação' })).not.toBeInTheDocument()
    imprimir.mockRestore()
  })

  it('CA-2458: o cabeçalho com o nome, "Nutricionista · CRN", o telefone e o e-mail; a assinatura com a data por extenso', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    const cabecalho = within(folha().getByRole('banner'))
    expect(cabecalho.getByText('Ana Lima')).toBeInTheDocument()
    expect(cabecalho.getByText('Nutricionista · CRN-3 61427')).toBeInTheDocument()
    expect(cabecalho.getByText('(19) 3251-4870 · contato@analima.com.br')).toBeInTheDocument()
    const assinaturas = within(folha().getByRole('group', { name: 'Assinaturas' }))
    expect(assinaturas.getByText('Ana Lima · CRN-3 61427')).toBeInTheDocument()
    expect(folha().getByText('3 de novembro de 2026')).toBeInTheDocument()
    expect(folha().getByText('A interpretação é da nutricionista e não substitui avaliação clínica.')).toBeInTheDocument()
    expect(folha().getByText('Gerado no MetaNutri')).toBeInTheDocument()
  })

  it('CA-2459: os blocos com dado: paciente, métodos, medidas básicas, dobras com o "●", resultados e referências', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    const f = folha()
    for (const titulo of ['Paciente', 'Métodos', 'Medidas básicas', 'Circunferências (cm)', 'Dobras cutâneas (mm)', 'Resultados', 'Diagnóstico nutricional', 'Referências']) {
      expect(f.getByRole('heading', { name: titulo })).toBeInTheDocument()
    }
    expect(f.queryByRole('heading', { name: 'Diâmetros ósseos (cm)' })).not.toBeInTheDocument()
    expect(f.queryByRole('heading', { name: 'Comparação com a avaliação anterior' })).not.toBeInTheDocument()
    expect(f.getByText('Renata Oliveira Campos', { selector: 'dd' })).toBeInTheDocument()
    expect(f.getByText('Primeira avaliação')).toBeInTheDocument()
    expect(f.getAllByText('dobra usada no protocolo', { exact: false }).length).toBeGreaterThan(0)
    const resultados = within(f.getByRole('table', { name: 'Resultados' }))
    expect(resultados.getByText('26,58 kg/m²')).toBeInTheDocument()
    expect(resultados.getByText('Sobrepeso')).toBeInTheDocument()
  })

  it('CA-2461: "Usar o resumo das classificações" escreve o rascunho, que fica gravado; vazio, o papel tem linhas', async () => {
    const { usuario, casos } = abrir()
    const dialogo = await gerar(usuario)
    expect(folha().getByRole('img', { name: 'Espaço para escrever o diagnóstico à mão' })).toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Usar o resumo das classificações' }))
    const campo = within(dialogo).getByRole('textbox', { name: 'Diagnóstico nutricional' })
    expect((campo as HTMLTextAreaElement).value).toMatch(/^Gordura corporal estimada por Jackson & Pollock, 7 dobras/)
    expect(casos.obter('nov')?.caso.avaliacao.diagnostico).toMatch(/IMC: Sobrepeso/)
    expect(within(dialogo).queryByRole('button', { name: 'Usar o resumo das classificações' })).not.toBeInTheDocument()
    expect(folha().queryByRole('img', { name: 'Espaço para escrever o diagnóstico à mão' })).not.toBeInTheDocument()
  })

  it('CA-2461: as observações da medida gravam e saem no papel', async () => {
    const { usuario, casos } = abrir()
    const dialogo = await gerar(usuario)
    await usuario.type(within(dialogo).getByRole('textbox', { name: 'Observações da medida' }), 'Em jejum de 3 horas.')
    expect(casos.obter('nov')?.caso.avaliacao.observacoesDaMedida).toBe('Em jejum de 3 horas.')
    expect(folha().getByText('Condições da medida: Em jejum de 3 horas.')).toBeInTheDocument()
  })

  it('CA-2462: exportação bloqueada pelo CRN: "Gerar documento" desligado, com o motivo', () => {
    abrir({ bloqueio: 'Informe o CRN em Configurações para exportar.' })
    expect(within(screen.getByTestId('acoes')).getByRole('button', { name: 'Gerar documento' })).toBeDisabled()
    expect(screen.getByText('Informe o CRN em Configurações para exportar.')).toBeInTheDocument()
  })

  it('CA-2463: conta de estudante: estagiário e preceptor e a frase de proposta', async () => {
    const { usuario } = abrir({ assinatura: ESTUDANTE, caso: { ...COMPLETO, estagiario: 'Bia Souza', preceptor: 'Carla Dias' } })
    await gerar(usuario)
    expect(folha().getByText(FRASE_PROPOSTA)).toBeInTheDocument()
    const assinaturas = within(folha().getByRole('group', { name: 'Assinaturas' }))
    expect(assinaturas.getByText('Estagiário(a)')).toBeInTheDocument()
    expect(assinaturas.getByText('Preceptor(a)')).toBeInTheDocument()
  })

  it('D-1495: sem ninguém para assinar, a linha "Assinatura" em branco', async () => {
    const { usuario } = abrir({ assinatura: null })
    await gerar(usuario)
    expect(within(folha().getByRole('group', { name: 'Assinaturas' })).getByText('Assinatura')).toBeInTheDocument()
  })

  it('CB-1444: plano sem medida: nenhuma tabela, o diagnóstico em linhas e a assinatura', async () => {
    const { usuario } = abrir({ caso: casoDe({ pacienteId: 'renata', dataConsulta: '2026-11-03' }) })
    await gerar(usuario)
    expect(folha().queryByRole('table')).not.toBeInTheDocument()
    expect(folha().queryByRole('heading', { name: 'Métodos' })).not.toBeInTheDocument()
    expect(folha().getByRole('img', { name: 'Espaço para escrever o diagnóstico à mão' })).toBeInTheDocument()
    expect(folha().getByRole('group', { name: 'Assinaturas' })).toBeInTheDocument()
  })

  it('D-1489: "Gerar documento" também no Histórico', () => {
    montarComDados({ pacientes: [RENATA], planos: [planoDe('nov', COMPLETO)] }, () => (
      <TelaAntropometria rota={{ tela: 'antropometria', casoId: 'nov', vista: 'historico' }} navegar={() => undefined} moldura={moldura} aoNovaAvaliacao={() => undefined} agora={AGORA} />
    ))
    const acoes = within(screen.getByTestId('acoes'))
    expect(acoes.getByRole('button', { name: 'Gerar documento' })).toBeInTheDocument()
    expect(acoes.getByRole('button', { name: 'Nova avaliação' })).toBeInTheDocument()
  })
})

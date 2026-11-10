// O "Documento da avaliação": a prévia A4 e "Salvar em PDF" (spec antropometria-telas, D-1429 a D-1433, D-1489,
// D-1495, D-1499; T18) e, desde 10/11, sem a lista de referências (D-1540 a D-1545; D1).
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
  it('CB-1484 (D-1523): o peso fora da faixa, gravado pela etapa 1, não sai no documento', async () => {
    const { usuario } = abrir({ caso: { ...COMPLETO, pesoKg: 9999 } })
    await gerar(usuario)
    const papel = document.querySelector('.area-impressao')?.textContent ?? ''
    expect(papel).not.toMatch(/9\.?999/)
    expect(papel).toContain('Estatura')
  })

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

  it('CA-2459: os blocos com dado: paciente, métodos, medidas básicas, dobras com o "●" e resultados', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    const f = folha()
    for (const titulo of ['Paciente', 'Métodos', 'Medidas básicas', 'Circunferências (cm)', 'Dobras cutâneas (mm)', 'Resultados', 'Diagnóstico nutricional']) {
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

  it('CB-1490 (D-1540): sem a seção "Referências" nem citação completa; uma linha antes do aviso e da assinatura', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    const f = folha()
    expect(f.queryByRole('heading', { name: 'Referências' })).not.toBeInTheDocument()
    const papel = document.querySelector('.area-impressao')?.textContent ?? ''
    expect(papel).not.toContain('Med Sci Sports Exerc')
    expect(papel).not.toContain('Ministério da Saúde')
    expect(papel.split('Referências completas no MetaNutri.').length - 1).toBe(1)
    const linha = f.getByText('Referências completas no MetaNutri.')
    const aviso = f.getByText('A interpretação é da nutricionista e não substitui avaliação clínica.')
    expect(linha.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(linha.compareDocumentPosition(f.getByRole('heading', { name: 'Diagnóstico nutricional' })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('CB-1491 (D-1541): plano sem medida, sem fonte usada: a linha das referências não sai', async () => {
    const { usuario } = abrir({ caso: casoDe({ pacienteId: 'renata', dataConsulta: '2026-11-03' }) })
    await gerar(usuario)
    expect(folha().queryByText('Referências completas no MetaNutri.')).not.toBeInTheDocument()
  })

  it('CB-1492 (D-1542): "Resultados" sem a coluna "Fonte" e sem a fonte curta em nenhuma linha', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    const resultados = within(folha().getByRole('table', { name: 'Resultados' }))
    expect(resultados.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Indicador', 'Valor', 'Referência', 'Classificação'])
    for (const linha of resultados.getAllByRole('row').slice(1)) expect(within(linha).getAllByRole('cell')).toHaveLength(3)
    expect(document.querySelector('.area-impressao')?.textContent).not.toContain('SISVAN, 2011')
  })

  it('CB-1493 (D-1543): a nota do IMC em "Medidas básicas" é só a classificação', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    expect(folha().getByText('Sobrepeso', { selector: 'p' })).toBeInTheDocument()
  })

  it('CB-1494 (D-1544): "Métodos" fica com o protocolo, a conversão e as fontes das equações', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    expect(folha().getByText('Dobras: Jackson & Pollock, 7 dobras, conversão de Siri (Jackson, Pollock e Ward, 1980; Siri, 1961). Adipômetro Lange.')).toBeInTheDocument()
  })

  it('CB-1494 (D-1544): o rascunho do diagnóstico, quando usado, sai no papel com as fontes curtas como ela deixou', async () => {
    const { usuario } = abrir()
    const dialogo = await gerar(usuario)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Usar o resumo das classificações' }))
    expect(document.querySelector('.area-impressao')?.textContent).toContain('IMC: Sobrepeso (26,58 kg/m²; SISVAN, 2011).')
  })

  it('CB-1495 (D-1545): na tela, o "ⓘ" do IMC continua abrindo a citação completa', async () => {
    const { usuario } = abrir()
    const info = screen.getByRole('button', { name: 'Fonte: IMC' })
    await usuario.click(info)
    expect(document.getElementById(info.getAttribute('aria-controls') ?? '')?.textContent).toMatch(/^Fonte: Brasil\. Ministério da Saúde/)
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

  it('CB-1451: nenhuma data AAAA-MM-DD na tela nem no documento', async () => {
    const { usuario } = abrir()
    await gerar(usuario)
    expect(document.body.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)
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

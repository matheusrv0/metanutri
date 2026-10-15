// CA-487 (spec seguranca-lote-4): código malicioso nos textos que vêm da conta, de outra pessoa ou do
// servidor: o link do paciente (tela pública), o nome da conta, o pedido de estudante, a folha impressa e as
// telas do administrador. Cada tela é desenhada com a carga e conferida no DOM.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import type { PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { conta } from '@/domain/negocio.test-utils.ts'
import { gravarPerfil, PERFIL_VAZIO } from '@/domain/perfil.ts'
import { adicionarItem, adicionarRefeicao, criarPlanoPadrao } from '@/domain/plano.ts'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { produtoComoAlimento } from '@/domain/produtos.ts'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import type { PerfilConta } from '@/domain/situacao.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaAprovacoes } from '../ui/aprovacoes/TelaAprovacoes.tsx'
import { TelaConta } from '../ui/conta/TelaConta.tsx'
import type { ValorAprovacoes } from '../ui/estado/usarAprovacoes.ts'
import { FolhaDieta } from '../ui/exportar/FolhaDieta.tsx'
import { regraDaLinhaFina } from '../ui/exportar/linhaFina.ts'
import { TelaMissoesPaciente } from '../ui/missoes/TelaMissoesPaciente.tsx'
import { dadosFalsos, negocioFalso } from '../ui/negocio/negocioFalso.test-utils.ts'
import { TelaNegocio } from '../ui/negocio/TelaNegocio.tsx'
import { AvisoDoEstudante } from '../ui/painel/AvisoEstudante.tsx'
import { processadorFalso } from '../ui/pagamento/processadorFalso.test-utils.ts'
import { contaFalsa } from '../ui/publico/conta/contaFalsa.test-utils.ts'
import { CARGAS, cargaComoTexto, conferirSemInjecao, enderecoPerigoso, JAVASCRIPT_PURO, malicioso } from './xss.test-utils.ts'

vi.mock('../ui/estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null },
    recarregar: vi.fn(),
    cancelar: vi.fn(),
    previaDoCancelamento: vi.fn(),
    trocarCartao: vi.fn(),
  }),
}))

const alerta = vi.fn()
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'alert').mockImplementation(alerta)
})
afterEach(() => expect(alerta).not.toHaveBeenCalled())

/**
 * Cada `content: "..."` da regra da linha fina fecha a própria string antes do `;`. Dentro de uma string
 * do CSS, quebra de linha (\n, \r ou \f) solta acaba a string antes da hora, e o resto viraria regra.
 */
function stringsDoCssFechadas(css: string): boolean {
  const inicio = /content: "/g
  for (let achado = inicio.exec(css); achado; achado = inicio.exec(css)) {
    let i = achado.index + achado[0].length
    let fechou = false
    while (i < css.length) {
      const c = css[i]
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '\n' || c === '\r' || c === '\f') return false
      if (c === '"') {
        fechou = true
        break
      }
      i += 1
    }
    if (!fechou || css[i + 1] !== ';') return false
    inicio.lastIndex = i + 1
  }
  return true
}

/** Texto que tenta sair da string do CSS da linha fina: aspas, barra, as quebras de linha do CSS e chaves. */
const FUGA_DO_CSS = '"; } } } body { background: red } x { content: "\\" \n\r\f} body { color: red } x {'

describe('controle: a conferência pega HTML injetado e endereço perigoso', () => {
  it.each(CARGAS)('%s injetado como HTML reprova a conferência', (carga) => {
    // Só aqui, de propósito: é o que a conferência tem de pegar em qualquer tela.
    const { unmount } = render(<div dangerouslySetInnerHTML={{ __html: carga }} />)
    expect(() => conferirSemInjecao()).toThrow()
    unmount()
  })

  it.each([
    ['a carga inteira no endereço', malicioso('x')],
    ['javascript: puro', JAVASCRIPT_PURO],
    ['javascript: com tabulação no meio', 'java\tscript:void(0)'],
    ['javascript: com quebra de linha e maiúsculas', ' JaVa\nScRiPt:void(0)'],
    ['javascript: com entidade no meio', 'java&#x09;script:void(0)'],
    ['javascript: com os dois-pontos em entidade', 'javascript&colon;void(0)'],
    ['alert(1) depois de um endereço comum', 'https://exemplo.com/?q=alert(1)'],
  ])('um link com %s reprova a conferência', (_caso, endereco) => {
    const { unmount } = render(<a href={endereco}>x</a>)
    expect(() => conferirSemInjecao()).toThrow()
    unmount()
  })

  it('a entidade no meio do javascript:, lida pelo HTML, também reprova', () => {
    const { unmount } = render(<div dangerouslySetInnerHTML={{ __html: '<a href="java&#x09;script:void(0)">x</a>' }} />)
    expect(() => conferirSemInjecao()).toThrow()
    unmount()
  })

  it('endereço comum não é perigoso', () => {
    for (const endereco of ['https://metanutri.com.br/', 'mailto:metanutricontato@gmail.com', '#/casos', 'data:image/png;base64,iVBORw0KGgo=']) {
      expect(enderecoPerigoso(endereco), endereco).toBe(false)
    }
  })
})

describe('CA-487: código malicioso aparece como texto e nada executa (telas)', () => {
  it('CA-487: link do paciente (tela pública): nome, missões e de onde elas vêm aparecem como texto', async () => {
    const acompanhamento = criarAcompanhamento({
      casoId: 'c1',
      pacienteId: 'p1',
      nome: JAVASCRIPT_PURO,
      missoes: [{ id: 'm1', texto: malicioso('missao'), origem: malicioso('origem') }],
    })
    const fonte: FonteAcompanhamentos = { naNuvem: true, porToken: () => Promise.resolve(acompanhamento), salvar: (a) => Promise.resolve(a) }
    render(<TelaMissoesPaciente token={acompanhamento.token} fonte={fonte} hoje="2026-10-14" />)
    await waitFor(() => cargaComoTexto('missao'))
    cargaComoTexto('origem')
    // A saudação usa o primeiro nome do link: aqui, o endereço javascript: puro, como texto.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(JAVASCRIPT_PURO)
    conferirSemInjecao()
  })

  it('CA-487: nome da conta e pedido de estudante: nome, e-mail, instituição, matrícula e motivo aparecem como texto', async () => {
    const perfil: PerfilConta = { nome: malicioso('nome do perfil da conta'), situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    const pedido: PedidoEstudante = {
      id: 'p1',
      instituicao: malicioso('instituicao do pedido'),
      matricula: malicioso('matricula'),
      periodo: 3,
      formatura: '2027-07',
      status: 'recusado',
      motivo: malicioso('motivo da recusa'),
      enviadoEm: '2026-09-30T13:42:00Z',
      decididoEm: '2026-10-01T12:00:00Z',
      avisoFechado: false,
    }
    render(
      <TelaConta
        conta={contaFalsa({ sessao: { id: 'u1', email: JAVASCRIPT_PURO, nome: malicioso('nome da conta') } })}
        perfil={perfil}
        pedido={pedido}
        meFormei={vi.fn(async () => null)}
        aoMudouSituacao={vi.fn()}
        corrigirCrn={vi.fn(async () => null)}
        aoEnviarComprovante={vi.fn()}
        aoEntrar={vi.fn()}
        aoVerPrecos={vi.fn()}
        aoIrParaConfig={vi.fn()}
        aoAssinar={vi.fn()}
        aoMudouAssinatura={vi.fn()}
        criarProcessador={processadorFalso().criar}
        aoSaiu={vi.fn()}
      />,
    )
    for (const rotulo of ['nome da conta', 'instituicao do pedido', 'matricula']) cargaComoTexto(rotulo)
    expect(screen.getByText(JAVASCRIPT_PURO)).toBeInTheDocument()
    conferirSemInjecao()

    render(<AvisoDoEstudante aviso={{ tipo: 'recusado', motivo: malicioso('motivo da recusa') }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    cargaComoTexto('motivo da recusa')
    conferirSemInjecao()
  })

  it('CA-487: folha impressa: plano, refeição, produto, orientações, receitas, quem assina e o perfil aparecem como texto, e a linha fina não sai da string do CSS', () => {
    const produto = {
      id: 900_001,
      codigoBarras: '',
      nome: malicioso('nome do produto'),
      marca: malicioso('marca'),
      porcaoG: 100,
      medidaCaseira: '',
      porPorcao: { energia_kcal: 100, proteina_g: 5, lipideos_g: 2, carboidrato_g: 10 },
      criadoEm: '2026-10-14T12:00:00Z',
    }
    registrarProdutos([produtoComoAlimento(produto)])
    let n = 0
    const ids = () => `f${++n}`
    let plano = adicionarRefeicao(criarPlanoPadrao(ids), { nome: malicioso('refeicao'), horario: '15:30' }, ids)
    const refeicao = plano.refeicoes.find((r) => r.horario === '15:30')
    if (!refeicao) throw new Error('refeição não entrou')
    plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: produto.id, gramas: 50 }, ids)
    plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: 3, gramas: 100 }, ids)
    const caso: Caso = {
      ...criarCasoVazio('c1'),
      nome: `${malicioso('nome do plano')}${FUGA_DO_CSS}`,
      dataConsulta: '2026-10-14',
      pesoKg: 60,
      orientacoes: malicioso('orientacoes'),
      receitas: malicioso('receitas'),
      estagiario: malicioso('estagiario'),
      preceptor: `${malicioso('preceptor')}${FUGA_DO_CSS}`,
    }
    gravarPerfil(localStorage, { ...PERFIL_VAZIO, nome: malicioso('nome do perfil'), logo: 'javascript:alert(1)' })

    const estagio = render(<FolhaDieta caso={caso} plano={plano} restricoes={malicioso('restricao')} opcoes={{ listaDeCompras: true, trocas: true }} />)
    for (const rotulo of ['nome do plano', 'refeicao', 'nome do produto', 'marca', 'orientacoes', 'receitas', 'estagiario', 'preceptor']) cargaComoTexto(rotulo)
    conferirSemInjecao()
    const estilos = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '')
    expect(estilos.length).toBeGreaterThan(0)
    for (const css of estilos) expect(stringsDoCssFechadas(css), css).toBe(true)
    estagio.unmount()

    const nutricionista: AssinaturaDoPlano = {
      situacao: 'nutricionista',
      linhaNutricionista: `${malicioso('linha do nutricionista')}${FUGA_DO_CSS}`,
      origem: 'conta',
      nome: malicioso('nome da sessao'),
      responsavelTecnico: '',
    }
    render(<FolhaDieta caso={{ ...caso, estagiario: '', preceptor: '' }} plano={plano} assinatura={nutricionista} />)
    cargaComoTexto('linha do nutricionista')
    conferirSemInjecao()
    for (const s of document.querySelectorAll('style')) expect(stringsDoCssFechadas(s.textContent ?? ''), s.textContent ?? '').toBe(true)
  })

  it('CA-487: linha fina da folha: nenhum texto sai da string do CSS', () => {
    for (const texto of [FUGA_DO_CSS, '\f', 'a\fb', '\r\n', 'fim\\', CARGAS.join(' ')]) {
      expect(stringsDoCssFechadas(regraDaLinhaFina(texto, texto)), JSON.stringify(texto)).toBe(true)
    }
  })

  it('CA-487: telas do administrador: aprovações (estudantes e CRN) e negócio mostram nome, e-mail, instituição e matrícula como texto', async () => {
    const pedido: PedidoParaAprovar = {
      id: 'p1',
      usuario: 'u1',
      nome: malicioso('nome no pedido'),
      email: JAVASCRIPT_PURO,
      instituicao: malicioso('instituicao no pedido'),
      matricula: malicioso('matricula no pedido'),
      periodo: 3,
      formatura: '2027-07',
      enviadoEm: '2026-09-28T10:00:00Z',
      arquivo: 'u1/a.pdf',
    }
    const aprovacoes: ValorAprovacoes = {
      pedidos: [pedido],
      crns: [
        {
          usuario: 'u2',
          nome: malicioso('nome no crn'),
          email: JAVASCRIPT_PURO,
          crn: { regiao: 6, numero: '12345' },
          contaCriadaEm: '2026-09-30T12:00:00Z',
          status: 'em_conferencia',
          decididoEm: null,
        },
      ],
      pendentes: { estudantes: 1, crn: 1, total: 2 },
      carregado: true,
      erro: null,
      decidirPedido: vi.fn(async () => null),
      decidirCrn: vi.fn(async () => null),
      abrirComprovante: vi.fn(async () => 'https://assinado/x'),
      recarregar: vi.fn(),
    }
    const tela = render(<TelaAprovacoes aprovacoes={aprovacoes} />)
    for (const rotulo of ['nome no pedido', 'instituicao no pedido', 'matricula no pedido']) cargaComoTexto(rotulo)
    expect(screen.getAllByText(JAVASCRIPT_PURO).length).toBeGreaterThan(0)
    conferirSemInjecao()
    await userEvent.setup().click(screen.getByRole('radio', { name: /CRN/ }))
    await waitFor(() => cargaComoTexto('nome no crn'))
    expect(screen.getAllByText(JAVASCRIPT_PURO).length).toBeGreaterThan(0)
    conferirSemInjecao()
    tela.unmount()

    const dados = dadosFalsos()
    render(
      <TelaNegocio
        negocio={negocioFalso({
          dados: { ...dados, contas: [conta('x1', { nome: malicioso('nome da conta no painel'), email: JAVASCRIPT_PURO, criadaEm: '2026-10-01T12:00:00Z' }), ...dados.contas] },
        })}
      />,
    )
    cargaComoTexto('nome da conta no painel')
    expect(screen.getAllByText(JAVASCRIPT_PURO).length).toBeGreaterThan(0)
    conferirSemInjecao()
  })
})

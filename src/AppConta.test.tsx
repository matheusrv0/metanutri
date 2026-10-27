import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProcessadorFalso } from './ui/pagamento/processadorFalso.test-utils.ts'
import { App } from './App.tsx'
import { CHAVE_DONO } from './domain/donoDosDados.ts'
import { CHAVE_AVISO_VISTO } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import type { Resultado, ValorConta } from './ui/estado/usarConta.ts'
import { CHAVE_EMAIL_PENDENTE, guardarEmailPendente, lerEmailPendente } from './ui/emailPendente.ts'
import { CHAVE_DESTINO } from './ui/fluxoConta.ts'
import { contaFalsa } from './ui/publico/conta/contaFalsa.test-utils.ts'
import { gravarMarca } from './ui/sessao/marcaDeUso.ts'
import { gravarSaida } from './ui/sessao/motivoDaSaida.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

const estado = vi.hoisted(() => ({ conta: null as unknown }))
// Spec separacao-site-app, DP-SA-50: as páginas do site saem do app por esta função; o jsdom não navega.
const site = vi.hoisted(() => ({ sair: vi.fn<(endereco: string) => void>() }))
vi.mock('./ui/enderecos.ts', async (original) => ({
  ...(await original<typeof import('./ui/enderecos.ts')>()),
  sairParaOSite: (endereco: string) => site.sair(endereco),
}))

vi.mock('./ui/estado/usarConta.ts', () => ({ useConta: () => estado.conta }))
// Sem o cliente da nuvem: estes testes são do portão e dos dados por conta; os da nuvem estão em AppNuvem.test.tsx.
vi.mock('./ui/estado/supabase.ts', () => ({ obterSupabase: () => null, supabaseConfigurado: () => true }))
const cobranca = vi.hoisted(() => ({
  carregado: true,
  assinar: vi.fn(),
  recarregar: vi.fn(),
  cancelar: vi.fn(async () => ({ ok: true as const })),
  assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null } as unknown,
}))
const processador = vi.hoisted(() => ({ falso: null as unknown as ProcessadorFalso }))
vi.mock('./ui/pagamento/processadorMercadoPago.ts', async () => {
  const { processadorFalso } = await import('./ui/pagamento/processadorFalso.test-utils.ts')
  processador.falso = processadorFalso()
  return { processadorDoSite: () => processador.falso.criar }
})
vi.mock('./ui/estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: cobranca.assinatura,
    carregado: cobranca.carregado,
    carregando: false,
    assinar: cobranca.assinar,
    cancelar: cobranca.cancelar,
    previaDoCancelamento: vi.fn(async () => ({ ok: true as const, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' })),
    trocarCartao: vi.fn(),
    recarregar: cobranca.recarregar,
  }),
}))

const verificacao = vi.hoisted(() => ({
  perfil: { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null } as unknown,
  ehAdmin: false,
  precisaSegundoFator: false,
  carregado: true,
  pedido: null as unknown,
  pedidoCarregado: true,
}))

vi.mock('./ui/estado/usarPerfilConta.ts', () => ({
  usePerfilConta: () => ({
    perfil: verificacao.perfil,
    ehAdmin: verificacao.ehAdmin,
    precisaSegundoFator: verificacao.precisaSegundoFator,
    carregado: verificacao.carregado,
    falhou: false,
    informarSituacao: vi.fn(async () => null),
    meFormei: vi.fn(async () => null),
    corrigirCrn: vi.fn(async () => null),
    recarregar: vi.fn(),
  }),
}))
vi.mock('./ui/estado/usarPedidoEstudante.ts', () => ({
  usePedidoEstudante: () => ({ pedido: verificacao.pedido, carregado: verificacao.pedidoCarregado, enviar: vi.fn(async () => null), fecharAviso: vi.fn(async () => undefined), recarregar: vi.fn() }),
}))
vi.mock('./ui/estado/usarAprovacoes.ts', () => ({
  useAprovacoes: () => ({
    pedidos: [],
    crns: [],
    pendentes: { estudantes: 0, crn: 0, total: 0 },
    carregado: true,
    erro: null,
    decidirPedido: vi.fn(),
    decidirCrn: vi.fn(),
    abrirComprovante: vi.fn(),
    recarregar: vi.fn(),
  }),
}))

const segundoFator = vi.hoisted(() => ({ ativo: null as boolean | null }))
vi.mock('./ui/estado/usarSegundoFator.ts', async (original) => ({
  ...(await original<typeof import('./ui/estado/usarSegundoFator.ts')>()),
  useSegundoFator: (ativo: boolean) => {
    segundoFator.ativo = ativo
    return { etapa: { tipo: 'confirmar', fatorId: 'f1' }, confirmar: vi.fn(async () => null), tentarDeNovo: vi.fn() }
  },
}))

const negocio = vi.hoisted(() => ({ dados: null as unknown, atualizar: vi.fn() }))
vi.mock('./ui/estado/usarNegocio.ts', () => ({
  FALHA_AO_LER_NEGOCIO: 'Não foi possível ler os números agora. Confira a internet e toque em Atualizar.',
  useNegocio: () => ({ dados: negocio.dados, carregando: false, erro: null, atualizar: negocio.atualizar }),
}))

const comSessao = (id: string): ValorConta => contaFalsa({ sessao: { id, email: `${id}@exemplo.com`, nome: 'Maria' } })
const tela = () => (
  <ProvedorTema>
    <App />
  </ProvedorTema>
)

describe('App com a conta ligada (spec estilo-spora)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
    estado.conta = contaFalsa()
    site.sair.mockClear()
    cobranca.carregado = true
    cobranca.assinar = vi.fn()
    cobranca.recarregar = vi.fn()
    cobranca.cancelar = vi.fn(async () => ({ ok: true as const }))
    cobranca.assinatura = { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    processador.falso.criados = 0
    verificacao.perfil = { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null }
    verificacao.ehAdmin = false
    verificacao.precisaSegundoFator = false
    segundoFator.ativo = null
    verificacao.carregado = true
    verificacao.pedido = null
    verificacao.pedidoCarregado = true
    negocio.dados = null
    negocio.atualizar = vi.fn()
  })

  it('CA-148 e CA-137: tela de trabalho sem sessão mostra Entrar, e abre sozinha quando a sessão chega', () => {
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Entre para continuar de onde parou.')).toBeInTheDocument()

    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-1409 e DP-SA-52 (spec separacao-site-app): no app, a raiz sem sessão abre Entrar, com "Conheça o MetaNutri" levando ao site', () => {
    window.location.hash = ''
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Continue de onde parou.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conheça o MetaNutri' })).toHaveAttribute('href', 'https://metanutri.com.br/')
    expect(document.getElementById('titulo-inicio')).not.toBeInTheDocument()
    expect(site.sair).not.toHaveBeenCalled()
  })

  it('CA-1410: com sessão, a raiz abre o Painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = ''
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-148 e CA-1411: o endereço do painel, sem sessão, pede Entrar', () => {
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it.each([
    ['#/inicio', 'https://metanutri.com.br/'],
    ['#/precos', 'https://metanutri.com.br/precos/'],
    ['#/precos/pro', 'https://metanutri.com.br/precos/?destaque=pro'],
    ['#/termos', 'https://metanutri.com.br/termos/'],
    ['#/privacidade', 'https://metanutri.com.br/privacidade/'],
    ['#/fontes', 'https://metanutri.com.br/fontes/'],
  ])('CA-1412: %s no app abre a página do site (%s), sem pedir entrada, com ou sem sessão', (hash, endereco) => {
    window.location.hash = hash
    const { unmount } = render(tela())
    expect(site.sair).toHaveBeenCalledWith(endereco)
    expect(screen.queryByRole('heading', { level: 1, name: 'Entrar' })).not.toBeInTheDocument()
    unmount()
    site.sair.mockClear()
    estado.conta = comSessao('conta-1')
    window.location.hash = hash
    render(tela())
    expect(site.sair).toHaveBeenCalledWith(endereco)
  })

  it('CA-150: sem servidor, o app abre no modo local', () => {
    estado.conta = contaFalsa({ disponivel: false })
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-164: checkout sem sessão pede para entrar; com sessão, abre', () => {
    window.location.hash = '#/assinar/solo/anual'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
  })

  it('checkout: espera a assinatura chegar, abre o formulário e a tela de resultado fica depois de assinar', async () => {
    window.location.hash = '#/assinar/solo/mensal'
    estado.conta = comSessao('conta-1')
    cobranca.carregado = false
    cobranca.assinar = vi.fn(async () => ({ ok: true as const, ativa: true, proximaCobranca: '2026-11-02T15:00:00.000Z' }))
    const { rerender } = render(tela())
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Número do cartão' })).not.toBeInTheDocument()
    expect(processador.falso.criados).toBe(0)

    cobranca.carregado = true
    rerender(tela())
    await act(async () => {})
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
    const usuario = userEvent.setup()
    processador.falso.preencher()
    await usuario.type(screen.getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(screen.getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(screen.getByRole('checkbox', { name: /Autorizo a cobrança/ }))
    await usuario.click(screen.getByRole('button', { name: /^Assinar por/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
    expect(cobranca.assinar).toHaveBeenCalledOnce()
  })

  it('CB-49: o link do paciente abre sem pedir entrada', () => {
    window.location.hash = '#/missoes/abc123'
    render(tela())
    expect(screen.queryByRole('heading', { level: 1, name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('CA-1413: com sessão, Criar conta vai aonde o plano levaria, em vez de mostrar o cadastro', async () => {
    estado.conta = comSessao('conta-1')
    for (const [pedido, destino] of [
      ['#/criar-conta/solo/anual', '#/assinar/solo/anual'],
      ['#/criar-conta/pro', '#/assinar/pro/mensal'],
      ['#/criar-conta', '#/painel'],
    ] as const) {
      window.location.hash = pedido
      const { unmount } = render(tela())
      await waitFor(() => expect(window.location.hash, pedido).toBe(destino))
      expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument()
      unmount()
    }
    verificacao.perfil = { nome: 'Maria', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    window.location.hash = '#/criar-conta/estudante'
    render(tela())
    await waitFor(() => expect(window.location.hash).toBe('#/comprovar-matricula'))
  })

  it('CA-1413 e DP-SA-51: sem sessão, Criar conta mostra o cadastro do plano', () => {
    window.location.hash = '#/criar-conta/solo/anual'
    render(tela())
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/criar-conta/solo/anual')
  })

  it('Criar conta recomeça quando o endereço troca de plano', async () => {
    window.location.hash = '#/criar-conta'
    render(tela())
    await userEvent.setup().type(screen.getByLabelText('Nome completo'), 'Maria')
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria')
    act(() => {
      window.location.hash = '#/criar-conta/estudante'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByLabelText('Nome completo')).toHaveValue('')
  })

  it('CB-68: conta sem situação vê "Complete seu cadastro" antes do painel', () => {
    verificacao.perfil = null
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeInTheDocument()
  })

  it('CB-68: administrador sem situação entra direto', () => {
    verificacao.perfil = null
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-279: estudante sem pedido vê o aviso para enviar o comprovante', () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByText('Envie seu comprovante de matrícula')).toBeInTheDocument()
  })

  it('CA-342: administrador vê Negócio antes de Aprovações e abre a tela', () => {
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Negócio' })).toBeInTheDocument()
    const nomes = screen.getAllByRole('button', { name: /^(Negócio|Aprovações)/ }).map((b) => b.textContent ?? '')
    expect(nomes[0]).toMatch(/^Negócio/)
    expect(nomes[1]).toMatch(/^Aprovações/)
  })

  it('CA-343 e CB-87: quem não é administrador não vê Negócio e cai no painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.queryByRole('button', { name: /^Negócio/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-363 / CA-386: a hora da leitura no corpo da tela, o botão Atualizar e nenhum subtítulo no cabeçalho', async () => {
    verificacao.ehAdmin = true
    negocio.dados = { contas: [], historico: [], uso: { links30Dias: 0, copias30Dias: 0 }, lidoEm: new Date('2026-10-02T17:32:00Z') }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.queryByText('Lido às 14:32')).not.toBeInTheDocument()
    expect(screen.queryByText('Só você vê esta tela')).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('Números lidos às 14:32.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(negocio.atualizar).toHaveBeenCalledOnce()
  })

  it('CA-292: quem não é administrador não vê Aprovações e cai no painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.queryByRole('button', { name: /Aprovações/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  describe('D-261: o administrador sem o código do app (spec seguranca-lote-5)', () => {
    it.each([
      ['#/aprovacoes', 'Aprovações'],
      ['#/negocio', 'Negócio'],
    ])('CA-836: em %s, a tela pede o código do app no lugar dos dados', (endereco, titulo) => {
      verificacao.precisaSegundoFator = true
      estado.conta = comSessao('conta-1')
      window.location.hash = endereco
      render(tela())
      expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Digite o código do app autenticador' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe(endereco)
      expect(segundoFator.ativo).toBe(true)
    })

    it('CA-839: o menu mostra Negócio e Aprovações sem o número de pendências', () => {
      verificacao.precisaSegundoFator = true
      estado.conta = comSessao('conta-1')
      window.location.hash = '#/painel'
      render(tela())
      expect(screen.getByRole('button', { name: 'Negócio' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Aprovações' })).toBeInTheDocument()
      // Fora das telas do administrador, o app autenticador não é consultado.
      expect(segundoFator.ativo).toBe(false)
    })

    it('CA-842: sem perfil, o administrador sem o código não cai em "Complete seu cadastro"', () => {
      verificacao.perfil = null
      verificacao.precisaSegundoFator = true
      estado.conta = comSessao('conta-1')
      window.location.hash = '#/aprovacoes'
      render(tela())
      expect(screen.queryByRole('heading', { level: 1, name: 'Complete seu cadastro' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Digite o código do app autenticador' })).toBeInTheDocument()
    })

    it('CA-833: conta comum em Aprovações continua indo para o painel, sem pedir código', () => {
      estado.conta = comSessao('conta-1')
      window.location.hash = '#/aprovacoes'
      render(tela())
      expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 2, name: 'Digite o código do app autenticador' })).not.toBeInTheDocument()
    })
  })

  it('CA-291: administrador vê Aprovações no menu e abre a tela', () => {
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeInTheDocument()
  })

  it('portão: com o perfil ainda carregando, mostra "Carregando…" e não troca o endereço', () => {
    // Antes da resposta, o hook ainda não sabe que a conta é administradora.
    verificacao.ehAdmin = false
    verificacao.carregado = false
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    const { rerender } = render(tela())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByRole('heading', { level: 1, name: 'Painel' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/aprovacoes')

    verificacao.ehAdmin = true
    verificacao.carregado = true
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/aprovacoes')
  })

  it('portão: com o perfil ainda carregando, não mostra "Complete seu cadastro" antes da hora', () => {
    verificacao.perfil = null
    verificacao.carregado = false
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(screen.queryByRole('heading', { level: 1, name: 'Complete seu cadastro' })).not.toBeInTheDocument()
  })

  it('CA-305: conta de nutricionista em Comprovar matrícula vê que o Estudante não é para ela', async () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Esta conta é de nutricionista' })).toBeInTheDocument()
    expect(screen.getByText('O plano Estudante é para quem cria a conta como estudante, com o e-mail da faculdade.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(window.location.hash).toBe('#/painel')
  })

  it('CA-305: a estudante com sessão, em Comprovar matrícula, vê o formulário', () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Comprove sua matrícula' })).toBeInTheDocument()
  })

  it('comprovar matrícula sem perfil (administrador) vai para o painel', () => {
    verificacao.perfil = null
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('comprovar matrícula espera o pedido carregar antes de montar o formulário', () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    verificacao.pedidoCarregado = false
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…')
    expect(window.location.hash).toBe('#/comprovar-matricula')
  })

  it('CA-304: em Conta e assinatura, a estudante sem pedido vai enviar o comprovante', async () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/conta'
    render(tela())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar comprovante' }))
    expect(window.location.hash).toBe('#/comprovar-matricula')
  })

  it('CA-289: CRN não encontrado aparece também em Conta e assinatura', () => {
    verificacao.perfil = {
      nome: 'Maria',
      situacao: 'nutricionista',
      crn: { regiao: 6, numero: '12345' },
      statusCrn: 'nao_encontrado',
      crnDeclaradoEm: '2026-09-30T12:00:00Z',
      crnDecididoEm: new Date().toISOString(),
    }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/conta'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Conta e assinatura' })).toBeInTheDocument()
    expect(screen.getByText('Não encontramos seu CRN no conselho')).toBeInTheDocument()
  })

  it('CA-380: depois de cancelar em Conta e assinatura, o App relê a assinatura (o "Assinar de novo" não usa a ativa antiga)', async () => {
    cobranca.assinatura = {
      plano: 'solo',
      planoPedido: 'solo',
      status: 'ativa',
      expiraEm: null,
      ciclo: 'mensal',
      valorCentavos: 3490,
      cartaoBandeira: 'Mastercard',
      cartaoFinal: '6351',
      proximaCobranca: '2026-11-02T15:00:00.000Z',
    }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/conta'
    render(tela())
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog')
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeEnabled())
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(cobranca.cancelar).toHaveBeenCalledOnce()
    await waitFor(() => expect(cobranca.recarregar).toHaveBeenCalled())
  })

  describe('a sessão com tempo no app (spec separacao-site-app, D-514 a D-519)', () => {
    const MIN = 60_000
    const HORA = 60 * MIN
    /** A marca de uso da conta: o último uso e a hora da entrada, há tanto tempo. */
    const marcar = (conta: string, { usoHa, entradaHa, admin = false }: { usoHa: number; entradaHa: number; admin?: boolean }) =>
      gravarMarca(localStorage, { conta, uso: Date.now() - usoHa, entrada: Date.now() - entradaHa, admin, desvio: 0 })

    it('CA-1444: perto do limite total, a faixa aparece no topo da área de trabalho, antes do conteúdo da tela', () => {
      marcar('conta-1', { usoHa: 0, entradaHa: 12 * HORA - 5 * MIN })
      estado.conta = comSessao('conta-1')
      window.location.hash = '#/pacientes'
      render(tela())
      const faixa = screen.getByText(/^A sessão termina às \d\d:\d\d\.$/)
      // No fluxo da página, como o aviso de versão nova: o primeiro bloco do conteúdo, sem cobrir nada.
      expect(document.getElementById('conteudo')?.firstElementChild).toContainElement(faixa)
      expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('CA-1440 e CB-510: vencida fora da área de trabalho (no checkout), a capa cobre a tela e a conta sai', async () => {
      marcar('conta-1', { usoHa: 31 * MIN, entradaHa: HORA })
      const conta = comSessao('conta-1')
      estado.conta = conta
      window.location.hash = '#/assinar/solo/mensal'
      render(tela())
      expect(screen.getByRole('dialog', { name: 'Encerrando a sessão…' })).toBeInTheDocument()
      await waitFor(() => expect(conta.sairPorTempo).toHaveBeenCalledOnce())
    })

    it('CA-1455: o link do paciente aberto no navegador da nutricionista nunca é coberto pelo aviso, pela faixa nem pela capa', async () => {
      marcar('conta-1', { usoHa: 13 * HORA, entradaHa: 13 * HORA })
      const conta = comSessao('conta-1')
      estado.conta = conta
      window.location.hash = '#/missoes/token-do-teste'
      render(tela())
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 20))
      })
      expect(screen.queryByRole('dialog', { name: 'Encerrando a sessão…' })).not.toBeInTheDocument()
      expect(screen.queryByText(/A sessão termina/)).not.toBeInTheDocument()
      expect(conta.sairPorTempo).not.toHaveBeenCalled()
    })

    it('CA-1456: sem servidor de conta (modo local), não há tempo de sessão', async () => {
      marcar('conta-1', { usoHa: 13 * HORA, entradaHa: 13 * HORA })
      const conta = contaFalsa({ disponivel: false, sessao: { id: 'conta-1', email: 'conta-1@exemplo.com', nome: 'Maria' } })
      estado.conta = conta
      window.location.hash = '#/pacientes'
      render(tela())
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 20))
      })
      expect(screen.queryByRole('dialog', { name: 'Encerrando a sessão…' })).not.toBeInTheDocument()
      expect(conta.sairPorTempo).not.toHaveBeenCalled()
    })

    it('CB-526 e CA-1441: o administrador sai depois de 15 minutos sem uso, mesmo antes de confirmar o código do app', async () => {
      verificacao.precisaSegundoFator = true
      marcar('conta-1', { usoHa: 16 * MIN, entradaHa: HORA })
      const conta = comSessao('conta-1')
      estado.conta = conta
      window.location.hash = '#/aprovacoes'
      render(tela())
      await waitFor(() => expect(conta.sairPorTempo).toHaveBeenCalledOnce())
    })

    it('CA-1457: o administrador que saiu por tempo entra de novo e Aprovações pede o código do app outra vez', async () => {
      verificacao.ehAdmin = true
      marcar('conta-1', { usoHa: 16 * MIN, entradaHa: HORA })
      const conta = comSessao('conta-1')
      estado.conta = conta
      window.location.hash = '#/aprovacoes'
      const { rerender } = render(tela())
      await waitFor(() => expect(conta.sairPorTempo).toHaveBeenCalledOnce())

      // A sessão encerrada era a confirmada pelo app (a conta fica sem sessão); a entrada nova começa sem o código.
      estado.conta = contaFalsa()
      rerender(tela())
      verificacao.ehAdmin = false
      verificacao.precisaSegundoFator = true
      marcar('conta-1', { usoHa: 0, entradaHa: 0 })
      // A saída foi para Entrar; a pessoa entra e volta a Aprovações.
      expect(window.location.hash).toBe('#/entrar')
      await act(async () => {
        window.location.hash = '#/aprovacoes'
        await new Promise((resolver) => setTimeout(resolver, 0))
      })
      estado.conta = comSessao('conta-1')
      rerender(tela())
      expect(screen.getByRole('heading', { level: 2, name: 'Digite o código do app autenticador' })).toBeInTheDocument()
    })

    it('CA-1450: depois da saída por tempo, a raiz do app abre "Entre de novo"', () => {
      gravarSaida(localStorage, { ate: Date.now() - MIN, pendente: false })
      window.location.hash = ''
      render(tela())
      expect(screen.getByRole('heading', { level: 1, name: 'Entre de novo' })).toBeInTheDocument()
      expect(screen.getByText(/^Sua sessão terminou\. Tudo até as \d\d:\d\d está salvo\.$/)).toBeInTheDocument()
    })

    it('CA-1445: a outra aba que saiu deixa o motivo; a tela de trabalho daqui, sem sessão, mostra "Entre de novo"', () => {
      gravarSaida(localStorage, { ate: Date.now(), pendente: true })
      window.location.hash = '#/caso/c1/plano'
      render(tela())
      expect(screen.getByRole('heading', { level: 1, name: 'Entre de novo' })).toBeInTheDocument()
      expect(screen.getByText('Sua sessão terminou. Entre para enviar o que ficou neste navegador.')).toBeInTheDocument()
    })
  })

  describe('confirmar o e-mail e trocar a senha por código (spec confirmacao-por-codigo)', () => {
    const digitar = async (usuario: ReturnType<typeof userEvent.setup>, rotulo: string, texto: string) => usuario.type(screen.getByLabelText(rotulo), texto)

    it('CA-411: entrar sem ter confirmado leva à tela do código com o e-mail preenchido', async () => {
      estado.conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'email-nao-confirmado' as const })) })
      window.location.hash = '#/entrar'
      render(tela())
      const usuario = userEvent.setup()
      await digitar(usuario, 'E-mail', 'julia@ufrn.edu.br')
      await digitar(usuario, 'Senha', 'senhaforte1')
      await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
      await usuario.click(screen.getByRole('button', { name: 'Digitar o código' }))
      expect(window.location.hash).toBe('#/confirmar-email')
      expect(screen.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
      expect(screen.getByText(/julia@ufrn\.edu\.br/)).toBeInTheDocument()
      expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    })

    it('CA-407: depois do cadastro de estudante, o código certo leva a comprovar a matrícula', async () => {
      verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
      const confirmarCodigo = vi.fn(async () => {
        estado.conta = { ...(estado.conta as ValorConta), sessao: { id: 'conta-1', email: 'julia@ufrn.edu.br', nome: 'Júlia' } }
        return { ok: true, erro: null, situacao: 'estudante', planoDesejado: 'estudante' } as const
      })
      estado.conta = contaFalsa({ confirmarCodigo })
      localStorage.setItem(CHAVE_DESTINO, '#/comprovar-matricula')
      window.location.hash = '#/confirmar-email'
      render(tela())
      const usuario = userEvent.setup()
      await digitar(usuario, 'E-mail', 'julia@ufrn.edu.br')
      await digitar(usuario, 'Código de 8 dígitos', '12345678')
      await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
      expect(confirmarCodigo).toHaveBeenCalledWith('julia@ufrn.edu.br', '12345678')
      expect(window.location.hash).toBe('#/comprovar-matricula')
      expect(localStorage.getItem(CHAVE_DESTINO)).toBeNull()
    })

    it('CA-407: sem o destino guardado neste aparelho, segue pelo que a pessoa marcou no cadastro', async () => {
      estado.conta = contaFalsa({ confirmarCodigo: vi.fn(async () => ({ ok: true, erro: null, situacao: 'estudante', planoDesejado: 'estudante' }) as const) })
      window.location.hash = '#/confirmar-email'
      render(tela())
      const usuario = userEvent.setup()
      await digitar(usuario, 'E-mail', 'julia@ufrn.edu.br')
      await digitar(usuario, 'Código de 8 dígitos', '12345678')
      await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
      expect(window.location.hash).toBe('#/comprovar-matricula')
    })

    it('CA-407: nutricionista vai para o painel', async () => {
      estado.conta = contaFalsa({ confirmarCodigo: vi.fn(async () => ({ ok: true, erro: null, situacao: 'nutricionista', planoDesejado: 'free' }) as const) })
      window.location.hash = '#/confirmar-email'
      render(tela())
      const usuario = userEvent.setup()
      await digitar(usuario, 'E-mail', 'maria@exemplo.com')
      await digitar(usuario, 'Código de 8 dígitos', '12345678')
      await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
      expect(window.location.hash).toBe('#/painel')
    })

    it('CA-412: "Esqueci a senha" manda o código e abre a tela do código com o e-mail', async () => {
      window.location.hash = '#/esqueci-senha'
      render(tela())
      const usuario = userEvent.setup()
      await digitar(usuario, 'E-mail', 'maria@exemplo.com')
      await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
      expect(window.location.hash).toBe('#/esqueci-senha/codigo')
      expect(screen.getByRole('heading', { level: 1, name: 'Crie uma senha nova' })).toBeInTheDocument()
      expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()

      await digitar(usuario, 'Código de 8 dígitos', '12345678')
      await digitar(usuario, 'Senha nova', 'novasenha1')
      await digitar(usuario, 'Repita a senha', 'novasenha1')
      await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
      const conta = estado.conta as ValorConta
      expect(conta.conferirCodigoDeSenha).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
      expect(conta.trocarSenha).toHaveBeenCalledWith('novasenha1')
      expect(window.location.hash).toBe('#/painel')
    })

    describe('até confirmar, a pessoa fica na tela do código (D-93)', () => {
      const guardar = () => guardarEmailPendente(localStorage, 'maria@exemplo.com', new Date())

      it('CA-415: com o e-mail pendente, a logo não é link e só há Confirmar, Reenviar e "Errei o e-mail"', () => {
        guardar()
        window.location.hash = '#/confirmar-email'
        render(tela())
        expect(screen.queryByRole('button', { name: 'MetaNutri, início' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Reenviar o código' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Errei o e-mail' })).toBeInTheDocument()
        expect(screen.getAllByRole('button')).toHaveLength(3)
        expect(screen.queryByRole('link')).not.toBeInTheDocument()
      })

      it.each(['', '#/entrar', '#/criar-conta', '#/painel', '#/esqueci-senha', '#/nova-senha/vencido'])(
        'CA-416: com o e-mail pendente, %s volta para a tela do código com o e-mail preenchido',
        async (hash) => {
          guardar()
          window.location.hash = hash
          render(tela())
          expect(await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
          expect(window.location.hash).toBe('#/confirmar-email')
          expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()
        },
      )

      it('CA-416 e CA-1412: Termos de uso e Política de privacidade continuam abrindo, agora no site', () => {
        guardar()
        window.location.hash = '#/termos'
        const { unmount } = render(tela())
        expect(site.sair).toHaveBeenLastCalledWith('https://metanutri.com.br/termos/')
        unmount()
        window.location.hash = '#/privacidade'
        render(tela())
        expect(site.sair).toHaveBeenLastCalledWith('https://metanutri.com.br/privacidade/')
        expect(window.location.hash).toBe('#/privacidade')
      })

      it('CA-417: o cadastro guarda o e-mail no aparelho; abrir o site de novo cai na tela do código', async () => {
        window.location.hash = '#/criar-conta'
        const primeiro = render(tela())
        const usuario = userEvent.setup()
        await usuario.type(screen.getByLabelText('Nome completo'), 'Maria Souza')
        await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
        await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
        await usuario.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
        await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
        await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
        await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12345')
        await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
        await usuario.click(screen.getByRole('button', { name: /^Criar conta/ }))
        expect(lerEmailPendente(localStorage, new Date())).toBe('maria@exemplo.com')
        primeiro.unmount()

        window.location.hash = ''
        render(tela())
        expect(await screen.findByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeInTheDocument()
        expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()
      })

      it('CA-418: "Errei o e-mail" esquece o pendente e abre Criar conta com os campos vazios', async () => {
        guardar()
        window.location.hash = '#/confirmar-email'
        render(tela())
        await userEvent.setup().click(screen.getByRole('button', { name: 'Errei o e-mail' }))
        expect(window.location.hash).toBe('#/criar-conta')
        expect(screen.getByLabelText('E-mail')).toHaveValue('')
        expect(screen.getByLabelText('Nome completo')).toHaveValue('')
        expect(localStorage.getItem(CHAVE_EMAIL_PENDENTE)).toBeNull()
      })

      it('CA-419: o código certo esquece o pendente', async () => {
        guardar()
        estado.conta = contaFalsa({ confirmarCodigo: vi.fn(async () => ({ ok: true, erro: null, situacao: 'nutricionista', planoDesejado: 'free' }) as const) })
        window.location.hash = '#/confirmar-email'
        render(tela())
        const usuario = userEvent.setup()
        await digitar(usuario, 'Código de 8 dígitos', '12345678')
        await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
        expect(localStorage.getItem(CHAVE_EMAIL_PENDENTE)).toBeNull()
        expect(window.location.hash).toBe('#/painel')
      })

      it('CB-103: pendente de mais de 24 horas é esquecido e o site abre normal', () => {
        guardarEmailPendente(localStorage, 'maria@exemplo.com', new Date(Date.now() - 25 * 3_600_000))
        window.location.hash = '#/entrar'
        render(tela())
        expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
        expect(localStorage.getItem(CHAVE_EMAIL_PENDENTE)).toBeNull()
      })

      it('CB-104: com uma sessão aberta, o pendente não prende ninguém e é esquecido', async () => {
        guardar()
        estado.conta = comSessao('conta-1')
        window.location.hash = '#/painel'
        render(tela())
        expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
        await waitFor(() => expect(localStorage.getItem(CHAVE_EMAIL_PENDENTE)).toBeNull())
      })

      it('CA-410: sem pendente, a tela do código aberta depois mantém a logo e não oferece "Errei o e-mail"', () => {
        window.location.hash = '#/confirmar-email'
        render(tela())
        expect(screen.getByRole('button', { name: 'MetaNutri, início' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Errei o e-mail' })).not.toBeInTheDocument()
      })
    })

    it('CA-414: o link antigo vencido continua abrindo a tela de link vencido', () => {
      window.location.hash = '#/confirmar-email/vencido'
      const { unmount } = render(tela())
      expect(screen.getByRole('heading', { level: 1, name: 'Este link expirou' })).toBeInTheDocument()
      unmount()
      window.location.hash = '#/nova-senha/vencido'
      render(tela())
      expect(screen.getByRole('heading', { level: 1, name: 'Este link expirou' })).toBeInTheDocument()
    })
  })
})

const paciente = (id: string, nome: string) => ({ id, nome, criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm: '2026-10-01T00:00:00.000Z' })
const guardarPacientes = (chave: string, ...lista: ReturnType<typeof paciente>[]) => localStorage.setItem(chave, JSON.stringify(lista))
const irPara = (hash: string) =>
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
const menuFixo = () => {
  const menu = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]
  if (!menu) throw new Error('menu ausente')
  return within(menu)
}

describe('dados por conta no aparelho (spec dados-por-conta)', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    estado.conta = contaFalsa()
    verificacao.perfil = { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null }
    verificacao.ehAdmin = false
    verificacao.carregado = true
    // As duas contas já viram o aviso de primeiro acesso, menos no teste do CB-122.
    localStorage.setItem('metanutri:conta:conta-a:aviso-inicial-visto', '1')
    localStorage.setItem('metanutri:conta:conta-b:aviso-inicial-visto', '1')
  })

  it('CA-465: B entra num aparelho com pacientes de A, não vê nenhum e não cai na tela de outra conta', () => {
    guardarPacientes('metanutri:conta:conta-a:pacientes', paciente('ana', 'Ana Lima'))
    estado.conta = comSessao('conta-b')
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nenhum paciente ainda' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument()
    expect(screen.queryByText('Este aparelho tem dados de outra conta')).not.toBeInTheDocument()
  })

  it('CA-466: B cria um paciente; A entra de novo e vê os próprios dados, como deixou, e nada de B', async () => {
    guardarPacientes('metanutri:conta:conta-a:pacientes', paciente('ana', 'Ana Lima'))
    estado.conta = comSessao('conta-b')
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    await userEvent.setup().click(screen.getByRole('button', { name: 'Novo paciente' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Paciente sem nome' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('metanutri:conta:conta-b:pacientes') ?? '[]')).toHaveLength(1)

    estado.conta = contaFalsa()
    rerender(tela())
    irPara('#/pacientes')
    estado.conta = comSessao('conta-a')
    rerender(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.queryByText('Paciente sem nome')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('metanutri:conta:conta-a:pacientes') ?? '[]')).toEqual([paciente('ana', 'Ana Lima')])
  })

  it('CA-467: os dados de antes da mudança continuam com a conta dona; outra conta que entra antes não os vê', () => {
    localStorage.setItem(CHAVE_DONO, 'conta-a')
    guardarPacientes('metanutri:pacientes', paciente('ana', 'Ana Lima'))
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    estado.conta = comSessao('conta-b')
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument()

    estado.conta = contaFalsa()
    rerender(tela())
    estado.conta = comSessao('conta-a')
    rerender(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(localStorage.getItem('metanutri:pacientes')).toBeNull()
  })

  it('CA-472: o que uma aba antiga gravou depois da migração aparece na próxima entrada, junto com o que a conta tinha', () => {
    localStorage.setItem(CHAVE_DONO, 'conta-a')
    guardarPacientes('metanutri:conta:conta-a:pacientes', paciente('ana', 'Ana Lima'))
    // A aba antiga, ainda na versão anterior, gravou sem prefixo.
    guardarPacientes('metanutri:pacientes', paciente('ana', 'Ana Lima'), paciente('bia', 'Bia Souza'))
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('Bia Souza')).toBeInTheDocument()
    expect(localStorage.getItem('metanutri:pacientes')).toBeNull()
  })

  it('CA-468: dados sem dono passam a ser da primeira conta que entra', () => {
    guardarPacientes('metanutri:pacientes', paciente('ana', 'Ana Lima'))
    estado.conta = comSessao('conta-b')
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-b')
    expect(JSON.parse(localStorage.getItem('metanutri:conta:conta-b:pacientes') ?? '[]')).toEqual([paciente('ana', 'Ana Lima')])
  })

  it('CA-471: o tema escolhido vale para qualquer conta neste aparelho', async () => {
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/painel'
    const { rerender } = render(tela())
    await userEvent.setup().click(within(menuFixo().getByRole('radiogroup', { name: 'Aparência' })).getByRole('radio', { name: 'Escuro' }))
    expect(document.documentElement).toHaveClass('dark')

    estado.conta = contaFalsa()
    rerender(tela())
    estado.conta = comSessao('conta-b')
    rerender(tela())
    expect(document.documentElement).toHaveClass('dark')
    expect(within(menuFixo().getByRole('radiogroup', { name: 'Aparência' })).getByRole('radio', { name: 'Escuro' })).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('metanutri:tema')).toBe('escuro')
    expect(Object.keys(localStorage).filter((c) => c.endsWith(':tema'))).toEqual(['metanutri:tema'])
  })

  it('CB-120: A sai e B entra na mesma aba: nada de A aparece, nem por um instante; A volta e vê o que é seu', () => {
    guardarPacientes('metanutri:conta:conta-a:pacientes', paciente('ana', 'Ana Lima'))
    guardarPacientes('metanutri:conta:conta-b:pacientes', paciente('bia', 'Bia Souza'))
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()

    // Tudo o que entra na tela daqui em diante fica anotado, mesmo o que sai logo depois.
    const vistos: string[] = []
    const anotar = (registros: MutationRecord[]) => {
      for (const r of registros) {
        if (r.type === 'characterData') vistos.push(r.target.textContent ?? '')
        for (const no of r.addedNodes) vistos.push(no.textContent ?? '')
      }
    }
    const observador = new MutationObserver(anotar)
    observador.observe(document.body, { childList: true, subtree: true, characterData: true })

    estado.conta = contaFalsa()
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    estado.conta = comSessao('conta-b')
    rerender(tela())
    expect(screen.getByText('Bia Souza')).toBeInTheDocument()
    anotar(observador.takeRecords())
    observador.disconnect()
    expect(vistos.some((texto) => texto.includes('Ana Lima'))).toBe(false)
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument()

    estado.conta = contaFalsa()
    rerender(tela())
    estado.conta = comSessao('conta-a')
    rerender(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.queryByText('Bia Souza')).not.toBeInTheDocument()
  })

  it('CB-120: a sessão trocada direto de A para B (em outra aba) também não mostra nada de A', () => {
    guardarPacientes('metanutri:conta:conta-a:pacientes', paciente('ana', 'Ana Lima'))
    guardarPacientes('metanutri:conta:conta-b:pacientes', paciente('bia', 'Bia Souza'))
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()

    const vistos: string[] = []
    const observador = new MutationObserver((registros) => {
      for (const r of registros) for (const no of r.addedNodes) vistos.push(no.textContent ?? '')
    })
    observador.observe(document.body, { childList: true, subtree: true })
    estado.conta = comSessao('conta-b')
    rerender(tela())
    for (const r of observador.takeRecords()) for (const no of r.addedNodes) vistos.push(no.textContent ?? '')
    observador.disconnect()

    // DP-15: a troca direta leva ao painel da conta nova.
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument()
    expect(vistos.some((texto) => texto.includes('Ana Lima'))).toBe(false)
  })

  it('DP-15: trocar de conta direto com um plano de A aberto leva ao painel, e o endereço não fica com o plano de A', async () => {
    const plano = JSON.stringify({ formato: 1, versao: 1, atualizadoEm: '2026-10-07T10:00:00.000Z', caso: { id: 'x', nome: 'Plano da Ana' }, plano: { refeicoes: [] } })
    localStorage.setItem('metanutri:conta:conta-a:casos', '["x"]')
    localStorage.setItem('metanutri:conta:conta-a:caso:x', plano)
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/caso/x/caso'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Plano da Ana' })).toBeInTheDocument()

    estado.conta = comSessao('conta-b')
    rerender(tela())
    await waitFor(() => expect(window.location.hash).toBe('#/painel'))
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()

    // Voltar ao endereço depois não leva de novo ao painel: B só não tem esse plano.
    irPara('#/caso/x/caso')
    expect(screen.getByRole('heading', { level: 1, name: 'Plano não encontrado' })).toBeInTheDocument()
  })

  it('DP-15: sair e entrar com outra conta não muda o caminho de quem entrou', () => {
    estado.conta = comSessao('conta-a')
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    estado.conta = contaFalsa()
    rerender(tela())
    estado.conta = comSessao('conta-b')
    rerender(tela())
    expect(window.location.hash).toBe('#/pacientes')
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-473: sem espaço no meio da migração, a conta vê os planos que foram e a tela avisa do resto', () => {
    const plano = (id: string, nome: string) =>
      JSON.stringify({ formato: 1, versao: 1, atualizadoEm: '2026-10-07T10:00:00.000Z', caso: { id, nome }, plano: { refeicoes: [] } })
    localStorage.setItem(CHAVE_DONO, 'conta-a')
    localStorage.setItem('metanutri:casos', '["x","y"]')
    localStorage.setItem('metanutri:caso:x', plano('x', 'Plano que coube'))
    localStorage.setItem('metanutri:caso:y', plano('y', 'Plano que não coube'))
    const gravar = Storage.prototype.setItem
    const cheio = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, chave: string, valor: string) {
      if (chave === 'metanutri:conta:conta-a:caso:y') throw new DOMException('cheio', 'QuotaExceededError')
      gravar.call(this, chave, valor)
    })
    try {
      estado.conta = comSessao('conta-a')
      window.location.hash = '#/casos'
      render(tela())
      expect(screen.getByRole('heading', { name: 'Plano que coube' })).toBeInTheDocument()
      expect(screen.queryByText('Plano que não coube')).not.toBeInTheDocument()
      expect(
        screen.getByText(
          'Parte dos dados guardados antes neste aparelho ainda não apareceu: o armazenamento do navegador está cheio. Feche outras abas do MetaNutri e recarregue a página.',
        ),
      ).toBeInTheDocument()
      expect(localStorage.getItem('metanutri:caso:y')).toBe(plano('y', 'Plano que não coube'))
    } finally {
      cheio.mockRestore()
    }
  })

  it('CB-121: navegador que não deixa guardar nada: o site abre como hoje', () => {
    const bloqueado = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    try {
      estado.conta = comSessao('conta-a')
      window.location.hash = '#/pacientes'
      render(tela())
      // Sem guardar nada, o aviso de primeiro acesso aparece a cada abertura, como já acontecia.
      expect(screen.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Pacientes', hidden: true })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Nenhum paciente ainda', hidden: true })).toBeInTheDocument()
    } finally {
      bloqueado.mockRestore()
    }
  })

  it('DP-11: a sessão de recuperação que chega no meio da troca de senha não recomeça a tela do código', async () => {
    let responder: (resultado: Resultado) => void = () => undefined
    const trocarSenha = vi.fn(
      () =>
        new Promise<Resultado>((resolver) => {
          responder = resolver
        }),
    )
    const conferirCodigoDeSenha = vi.fn(async () => {
      // Conferido o código, o Supabase abre a sessão de recuperação da conta.
      estado.conta = { ...(estado.conta as ValorConta), sessao: { id: 'conta-a', email: 'maria@exemplo.com', nome: 'Maria' }, emRecuperacao: true }
      return { ok: true, erro: null } as const
    })
    estado.conta = contaFalsa({ trocarSenha, conferirCodigoDeSenha })
    window.location.hash = '#/esqueci-senha'
    const { rerender } = render(tela())
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    await usuario.type(screen.getByLabelText('Código de 8 dígitos'), '12345678')
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.type(screen.getByLabelText('Repita a senha'), 'novasenha1')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    await waitFor(() => expect(trocarSenha).toHaveBeenCalledOnce())

    // A sessão chegou enquanto a senha nova ia para o servidor, e o servidor recusou.
    rerender(tela())
    await act(async () => responder({ ok: false, erro: 'falha-rede' }))
    expect(screen.getByText('Não foi possível falar com o servidor. Confira a internet e tente de novo.')).toBeInTheDocument()
    expect(screen.getByText(/Se existir conta com maria@exemplo\.com/)).toBeInTheDocument()
    expect(screen.getByLabelText('Senha nova')).toHaveValue('novasenha1')

    // A nova tentativa só grava a senha: o código já foi aceito.
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    await act(async () => responder({ ok: true, erro: null }))
    expect(conferirCodigoDeSenha).toHaveBeenCalledOnce()
    expect(trocarSenha).toHaveBeenCalledTimes(2)
    expect(window.location.hash).toBe('#/painel')
  })

  it('CB-122: a conta que nunca usou o aparelho começa vazia, sem erro, e vê o aviso de primeiro acesso', () => {
    localStorage.removeItem('metanutri:conta:conta-b:aviso-inicial-visto')
    // A usou o aparelho antes desta mudança e já viu o aviso.
    localStorage.setItem(CHAVE_DONO, 'conta-a')
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    localStorage.setItem('metanutri:casos', '["x"]')
    guardarPacientes('metanutri:pacientes', paciente('ana', 'Ana Lima'))
    estado.conta = comSessao('conta-b')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum plano ainda.')).toBeInTheDocument()
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument()
  })
})

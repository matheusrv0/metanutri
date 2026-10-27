import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Resultado, ValorConta } from '../../estado/usarConta.ts'
import { marcarContaExcluida } from '../../contaExcluida.ts'
import { gravarSaida } from '../../sessao/motivoDaSaida.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaEntrar } from './TelaEntrar.tsx'
import { URL_DO_TURNSTILE } from './turnstile.ts'
import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'

function montar(conta: ValorConta = contaFalsa()) {
  const props = { conta, aoEntrou: vi.fn(), aoCriarConta: vi.fn(), aoEsqueci: vi.fn(), aoConfirmarEmail: vi.fn(), aoIrParaInicio: vi.fn(), aoAbrirSistema: vi.fn() }
  render(<TelaEntrar {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function entrar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
  await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('TelaEntrar', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis.navigator, 'onLine')
  })

  it('CA-135: pede e-mail e senha e tem os atalhos', async () => {
    const { usuario, aoEsqueci, aoCriarConta } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
    await usuario.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
    expect(aoEsqueci).toHaveBeenCalledOnce()
    expect(aoCriarConta).toHaveBeenCalledOnce()
    expect(screen.getByText('No Free, você já tem')).toBeInTheDocument()
  })

  it('CA-1409 (spec separacao-site-app): "Conheça o MetaNutri" leva ao site', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Conheça o MetaNutri' })).toHaveAttribute('href', 'https://metanutri.com.br/')
  })

  it('CA-808 e DP-SA-49: depois de excluir a conta, Entrar diz "Sua conta foi excluída." no topo, antes do título, uma vez', () => {
    sessionStorage.clear()
    marcarContaExcluida(undefined, performance.timeOrigin - 1)
    montar()
    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent('Sua conta foi excluída.')
    expect(aviso.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-137: deu certo, avisa quem manda', async () => {
    const { usuario, aoEntrou, conta } = montar()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-136: e-mail ou senha errados, sem dizer qual', async () => {
    const { usuario, aoEntrou } = montar(contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'credencial-invalida' as const })) }))
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha não conferem.')
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('CA-411: e-mail sem confirmar pede a confirmação e leva à tela do código com o e-mail', async () => {
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'email-nao-confirmado' as const })) })
    const { usuario, aoConfirmarEmail, aoEntrou } = montar(conta)
    await usuario.type(screen.getByLabelText('E-mail'), ' maria@exemplo.com ')
    await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confirme seu e-mail antes de entrar.')
    expect(screen.queryByRole('button', { name: 'Reenviar o link' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Digitar o código' }))
    expect(aoConfirmarEmail).toHaveBeenCalledWith('maria@exemplo.com')
    expect(conta.reenviarConfirmacao).not.toHaveBeenCalled()
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('CA-155 e DP-26: sem internet, avisa que é preciso se conectar para entrar e abrir os dados', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    montar()
    expect(screen.getByRole('alert')).toHaveTextContent('Você está sem internet. Conecte-se para entrar e abrir seus dados.')
  })
})

describe('TelaEntrar com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-455: "Entrar" leva a verificação, com a ação de entrar', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta, aoEntrou } = montar()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('login')
    falso.aprovar('tok-entrar')
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-entrar')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-458: antes de a verificação terminar, a tela pede para esperar e nada é enviado', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montar()
    await falso.pronto()
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.entrar).not.toHaveBeenCalled()
  })

  it('CA-459: depois de uma tentativa errada, a seguinte espera a verificação nova e leva ela', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'credencial-invalida' as const })) })
    const { usuario } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenLastCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-1')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')

    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.entrar).toHaveBeenCalledTimes(1)

    falso.aprovar('tok-2')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(conta.entrar).toHaveBeenLastCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-2')
    expect(conta.entrar).toHaveBeenCalledTimes(2)
  })

  it('CA-460: o servidor recusa a verificação: a tela pede para tentar de novo, e a verificação já se renovou', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'verificacao-recusada' as const })) })
    const { usuario, aoEntrou } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível concluir a verificação de segurança. Tente de novo.')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('CA-461: sem o script, "Entrar" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    const { usuario, aoEntrou } = montar(conta)
    await falso.falharScript()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('D-119 e R-43: sem o script e com o captcha desligado no Supabase, "Entrar" entra normalmente', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const { usuario, conta, aoEntrou } = montar()
    await falso.falharScript()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-462: a verificação fica logo acima de "Entrar"', async () => {
    const falso = ligarTurnstileFalso()
    montar()
    await falso.pronto()
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Entrar' }))
  })

  it('CB-117: clique duplo em "Entrar" faz um pedido só e gasta uma verificação só', async () => {
    const falso = ligarTurnstileFalso()
    let terminar: (resultado: Resultado) => void = () => undefined
    const conta = contaFalsa({ entrar: vi.fn(() => new Promise<Resultado>((resolver) => (terminar = resolver))) })
    const { usuario } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
    await usuario.dblClick(screen.getByRole('button', { name: 'Entrar' }))
    terminar({ ok: true, erro: null })
    expect(conta.entrar).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
  })

  it('CA-463: sem a chave pública, "Entrar" envia como antes, sem verificação e sem pedir o script', async () => {
    const { usuario, conta } = montar()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(document.querySelector(`script[src="${URL_DO_TURNSTILE}"]`)).toBeNull()
  })
})

describe('TelaEntrar depois da saída por tempo (spec separacao-site-app, D-526)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('CA-1447: em dia, o título é "Entre de novo" e o aviso diz até que hora está salvo', () => {
    const hoje = new Date()
    gravarSaida(localStorage, { ate: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 1).getTime(), pendente: false })
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Entre de novo' })).toBeInTheDocument()
    expect(screen.getByText('Sua sessão terminou. Tudo até as 00:01 está salvo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('CA-1448: com pendência, o aviso pede para entrar e enviar o que ficou; o botão continua "Entrar"', () => {
    gravarSaida(localStorage, { ate: Date.now(), pendente: true })
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Entre de novo' })).toBeInTheDocument()
    expect(screen.getByText('Sua sessão terminou. Entre para enviar o que ficou neste navegador.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('CB-516: o último uso noutro dia diz o dia', () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    ontem.setHours(15, 42, 0, 0)
    gravarSaida(localStorage, { ate: ontem.getTime(), pendente: false })
    montar()
    expect(screen.getByText('Sua sessão terminou. Tudo até ontem às 15:42 está salvo.')).toBeInTheDocument()
  })

  it('D-526: sem explicar o motivo, sem "segurança" e sem nota sobre as 12 horas ou o e-mail lembrado', () => {
    gravarSaida(localStorage, { ate: Date.now(), pendente: false })
    montar()
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/segurança|12 horas|30 minutos|lembrad/i)
    expect(screen.queryByText('Continue de onde parou.')).not.toBeInTheDocument()
  })

  it('DP-SA-22: tela pedida por uma tela de trabalho, com o motivo, também mostra "Entre de novo"', () => {
    gravarSaida(localStorage, { ate: Date.now(), pendente: true })
    const props = { conta: contaFalsa(), aoEntrou: vi.fn(), aoCriarConta: vi.fn(), aoEsqueci: vi.fn(), aoConfirmarEmail: vi.fn(), aoIrParaInicio: vi.fn(), aoAbrirSistema: vi.fn() }
    render(<TelaEntrar {...props} pedidoPorTela />)
    expect(screen.getByRole('heading', { level: 1, name: 'Entre de novo' })).toBeInTheDocument()
  })

  it('sem motivo guardado, a tela é a de sempre', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Continue de onde parou.')).toBeInTheDocument()
  })
})

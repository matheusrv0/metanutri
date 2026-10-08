import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Resultado, ValorConta } from '../../estado/usarConta.ts'
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
    await usuario.click(screen.getByRole('button', { name: 'Criar grátis' }))
    expect(aoEsqueci).toHaveBeenCalledOnce()
    expect(aoCriarConta).toHaveBeenCalledOnce()
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
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
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para confirmar que é você. Tente de novo.')
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

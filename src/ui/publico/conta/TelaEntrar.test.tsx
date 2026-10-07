import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaEntrar } from './TelaEntrar.tsx'

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

  it('CA-155: sem internet, avisa que o primeiro acesso precisa de internet', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    montar()
    expect(screen.getByRole('alert')).toHaveTextContent('O primeiro acesso em cada aparelho precisa de internet.')
  })
})

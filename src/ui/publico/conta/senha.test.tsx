import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaConfirmarEmail } from './TelaConfirmarEmail.tsx'
import { TelaEsqueciSenha } from './TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './TelaNovaSenha.tsx'

describe('TelaConfirmarEmail', () => {
  afterEach(() => vi.useRealTimers())

  it('CA-140 e CA-141: mostra o e-mail e segura o reenvio por 60 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const conta = contaFalsa()
    render(<TelaConfirmarEmail conta={conta} email="maria@exemplo.com" vencido={false} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: 'Reenviar o link' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeDisabled()

    for (let i = 0; i < 60; i++) act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Reenviar o link' })).toBeEnabled()
  })

  it('CA-143: link vencido pede outro', () => {
    render(<TelaConfirmarEmail conta={contaFalsa()} email={null} vencido aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mandar outro link' })).toBeInTheDocument()
  })
})

describe('TelaEsqueciSenha', () => {
  it('CA-144: responde igual, exista a conta ou não', async () => {
    const conta = contaFalsa()
    render(<TelaEsqueciSenha conta={conta} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o link' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('status')).toHaveTextContent('Se existir conta com esse e-mail, o link chega em alguns minutos.')
  })

  it('e-mail inválido não vai ao servidor', async () => {
    const conta = contaFalsa()
    render(<TelaEsqueciSenha conta={conta} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o link' }))
    expect(conta.pedirTrocaDeSenha).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('TelaNovaSenha', () => {
  it('CA-147: sem o link de troca, pede outro', async () => {
    const aoPedirOutro = vi.fn()
    render(<TelaNovaSenha conta={contaFalsa()} vencido={false} aoSenhaTrocada={vi.fn()} aoPedirOutro={aoPedirOutro} aoIrParaInicio={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pedir outro link' }))
    expect(aoPedirOutro).toHaveBeenCalledOnce()
  })

  it('CA-145 e CA-146: com o link, troca a senha e segue', async () => {
    const conta = contaFalsa({ emRecuperacao: true })
    const aoSenhaTrocada = vi.fn()
    render(<TelaNovaSenha conta={conta} vencido={false} aoSenhaTrocada={aoSenhaTrocada} aoPedirOutro={vi.fn()} aoIrParaInicio={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.type(screen.getByLabelText('Repita a senha'), 'outrasenha')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.')
    expect(conta.trocarSenha).not.toHaveBeenCalled()

    await usuario.clear(screen.getByLabelText('Repita a senha'))
    await usuario.type(screen.getByLabelText('Repita a senha'), 'novasenha1')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(conta.trocarSenha).toHaveBeenCalledWith('novasenha1')
    expect(aoSenhaTrocada).toHaveBeenCalledOnce()
  })
})

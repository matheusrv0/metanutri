import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EtapaDoSegundoFator, ValorSegundoFator } from '../estado/usarSegundoFator.ts'
import { TelaSegundoFator } from './TelaSegundoFator.tsx'

const CADASTRAR: EtapaDoSegundoFator = { tipo: 'cadastrar', fatorId: 'f1', qr: 'data:image/svg+xml;utf-8,<svg></svg>', chave: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' }
const CONFIRMAR: EtapaDoSegundoFator = { tipo: 'confirmar', fatorId: 'f1' }

function segundoFatorFalso(etapa: EtapaDoSegundoFator, confirmar: ValorSegundoFator['confirmar'] = vi.fn(async () => null)): ValorSegundoFator {
  return { etapa, confirmar, tentarDeNovo: vi.fn() }
}

const campo = () => screen.getByLabelText('Código de 6 dígitos')

describe('TelaSegundoFator (spec seguranca-lote-5, D-261)', () => {
  it('CA-835: sem app, mostra o cadastro: os passos, o código QR, a chave em grupos de 4, o campo e "Ativar"', () => {
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CADASTRAR)} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Ative a verificação em duas etapas' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Código QR para o app autenticador' })).toHaveAttribute('src', CADASTRAR.qr)
    // CB-268: a chave em grupos de 4, para caber em 360 px e ser digitada sem erro.
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(campo()).toHaveAttribute('inputmode', 'numeric')
    expect(campo()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('CA-836: com app, pede só o código, com "Confirmar"', () => {
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CONFIRMAR)} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Digite o código do app autenticador' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('CA-838: letra não entra; menos de 6 dígitos avisa sem chamar o servidor', async () => {
    const confirmar = vi.fn(async () => null)
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CONFIRMAR, confirmar)} />)
    const usuario = userEvent.setup()
    await usuario.type(campo(), '12a34b5')
    expect(campo()).toHaveValue('12345')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite os 6 dígitos do código.')
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('CA-835: o código certo vai para a confirmação', async () => {
    const confirmar = vi.fn(async () => null)
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CADASTRAR, confirmar)} />)
    const usuario = userEvent.setup()
    await usuario.type(campo(), '123456')
    await usuario.click(screen.getByRole('button', { name: 'Ativar' }))
    expect(confirmar).toHaveBeenCalledWith('123456')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CA-837 e CB-263: o código errado (ou a rede) avisa, marca o campo e mantém o código', async () => {
    const confirmar = vi.fn(async () => 'Código errado. Confira o app e tente de novo.')
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CONFIRMAR, confirmar)} />)
    const usuario = userEvent.setup()
    await usuario.type(campo(), '654321')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Código errado. Confira o app e tente de novo.')
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(campo()).toHaveValue('654321')
  })

  it('CB-267: clique duplo manda um pedido só', async () => {
    let soltar: (valor: string | null) => void = () => undefined
    const confirmar = vi.fn(() => new Promise<string | null>((resolver) => (soltar = resolver)))
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CONFIRMAR, confirmar)} />)
    const usuario = userEvent.setup()
    await usuario.type(campo(), '123456')
    await usuario.dblClick(screen.getByRole('button', { name: 'Confirmar' }))
    soltar(null)
    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1))
  })

  it('a chave pode ser copiada com um toque', async () => {
    const usuario = userEvent.setup()
    render(<TelaSegundoFator segundoFator={segundoFatorFalso(CADASTRAR)} />)
    await usuario.click(screen.getByRole('button', { name: 'Copiar a chave' }))
    expect(await navigator.clipboard.readText()).toBe(CADASTRAR.chave)
    expect(screen.getByRole('button', { name: 'Chave copiada' })).toBeInTheDocument()
  })

  it('carregando: diz que está preparando, sem campo', () => {
    render(<TelaSegundoFator segundoFator={segundoFatorFalso({ tipo: 'carregando' })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Preparando a verificação…')
    expect(screen.queryByLabelText('Código de 6 dígitos')).not.toBeInTheDocument()
  })

  it('a preparação que falhou mostra o motivo e "Tentar de novo"', async () => {
    const segundoFator = segundoFatorFalso({ tipo: 'falhou', mensagem: 'Não deu para falar com o servidor. Confira a internet e tente de novo.' })
    render(<TelaSegundoFator segundoFator={segundoFator} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para falar com o servidor.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(segundoFator.tentarDeNovo).toHaveBeenCalledOnce()
  })
})

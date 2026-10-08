import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelaCompletarCadastro } from './TelaCompletarCadastro.tsx'

describe('TelaCompletarCadastro (CB-68)', () => {
  it('pede a situação e grava pelo servidor', async () => {
    const informarSituacao = vi.fn(async () => null)
    render(<TelaCompletarCadastro email="ana@gmail.com" informarSituacao={informarSituacao} aoSair={vi.fn()} />)
    const usuario = userEvent.setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-2')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '15540')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(informarSituacao).toHaveBeenCalledWith('nutricionista', { regiao: 2, numero: '15540' })
  })

  it('mostra o erro que o servidor devolve', async () => {
    const informarSituacao = vi.fn(async () => 'Sua situação já está registrada.')
    render(<TelaCompletarCadastro email="julia@ufrn.edu.br" informarSituacao={informarSituacao} aoSair={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sua situação já está registrada.')
  })

  it('CA-423: "Sair" também pergunta se o computador é compartilhado', async () => {
    const aoSair = vi.fn()
    render(<TelaCompletarCadastro email="ana@gmail.com" informarSituacao={vi.fn(async () => null)} aoSair={aoSair} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    expect(aoSair).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' }))
    await usuario.click(screen.getByRole('button', { name: 'Apagar e sair' }))
    expect(aoSair).toHaveBeenCalledExactlyOnceWith(true)
  })
})

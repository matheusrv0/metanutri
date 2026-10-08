import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DialogoSair } from './DialogoSair.tsx'

function montar(saindo = false) {
  const aoFicar = vi.fn()
  const aoSairMesmoAssim = vi.fn()
  render(<DialogoSair aberto saindo={saindo} aoFicar={aoFicar} aoSairMesmoAssim={aoSairMesmoAssim} />)
  return { aoFicar, aoSairMesmoAssim, usuario: userEvent.setup() }
}

describe('DialogoSair (spec dados-na-nuvem, D-131)', () => {
  it('CA-479: avisa que as mudanças que não foram para a nuvem se perdem, com "Ficar" e "Sair mesmo assim"', () => {
    montar()
    const janela = screen.getByRole('dialog')
    expect(janela).toHaveTextContent('Há mudanças que ainda não foram salvas na nuvem. Se sair agora, elas se perdem.')
    expect(screen.getByRole('button', { name: 'Ficar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair mesmo assim' })).toBeInTheDocument()
    expect(janela).not.toHaveTextContent(/apagar|Só sair/i)
  })

  it('CA-479: o foco começa em "Ficar", a escolha que não perde nada', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Ficar' })).toHaveFocus()
  })

  it('CA-479: "Ficar" fecha sem sair; "Sair mesmo assim" sai', async () => {
    const { aoFicar, aoSairMesmoAssim, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Ficar' }))
    expect(aoFicar).toHaveBeenCalledOnce()
    expect(aoSairMesmoAssim).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Sair mesmo assim' }))
    expect(aoSairMesmoAssim).toHaveBeenCalledOnce()
  })

  it('enquanto sai, os botões não aceitam outro clique', () => {
    montar(true)
    expect(screen.getByRole('button', { name: 'Ficar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Sair mesmo assim/ })).toBeDisabled()
  })

  it('DP-22: o segundo clique de um duplo clique em "Sair mesmo assim" não conta de novo', () => {
    const { aoSairMesmoAssim } = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Sair mesmo assim' }), { detail: 2 })
    expect(aoSairMesmoAssim).not.toHaveBeenCalled()
  })
})

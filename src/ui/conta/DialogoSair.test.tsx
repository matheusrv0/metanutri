import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DialogoSair } from './DialogoSair.tsx'

function montar(saindo = false) {
  const aoSair = vi.fn()
  const aoFechar = vi.fn()
  render(<DialogoSair aberto saindo={saindo} aoFechar={aoFechar} aoSair={aoSair} />)
  return { aoSair, aoFechar, usuario: userEvent.setup() }
}

describe('DialogoSair (D-96)', () => {
  it('CA-423: pergunta se o computador é compartilhado, com "Só sair" e "Sair e apagar os meus dados deste aparelho"', () => {
    montar()
    const janela = screen.getByRole('dialog', { name: 'Sair da conta' })
    expect(janela).toHaveTextContent('Outras pessoas usam este computador? Apague os seus pacientes e planos guardados neste navegador.')
    expect(screen.getByRole('button', { name: 'Só sair' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })

  it('CA-423: o foco começa em "Só sair", a opção que não perde nada', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Só sair' })).toHaveFocus()
  })

  it('CA-423: "Só sair" sai sem apagar', async () => {
    const { aoSair, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Só sair' }))
    expect(aoSair).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('CA-424: escolher apagar avisa que o que não foi para a nuvem se perde e pede confirmação', async () => {
    const { aoSair, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' }))
    expect(aoSair).not.toHaveBeenCalled()

    const janela = screen.getByRole('dialog', { name: 'Apagar os seus dados deste aparelho?' })
    expect(janela).toHaveTextContent('O que você não enviou para a nuvem em Configurações se perde.')
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus()

    await usuario.click(screen.getByRole('button', { name: 'Apagar e sair' }))
    expect(aoSair).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('CA-424: o segundo clique de um duplo clique em "Sair e apagar" não confirma', async () => {
    const { aoSair, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' }))
    // No navegador, o segundo clique cai no botão que acabou de aparecer no mesmo lugar, com detail 2.
    fireEvent.click(screen.getByRole('button', { name: 'Apagar e sair' }), { detail: 2 })
    expect(aoSair).not.toHaveBeenCalled()
  })

  it('CA-424: "Voltar" volta à pergunta sem apagar nada', async () => {
    const { aoSair, usuario } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' }))
    await usuario.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('dialog', { name: 'Sair da conta' })).toBeInTheDocument()
    expect(aoSair).not.toHaveBeenCalled()
  })

  it('enquanto sai, os botões não aceitam outro clique', () => {
    montar(true)
    expect(screen.getByRole('button', { name: /Só sair/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sair e apagar os meus dados deste aparelho' })).toBeDisabled()
  })
})

// "Esquecer neste aparelho" (spec lado-do-paciente, D-1218 e CA-2228): a folha de confirmação.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FolhaEsquecer } from './FolhaEsquecer.tsx'

describe('CA-2228: a confirmação', () => {
  it('CA-2228: "Esquecer o plano neste aparelho?", com a frase do link que continua, "Esquecer" e "Cancelar"', async () => {
    const aoEsquecer = vi.fn()
    const aoFechar = vi.fn()
    render(<FolhaEsquecer aberta aoFechar={aoFechar} aoEsquecer={aoEsquecer} cor={null} />)
    const folha = screen.getByRole('dialog', { name: 'Esquecer o plano neste aparelho?' })
    expect(folha).toHaveTextContent('O link continua valendo. Para abrir de novo, use o link ou o e-mail.')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(aoFechar).toHaveBeenCalled()
    expect(aoEsquecer).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Esquecer' }))
    expect(aoEsquecer).toHaveBeenCalled()
  })

  it('D-956: a folha sai da tela do link e leva a cor da nutricionista junto', () => {
    render(<FolhaEsquecer aberta aoFechar={() => undefined} aoEsquecer={() => undefined} cor="#3f5f2a" />)
    const folha = screen.getByRole('dialog')
    expect(folha).toHaveClass('marca-da-nutricionista')
    expect(folha.style.getPropertyValue('--marca-claro')).toBe('#3f5f2a')
    expect(screen.getByRole('button', { name: 'Esquecer' }).className).toContain('bg-linkacao')
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErroDaIa } from './ErroDaIa.tsx'

describe('ErroDaIa (spec assistente-ia, CA-2374)', () => {
  it('a frase só; no limite do mês, "Ver planos"', async () => {
    const aoVerPlanos = vi.fn()
    const { rerender } = render(<ErroDaIa erro={{ frase: 'As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro.', acao: 'ver-planos' }} aoVerPlanos={aoVerPlanos} />)
    expect(screen.getByRole('status')).toHaveTextContent('As 20 sugestões de novembro foram usadas.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver planos' }))
    expect(aoVerPlanos).toHaveBeenCalled()
    rerender(<ErroDaIa erro={{ frase: 'Muitas sugestões seguidas.', acao: 'fechar' }} aoVerPlanos={aoVerPlanos} />)
    expect(screen.queryByRole('button', { name: 'Ver planos' })).not.toBeInTheDocument()
  })
})

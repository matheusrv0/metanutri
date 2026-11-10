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

  it('CA-2410 (D-1364): a região viva já existe, vazia, e recebe a frase quando o erro chega', () => {
    const { rerender } = render(<ErroDaIa erro={null} aoVerPlanos={vi.fn()} />)
    const regiao = screen.getByRole('status')
    expect(regiao).toHaveTextContent(/^$/)
    rerender(<ErroDaIa erro={{ frase: 'As sugestões com IA estão indisponíveis agora. Tente mais tarde.', acao: 'fechar' }} aoVerPlanos={vi.fn()} />)
    expect(screen.getByRole('status')).toBe(regiao)
    expect(regiao).toHaveTextContent('As sugestões com IA estão indisponíveis agora. Tente mais tarde.')
  })
})

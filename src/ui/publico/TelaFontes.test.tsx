import { render, screen } from '@testing-library/react'
import { TelaFontes } from './TelaFontes.tsx'

describe('Fontes da base (CA-322)', () => {
  it('diz o que é a base e cita as três fontes com link', () => {
    render(<TelaFontes />)
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeInTheDocument()
    expect(screen.getByText(/A Base MetaNutri reúne 597 alimentos/)).toBeInTheDocument()
    expect(screen.getByText(/medidas caseiras de 287 deles/)).toBeInTheDocument()
    for (const assunto of ['Composição dos alimentos', 'Medidas caseiras', 'Produtos de rótulo']) {
      expect(screen.getByRole('heading', { name: assunto })).toBeInTheDocument()
    }
    expect(screen.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    for (const link of links) expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })
})

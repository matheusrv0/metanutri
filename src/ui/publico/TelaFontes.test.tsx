import { render, screen } from '@testing-library/react'
import { TelaFontes } from './TelaFontes.tsx'

describe('Fontes da base (CA-322)', () => {
  it('diz o que é a base e cita as quatro fontes com link', () => {
    render(<TelaFontes />)
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeInTheDocument()
    expect(screen.getByText(/A Base MetaNutri reúne 597 alimentos/)).toBeInTheDocument()
    expect(screen.getByText(/medidas caseiras do IBGE para 287 deles/)).toBeInTheDocument()
    // CA-964 (spec vitaminas-usda): a frase de abertura conta o complemento do USDA.
    expect(screen.getByText(/Para 308 alimentos, inclui também vitamina D, vitamina E, folato, vitamina B12 e selênio do USDA\./)).toBeInTheDocument()
    // CA-1184 (spec textos-e-promessas): a base não é a única fonte; o resto, a nutricionista cadastra.
    expect(screen.getByText(/Outros alimentos você cadastra em Meus alimentos\./)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Meus produtos|organiza e confere/)
    for (const assunto of ['Composição dos alimentos', 'Vitaminas D, B12, folato, E e selênio', 'Medidas caseiras', 'Produtos de rótulo']) {
      expect(screen.getByRole('heading', { name: assunto })).toBeInTheDocument()
    }
    expect(screen.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Abrir o FoodData Central' })).toHaveAttribute('href', 'https://fdc.nal.usda.gov/')
    expect(screen.getByText(/CC0 1\.0 Universal/)).toBeInTheDocument()
    for (const link of links) expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })

  it('CA-995 (spec site-publico-profissional): as referências dos cálculos, que saíram do rodapé, sem link novo', () => {
    render(<TelaFontes />)
    const secao = screen.getByRole('heading', { level: 2, name: 'Referências dos cálculos' }).nextElementSibling
    for (const trecho of ['NASEM', '2019', '2023', 'OMS', '2006 e 2007', 'SISVAN', '2011', 'Kac', '2021']) expect(secao).toHaveTextContent(trecho)
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })
})

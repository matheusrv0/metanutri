import { render, screen } from '@testing-library/react'
import fonteDoCatalogo from '@/data/catalogo-off-fonte.json'
import { ENDERECO_DO_APP } from '../enderecos.ts'
import { TelaFontes } from './TelaFontes.tsx'

describe('Fontes da base (CA-322)', () => {
  it('diz o que é a base e cita as cinco fontes com link', () => {
    render(<TelaFontes />)
    expect(screen.getByRole('heading', { level: 1, name: 'Referências' })).toBeInTheDocument()
    // CA-1721 (spec base-ampliada): a frase conta a TACO e a base ampliada.
    expect(screen.getByText(/A Base MetaNutri reúne 1\.235 alimentos: os 597 da tabela brasileira/)).toBeInTheDocument()
    expect(screen.getByText(/e 638 alimentos que ela não tem, do USDA\./)).toBeInTheDocument()
    // 283 depois da camada de plausibilidade das medidas (spec alimentos-e-gramaturas, D-430, D-483 e D-483a); a redação é a da spec
    // textos-e-promessas.
    expect(screen.getByText(/medidas caseiras do IBGE para 283 deles/)).toBeInTheDocument()
    // CA-964 (spec vitaminas-usda): a frase de abertura conta o complemento do USDA.
    expect(screen.getByText(/Para 308 alimentos da tabela brasileira, inclui também vitamina D, vitamina E, folato, vitamina B12 e selênio do USDA\./)).toBeInTheDocument()
    // CA-1184 (spec textos-e-promessas): a base não é a única fonte; o resto, a nutricionista cadastra.
    expect(screen.getByText(/Outros alimentos você cadastra em Meus alimentos\./)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Meus produtos|organiza e confere/)
    for (const assunto of ['Composição dos alimentos', 'Vitaminas D, B12, folato, E e selênio', 'Alimentos que a TACO não tem', 'Medidas caseiras', 'Produtos de marca']) {
      expect(screen.getByRole('heading', { name: assunto })).toBeInTheDocument()
    }
    expect(screen.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(6)
    for (const link of screen.getAllByRole('link', { name: 'Abrir o FoodData Central' })) expect(link).toHaveAttribute('href', 'https://fdc.nal.usda.gov/')
    expect(screen.getAllByText(/CC0 1\.0 Universal/)).toHaveLength(2)
    expect(screen.getByText(/Foundation Foods \(versão de outubro de 2026\), baixados em 29\/10\/2026/)).toBeInTheDocument()
    for (const link of links) expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })

  it('CA-995 (spec site-publico-profissional): as referências dos cálculos, que saíram do rodapé, sem link novo', () => {
    render(<TelaFontes />)
    const secao = screen.getByRole('heading', { level: 2, name: 'Referências dos cálculos' }).nextElementSibling
    for (const trecho of ['NASEM', '2019', '2023', 'OMS', '2006 e 2007', 'SISVAN', '2011', 'Kac', '2021']) expect(secao).toHaveTextContent(trecho)
    expect(screen.getAllByRole('link')).toHaveLength(6)
  })

  it('CA-1761 (spec base-ampliada, fase 2): "Produtos de marca" cita o Open Food Facts, a versão, a contagem, a ODbL e os arquivos', () => {
    render(<TelaFontes />)
    const secao = screen.getByRole('heading', { name: 'Produtos de marca' }).parentElement
    expect(secao).toHaveTextContent(`${fonteDoCatalogo.produtos.toLocaleString('pt-BR')} produtos do Brasil`)
    expect(secao).toHaveTextContent(fonteDoCatalogo.versao.split('-').reverse().join('/'))
    expect(secao).toHaveTextContent('Open Database License (ODbL)')
    expect(secao).toHaveTextContent('Database Contents License (DbCL)')
    expect(screen.getByRole('link', { name: 'Abrir os arquivos e a licença' })).toHaveAttribute('href', new URL(`${fonteDoCatalogo.caminho}LICENCA.txt`, ENDERECO_DO_APP).href)
  })
})

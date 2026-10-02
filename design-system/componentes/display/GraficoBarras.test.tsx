import { render, screen, within } from '@testing-library/react'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'

const barras = [
  { chave: '2026-08', rotulo: 'ago', valor: 500, dica: 'ago · R$ 5,00' },
  { chave: '2026-09', rotulo: 'set', valor: 750, dica: 'set · R$ 7,50' },
  { chave: '2026-10', rotulo: 'out', valor: 1500, dica: 'out · R$ 15,00', destaque: true, valorEscrito: 'R$ 15,00' },
]
const marcas = [
  { valor: 0, rotulo: '0' },
  { valor: 500, rotulo: '5' },
  { valor: 1000, rotulo: '10' },
  { valor: 1500, rotulo: '15' },
]

describe('GraficoBarras', () => {
  it('cada barra é um item com a dica como nome, e dá para chegar pelo teclado', () => {
    render(<GraficoBarras descricao="Receita por mês" barras={barras} marcas={marcas} />)
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => i.getAttribute('aria-label'))).toEqual(['ago · R$ 5,00', 'set · R$ 7,50', 'out · R$ 15,00'])
    expect(itens.every((i) => i.tabIndex === 0)).toBe(true)
  })

  it('a altura da barra é a parte do topo do eixo', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    const itens = screen.getAllByRole('listitem')
    expect((itens[1]?.firstElementChild as HTMLElement).style.height).toBe('50%')
    expect((itens[2]?.firstElementChild as HTMLElement).style.height).toBe('100%')
  })

  it('só a barra em destaque tem o valor escrito; a dica de todas fica escondida do leitor de tela', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    const itens = screen.getAllByRole('listitem')
    expect(within(itens[2] as HTMLElement).getAllByText('R$ 15,00')).toHaveLength(1)
    expect(within(itens[2] as HTMLElement).getByText('out · R$ 15,00')).toHaveAttribute('aria-hidden', 'true')
    expect(within(itens[0] as HTMLElement).queryByText('R$ 5,00')).toBeNull()
  })

  it('mostra as marcas do eixo e o rótulo de cada mês', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    for (const texto of ['0', '5', '10', '15', 'ago', 'set', 'out']) expect(screen.getByText(texto)).toBeInTheDocument()
  })
})

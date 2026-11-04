// O gráfico de linha da biblioteca (spec antropometria-telas, D-1426, D-1487 e CA-2456; DP-AT-9).
import { fireEvent, render, screen, within } from '@testing-library/react'
import { GraficoLinha, escalaDoEixo, type PontoDaLinha } from '@ds/componentes/display/GraficoLinha.tsx'

const kg = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`

const ponto = (chave: string, x: number, valor: number | null, detalhe = ''): PontoDaLinha => ({
  chave,
  x,
  valor,
  rotulo: chave,
  dica: { titulo: `${chave}/2026`, valor: valor === null ? '' : kg(valor), detalhe },
})

// As quatro avaliações do protótipo: dias desde a primeira.
const PESO = [
  ponto('12/05', 0, 75.8, 'Primeira avaliação'),
  ponto('07/07', 56, 74.1, '−1,7 kg desde 12/05'),
  ponto('08/09', 119, 72.6, '−1,5 kg desde 07/07'),
  ponto('03/11', 175, 71.5, '−1,1 kg desde 08/09'),
]

const marca = (v: number) => String(v)

function desenhar(pontos: readonly PontoDaLinha[] = PESO) {
  render(<GraficoLinha descricao="Peso, kg" pontos={pontos} formatarMarca={marca} rotuloDoUltimo="71,5 kg" />)
  return screen.getByRole('group', { name: 'Peso, kg' })
}

describe('escalaDoEixo (D-1487)', () => {
  it('marcas redondas com folga: o peso do protótipo vai de 70 a 78, de 2 em 2', () => {
    expect(escalaDoEixo([75.8, 74.1, 72.6, 71.5])).toEqual({ min: 70, max: 78, marcas: [70, 72, 74, 76, 78] })
  })

  it('um valor só ganha folga em volta, sem dividir por zero', () => {
    const escala = escalaDoEixo([30])
    expect(escala.min).toBeLessThan(30)
    expect(escala.max).toBeGreaterThan(30)
    expect(escala.marcas.every(Number.isFinite)).toBe(true)
  })

  it('CB-1441: valores extremos cabem, com no máximo 7 marcas e sem erro de ponto flutuante', () => {
    const escala = escalaDoEixo([350, 45])
    expect(escala.min).toBeLessThanOrEqual(45)
    expect(escala.min).toBeGreaterThanOrEqual(0)
    expect(escala.max).toBeGreaterThanOrEqual(350)
    expect(escala.marcas.length).toBeLessThanOrEqual(7)
    const pequena = escalaDoEixo([0.31, 0.33])
    expect(pequena.marcas.every((m) => String(m).length <= 5)).toBe(true)
  })
})

describe('GraficoLinha (DP-AT-9)', () => {
  it('um ponto por valor, as datas embaixo e o último valor escrito', () => {
    const grafico = desenhar()
    expect(grafico.querySelectorAll('[data-ponto]')).toHaveLength(4)
    for (const data of ['12/05', '07/07', '08/09', '03/11']) expect(within(grafico).getByText(data)).toBeInTheDocument()
    expect(within(grafico).getByText('71,5 kg')).toBeInTheDocument()
  })

  it('as marcas do eixo y vêm da escala', () => {
    const grafico = desenhar()
    for (const m of ['70', '72', '74', '76', '78']) expect(within(grafico).getByText(m)).toBeInTheDocument()
  })

  it('x proporcional aos dias: o ponto de 119 dias fica a 68% da largura', () => {
    const grafico = desenhar()
    const pontos = [...grafico.querySelectorAll<HTMLElement>('[data-ponto]')]
    expect(pontos.map((p) => p.style.left)).toEqual(['0%', '32%', '68%', '100%'])
  })

  it('CA-2453: valor vazio não vira ponto, e a linha liga os que têm', () => {
    const grafico = desenhar([PESO[0] as PontoDaLinha, ponto('07/07', 56, null), PESO[2] as PontoDaLinha, PESO[3] as PontoDaLinha])
    expect(grafico.querySelectorAll('[data-ponto]')).toHaveLength(3)
    expect(grafico.querySelector('polyline')?.getAttribute('points')?.split(' ')).toHaveLength(3)
    expect(within(grafico).queryByText('07/07')).not.toBeInTheDocument()
    expect(within(grafico).getAllByRole('button')).toHaveLength(3)
  })

  it('CA-2456: cada data é um botão com a dica inteira no nome; foco e cursor mostram a dica', () => {
    const grafico = desenhar()
    const botoes = within(grafico).getAllByRole('button')
    expect(botoes.map((b) => b.getAttribute('aria-label'))).toEqual([
      '12/05/2026 · 75,8 kg · Primeira avaliação',
      '07/07/2026 · 74,1 kg · −1,7 kg desde 12/05',
      '08/09/2026 · 72,6 kg · −1,5 kg desde 07/07',
      '03/11/2026 · 71,5 kg · −1,1 kg desde 08/09',
    ])
    expect(within(grafico).queryByText('−1,5 kg desde 07/07')).not.toBeInTheDocument()
    fireEvent.focus(botoes[2] as HTMLElement)
    const dica = within(grafico).getByText('−1,5 kg desde 07/07').parentElement as HTMLElement
    expect(dica).toHaveAttribute('aria-hidden', 'true')
    expect(within(dica).getByText('08/09/2026')).toBeInTheDocument()
    expect(within(dica).getByText('72,6 kg')).toBeInTheDocument()
    fireEvent.blur(botoes[2] as HTMLElement)
    expect(within(grafico).queryByText('−1,5 kg desde 07/07')).not.toBeInTheDocument()
    fireEvent.mouseEnter(botoes[0] as HTMLElement)
    expect(within(grafico).getByText('Primeira avaliação')).toBeInTheDocument()
    fireEvent.mouseLeave(botoes[0] as HTMLElement)
    expect(within(grafico).queryByText('Primeira avaliação')).not.toBeInTheDocument()
  })

  it('a dica do último ponto abre para a esquerda, para não sair do cartão', () => {
    const grafico = desenhar()
    fireEvent.focus(within(grafico).getAllByRole('button')[3] as HTMLElement)
    expect(within(grafico).getByText('−1,1 kg desde 08/09').parentElement).toHaveAttribute('data-lado', 'esquerda')
  })

  it('um ponto só é desenhado sozinho, sem linha', () => {
    const grafico = desenhar([ponto('03/11', 0, 71.5, 'Primeira avaliação')])
    expect(grafico.querySelectorAll('[data-ponto]')).toHaveLength(1)
    expect(grafico.querySelector('polyline')).toBeNull()
  })

  it('no celular, só a primeira e a última data ficam embaixo do eixo', () => {
    const grafico = desenhar()
    const meio = within(grafico).getByText('07/07')
    expect(meio.className).toMatch(/\bhidden\b/)
    expect(meio.className).toMatch(/\bsm:block\b/)
    expect(within(grafico).getByText('12/05').className).not.toMatch(/\bhidden\b/)
    expect(within(grafico).getByText('03/11').className).not.toMatch(/\bhidden\b/)
  })
})

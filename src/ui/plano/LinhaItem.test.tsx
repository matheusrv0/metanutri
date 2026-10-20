import { render, screen } from '@testing-library/react'
import { LinhaItem } from './LinhaItem.tsx'

const MARGARINA = 263
const MANTEIGA = 261

const linha = (alimentoId: number, gramas: number) =>
  render(
    <ul>
      <LinhaItem item={{ id: 'i1', alimentoId, gramas }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
    </ul>,
  )

describe('Linha do alimento no planejador (spec revisao-geral-trabalho, D-242)', () => {
  it('CA-779: 5 g de margarina mostram "1 ponta de faca", como a folha', () => {
    linha(MARGARINA, 5)
    expect(screen.getByText('1 ponta de faca')).toBeInTheDocument()
  })

  it('CA-780: 30 g de manteiga mostram "1 colher de sopa", nunca "1 fatia"', () => {
    linha(MANTEIGA, 30)
    expect(screen.getByText('1 colher de sopa')).toBeInTheDocument()
    expect(screen.queryByText(/fatia/)).not.toBeInTheDocument()
  })
})

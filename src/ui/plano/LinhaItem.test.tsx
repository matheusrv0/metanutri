import { render, screen } from '@testing-library/react'
import { itemDeReceita, PANQUECA } from '@/domain/receitas.test-utils.ts'
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

  it('CA-789: produto apagado vira "Produto apagado", com os gramas, "— kcal" e sem substituto', () => {
    render(
      <ul>
        <LinhaItem item={{ id: 'i1', alimentoId: 900_001, gramas: 40 }} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} aoSubstituir={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText('Produto apagado')).toBeInTheDocument()
    expect(screen.getByLabelText('Gramas de Produto apagado')).toHaveValue('40')
    expect(screen.getByText('— kcal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Substituir/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover Produto apagado' })).toBeInTheDocument()
    // Revisão de 20/10/2026: a nutricionista sabe que o paciente não vê esse item.
    expect(screen.getByText('Não sai na folha nem no link do paciente.')).toBeInTheDocument()
  })

  it('CA-984 (integracao-rodada-1910): a receita com um ingrediente apagado mostra as kcal com a †; inteira, sem †', () => {
    const comApagado = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 900_001, gramas: 20 }] }
    const { unmount } = render(
      <ul>
        <LinhaItem item={itemDeReceita('r1', 120, comApagado)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText(/kcal/).textContent).toMatch(/^\d+ kcal†$/)
    unmount()
    render(
      <ul>
        <LinhaItem item={itemDeReceita('r2', 120)} aoMudarGramas={vi.fn()} aoRemover={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText(/kcal/).textContent).toMatch(/^\d+ kcal$/)
  })

  it('CA-780: 30 g de manteiga mostram "1 colher de sopa", nunca "1 fatia"', () => {
    linha(MANTEIGA, 30)
    expect(screen.getByText('1 colher de sopa')).toBeInTheDocument()
    expect(screen.queryByText(/fatia/)).not.toBeInTheDocument()
  })
})

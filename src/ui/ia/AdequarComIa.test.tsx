import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdequarComIa } from './AdequarComIa.tsx'

const ITENS = [
  { id: 'energia', nome: 'Energia', valor: '122% da meta' },
  { id: 'abaixo:Cálcio', nome: 'Cálcio', valor: '54%' },
]

describe('AdequarComIa (spec assistente-ia, D-1309)', () => {
  it('CA-2370: "O que ajustar", calculado pelo app, com as caixas marcadas de início; desmarcar avisa', async () => {
    const aoAlternar = vi.fn()
    render(<AdequarComIa itens={ITENS} desmarcadas={new Set()} aoAlternar={aoAlternar} outro="" aoMudarOutro={vi.fn()} autorizacao={<p>Autorização do paciente na ficha desde 14/10/2026.</p>} />)
    expect(screen.getByRole('heading', { name: 'O que ajustar' })).toBeInTheDocument()
    expect(screen.getByText('Calculado pelo app')).toBeInTheDocument()
    const energia = screen.getByRole('checkbox', { name: /Energia/ })
    expect(energia).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Cálcio/ })).toBeChecked()
    await userEvent.setup().click(energia)
    expect(aoAlternar).toHaveBeenCalledWith('energia')
    expect(screen.getByText('Autorização do paciente na ficha desde 14/10/2026.')).toBeInTheDocument()
  })

  it('D-1309: "Outro pedido" conta até 300', async () => {
    const aoMudarOutro = vi.fn()
    render(<AdequarComIa itens={ITENS} desmarcadas={new Set(['energia'])} aoAlternar={vi.fn()} outro="jantar leve" aoMudarOutro={aoMudarOutro} autorizacao={null} />)
    expect(screen.getByRole('checkbox', { name: /Energia/ })).not.toBeChecked()
    expect(screen.getByText('Opcional · 11/300')).toBeInTheDocument()
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Outro pedido' }), '!')
    expect(aoMudarOutro).toHaveBeenCalledWith('jantar leve!')
  })
})

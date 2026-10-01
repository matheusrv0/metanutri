import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelaAjuda } from './TelaAjuda.tsx'

describe('Ajuda', () => {
  it('mostra os cinco primeiros passos em ordem', () => {
    render(<TelaAjuda aoIrPara={vi.fn()} />)
    const passos = screen.getAllByRole('listitem')
    expect(screen.getByText('Cadastre o paciente')).toBeInTheDocument()
    expect(screen.getByText('Entregue')).toBeInTheDocument()
    expect(passos.length).toBeGreaterThanOrEqual(5)
  })

  it('lista as fontes com link, e a base de alimentos leva para Fontes da base', async () => {
    const aoIrPara = vi.fn()
    render(<TelaAjuda aoIrPara={aoIrPara} />)
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
    expect(screen.getByText('Base MetaNutri')).toBeInTheDocument()
    expect(screen.getByText(/Open Food Facts/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Abrir/ }).length).toBeGreaterThan(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fontes da base' }))
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
  })

  it('diz o que a base não tem e o limite legal', () => {
    render(<TelaAjuda aoIrPara={vi.fn()} />)
    expect(screen.getByText(/não traz vitamina D, vitamina B12 nem folato/)).toBeInTheDocument()
    expect(screen.getByText(/privativa de nutricionista com registro no CRN/)).toBeInTheDocument()
  })

  it('leva para a tela do passo', async () => {
    const aoIrPara = vi.fn()
    render(<TelaAjuda aoIrPara={aoIrPara} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Ir' })[0] as HTMLElement)
    expect(aoIrPara).toHaveBeenCalledWith('pacientes')
  })
})

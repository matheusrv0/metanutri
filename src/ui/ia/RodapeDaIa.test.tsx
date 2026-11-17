import { render, screen } from '@testing-library/react'
import { RodapeDaIa } from './RodapeDaIa.tsx'

describe('RodapeDaIa (spec assistente-ia, D-1302 e D-1371)', () => {
  it('mostra a ação, o motivo e o contador', () => {
    render(<RodapeDaIa acoes={<button type="button">Sugerir plano</button>} motivo="Registre na ficha a autorização do paciente." contador="7 de 20 sugestões em novembro" />)
    expect(screen.getByText('Registre na ficha a autorização do paciente.')).toBeInTheDocument()
    expect(screen.getByText('7 de 20 sugestões em novembro')).toBeInTheDocument()
  })

  it('CA-2422: com a linha reservada, o lugar do motivo fica mesmo sem motivo, numa linha só dele', () => {
    const { container, rerender } = render(<RodapeDaIa acoes={<button type="button">Sugerir plano</button>} motivo="Registre na ficha a autorização do paciente." contador={null} reservarMotivo />)
    const comMotivo = container.querySelector('[data-motivo]')
    expect(comMotivo).toHaveTextContent('Registre na ficha a autorização do paciente.')
    expect(comMotivo).toHaveClass('min-h-5', 'basis-full')
    rerender(<RodapeDaIa acoes={<button type="button">Sugerir plano</button>} motivo={null} contador={null} reservarMotivo />)
    const semMotivo = container.querySelector('[data-motivo]')
    expect(semMotivo).not.toBeNull()
    expect(semMotivo).toHaveTextContent(/^$/)
    expect(semMotivo).toHaveClass('min-h-5', 'basis-full')
  })

  it('sem a linha reservada, sem motivo não sobra lugar', () => {
    const { container } = render(<RodapeDaIa acoes={<button type="button">Sugerir plano</button>} motivo={null} contador={null} />)
    expect(container.querySelector('[data-motivo]')).toBeNull()
  })
})

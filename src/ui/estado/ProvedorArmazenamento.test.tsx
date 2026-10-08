import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { ProvedorArmazenamento } from './ProvedorArmazenamento.tsx'

let montagens = 0

/** Lê os pacientes uma vez, ao montar, como os provedores de verdade. */
function Leitor() {
  const arm = useArmazenamento()
  const [lido] = useState(() => {
    montagens += 1
    return arm?.getItem('metanutri:pacientes') ?? 'nada'
  })
  return <p>{lido}</p>
}

describe('ProvedorArmazenamento (spec dados-por-conta)', () => {
  beforeEach(() => {
    localStorage.clear()
    montagens = 0
    localStorage.setItem('metanutri:conta:conta-a:pacientes', 'Ana')
    localStorage.setItem('metanutri:conta:conta-b:pacientes', 'Bia')
  })

  it('CB-120: trocar de conta remonta a árvore, e o primeiro quadro já é da conta nova', () => {
    const { rerender } = render(
      <ProvedorArmazenamento usuarioId="conta-a">
        <Leitor />
      </ProvedorArmazenamento>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()

    rerender(
      <ProvedorArmazenamento usuarioId={null}>
        <Leitor />
      </ProvedorArmazenamento>,
    )
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    rerender(
      <ProvedorArmazenamento usuarioId="conta-b">
        <Leitor />
      </ProvedorArmazenamento>,
    )
    expect(screen.getByText('Bia')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(montagens).toBe(3)
  })

  it('fora do provedor, vale o armazenamento do aparelho, como antes', () => {
    localStorage.setItem('metanutri:pacientes', 'do aparelho')
    render(<Leitor />)
    expect(screen.getByText('do aparelho')).toBeInTheDocument()
  })

  it('a mesma conta não remonta a árvore a cada render', () => {
    const { rerender } = render(
      <ProvedorArmazenamento usuarioId="conta-a">
        <Leitor />
      </ProvedorArmazenamento>,
    )
    rerender(
      <ProvedorArmazenamento usuarioId="conta-a">
        <Leitor />
      </ProvedorArmazenamento>,
    )
    expect(montagens).toBe(1)
  })
})

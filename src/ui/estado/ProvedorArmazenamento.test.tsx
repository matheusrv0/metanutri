import { render, screen } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { ProvedorArmazenamento } from './ProvedorArmazenamento.tsx'
import { ProvedoresDeDados } from './ProvedoresDeDados.tsx'

let montagens = 0

/** Lê os pacientes uma vez, ao montar, como os provedores e as telas de verdade. */
function LeAoMontar() {
  const arm = useArmazenamento()
  const [lido] = useState(() => {
    montagens += 1
    return arm?.getItem('metanutri:pacientes') ?? 'nada'
  })
  return <p>{lido}</p>
}

/** Lê a cada render e conta as montagens, como uma tela de conta que não guarda dado. */
function LeSempre() {
  const arm = useArmazenamento()
  useState(() => {
    montagens += 1
    return null
  })
  return <p>{arm?.getItem('metanutri:pacientes') ?? 'nada'}</p>
}

const comDados = (usuarioId: string | null, filho: ReactNode) => (
  <ProvedorArmazenamento usuarioId={usuarioId}>
    <ProvedoresDeDados usuarioId={usuarioId}>{filho}</ProvedoresDeDados>
  </ProvedorArmazenamento>
)

describe('armazenamento e dados por conta na árvore (spec dados-por-conta)', () => {
  beforeEach(() => {
    localStorage.clear()
    montagens = 0
    localStorage.setItem('metanutri:conta:conta-a:pacientes', 'Ana')
    localStorage.setItem('metanutri:conta:conta-b:pacientes', 'Bia')
  })

  it('CB-120: trocar de conta remonta os dados, e o primeiro quadro já é da conta nova', () => {
    const { rerender } = render(comDados('conta-a', <LeAoMontar />))
    expect(screen.getByText('Ana')).toBeInTheDocument()

    rerender(comDados(null, <LeAoMontar />))
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    rerender(comDados('conta-b', <LeAoMontar />))
    expect(screen.getByText('Bia')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(montagens).toBe(3)
  })

  it('a mesma conta não remonta os dados a cada render', () => {
    const { rerender } = render(comDados('conta-a', <LeAoMontar />))
    rerender(comDados('conta-a', <LeAoMontar />))
    expect(montagens).toBe(1)
  })

  it('DP-11: fora dos provedores de dados, a sessão que chega troca o armazenamento sem remontar a tela', () => {
    const { rerender } = render(
      <ProvedorArmazenamento usuarioId={null}>
        <LeSempre />
      </ProvedorArmazenamento>,
    )
    expect(screen.getByText('nada')).toBeInTheDocument()
    rerender(
      <ProvedorArmazenamento usuarioId="conta-a">
        <LeSempre />
      </ProvedorArmazenamento>,
    )
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(montagens).toBe(1)
  })

  it('fora do provedor, vale o armazenamento do aparelho, como antes', () => {
    localStorage.setItem('metanutri:pacientes', 'do aparelho')
    render(<LeAoMontar />)
    expect(screen.getByText('do aparelho')).toBeInTheDocument()
  })
})

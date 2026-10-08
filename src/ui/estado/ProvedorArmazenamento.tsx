import { Fragment, useMemo, type ReactNode } from 'react'
import { armazenamentoLocal } from './armazenamentoLocal.ts'
import { armazenamentoDaSessao, trocarDadosEmMemoria } from './armazenamentoDaSessao.ts'
import { ContextoArmazenamento } from './contextoArmazenamento.ts'

interface ProvedorArmazenamentoProps {
  /** A conta que está dentro; `null` sem sessão ou sem servidor de conta. */
  readonly usuarioId: string | null
  readonly children: ReactNode
}

/**
 * Dá à árvore o armazenamento da conta que entrou (D-120) e a remonta quando a conta muda.
 * Os provedores e as telas leem os dados ao montar: com a remontagem no mesmo render em que a
 * sessão chega, nada da conta anterior aparece, nem por um instante (CB-120).
 */
export function ProvedorArmazenamento({ usuarioId, children }: ProvedorArmazenamentoProps) {
  const armazenamento = useMemo(() => {
    const arm = armazenamentoDaSessao(armazenamentoLocal(), usuarioId)
    trocarDadosEmMemoria(arm)
    return arm
  }, [usuarioId])

  return (
    <ContextoArmazenamento.Provider value={armazenamento}>
      <Fragment key={usuarioId ?? 'aparelho'}>{children}</Fragment>
    </ContextoArmazenamento.Provider>
  )
}

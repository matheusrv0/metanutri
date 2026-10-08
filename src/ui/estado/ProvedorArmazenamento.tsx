import { useMemo, type ReactNode } from 'react'
import { armazenamentoLocal } from './armazenamentoLocal.ts'
import { armazenamentoDaSessao, trocarDadosEmMemoria } from './armazenamentoDaSessao.ts'
import { ContextoArmazenamento } from './contextoArmazenamento.ts'

interface ProvedorArmazenamentoProps {
  /** A conta que está dentro; `null` sem sessão ou sem servidor de conta. */
  readonly usuarioId: string | null
  readonly children: ReactNode
}

/**
 * Dá à árvore o armazenamento da conta que entrou (D-120), já com os dados antigos levados
 * para o dono (D-123), e troca no mesmo render o que fica em memória (DP-7). Não remonta
 * nada: quem lê dados ao montar fica dentro de ProvedoresDeDados, que remonta (CB-120).
 */
export function ProvedorArmazenamento({ usuarioId, children }: ProvedorArmazenamentoProps) {
  const armazenamento = useMemo(() => {
    const arm = armazenamentoDaSessao(armazenamentoLocal(), usuarioId)
    trocarDadosEmMemoria(arm)
    return arm
  }, [usuarioId])

  return <ContextoArmazenamento.Provider value={armazenamento}>{children}</ContextoArmazenamento.Provider>
}

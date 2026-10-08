import { createContext, useContext } from 'react'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'

/** A nuvem da conta que está dentro (spec dados-na-nuvem). */
export interface ValorNuvem {
  readonly estado: EstadoDaNuvem
  /** Manda agora o que falta; verdadeiro quando, no fim, a nuvem tem tudo. */
  readonly salvarAgora: () => Promise<boolean>
  /** CB-123: tira a capa da trava de tamanho para a pessoa reduzir os dados. */
  readonly reduzir: () => void
  /** A conta vai sair: nada mais vai para a nuvem (DP-11). */
  readonly parar: () => void
}

/** `null` sem conta, sem servidor ou sem o cliente do Supabase: tudo como antes (DP-14). */
export const ContextoNuvem = createContext<ValorNuvem | null>(null)

export function useNuvem(): ValorNuvem | null {
  return useContext(ContextoNuvem)
}

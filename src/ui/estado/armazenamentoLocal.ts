import type { ArmazenamentoListavel } from '@/domain/persistencia.ts'

/** `localStorage` quando o navegador permite; `null` em aba anônima bloqueada. */
export function armazenamentoLocal(): ArmazenamentoListavel | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Alimentos que a pessoa nunca quer ver nas sugestões, em qualquer plano da conta (spec dados-por-conta, D-120).
import type { Armazenamento } from '@/domain/persistencia.ts'

const CHAVE = 'metanutri:sugestoes-ocultas'

/** Reserva para quando o navegador não guarda nada: vale só nesta aba. */
const memoria = new Set<number>()

export function lerOcultosGlobais(armazenamento: Armazenamento | null): ReadonlySet<number> {
  if (!armazenamento) return memoria
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '[]')
    return new Set(Array.isArray(bruto) ? bruto.filter((x): x is number => typeof x === 'number') : [])
  } catch {
    return memoria
  }
}

export function ocultarGlobalmente(armazenamento: Armazenamento | null, alimentoId: number): void {
  const lista = [...lerOcultosGlobais(armazenamento), alimentoId]
  memoria.add(alimentoId)
  try {
    armazenamento?.setItem(CHAVE, JSON.stringify([...new Set(lista)]))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export function mostrarNovamente(armazenamento: Armazenamento | null, alimentoId: number): void {
  memoria.delete(alimentoId)
  try {
    armazenamento?.setItem(CHAVE, JSON.stringify([...lerOcultosGlobais(armazenamento)].filter((id) => id !== alimentoId)))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

/** A reserva em memória é da conta que estava dentro: outra conta começa sem ela (DP-7). */
export function esquecerOcultosEmMemoria(): void {
  memoria.clear()
}

// O que o marcar faz além das cores (spec lado-do-paciente, D-1204 e DP-LP-23): o brilho do dia completo, uma vez por dia
// por link, e a vibração de 10 ms no Android. Com "reduzir movimento" ligado no celular, nenhum dos dois.
import type { Armazenamento } from '@/domain/persistencia.ts'

const CHAVE = (token: string): string => `metanutri:brilho:${token}`

/** O celular pede menos movimento. */
export function reduzirMovimento(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  } catch {
    return false
  }
}

/**
 * CA-2204: o brilho passa na primeira vez do dia em que o dia fica completo; desmarcar e marcar de novo no mesmo dia não
 * brilha de novo. Guarda o dia no aparelho; sem armazenamento, brilha (o paciente não perde nada).
 */
export function brilharHoje(armazenamento: Armazenamento | null, token: string, hoje: string): boolean {
  if (reduzirMovimento()) return false
  try {
    if (armazenamento?.getItem(CHAVE(token)) === hoje) return false
    armazenamento?.setItem(CHAVE(token), hoje)
  } catch {
    // Armazenamento bloqueado: o brilho só não lembra o dia.
  }
  return true
}

/** D-1204: uma vibração de 10 ms ao marcar, onde o aparelho vibra (Android); nunca com "reduzir movimento". */
export function vibrarAoMarcar(): void {
  if (reduzirMovimento()) return
  try {
    globalThis.navigator?.vibrate?.(10)
  } catch {
    // Sem vibração neste aparelho.
  }
}

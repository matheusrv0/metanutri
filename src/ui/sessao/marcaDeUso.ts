// A marca de uso da sessão (spec separacao-site-app, D-515 e DP-SA-5).
//
// Fica no navegador, fora do espaço da conta: não vai para a nuvem nem para o backup. As abas do mesmo navegador
// dividem: o uso numa aba conta para todas (CA-1445). As horas são do servidor (o relógio daqui mais o desvio).
import type { Armazenamento } from '@/domain/persistencia.ts'

export const CHAVE_MARCA_DA_SESSAO = 'metanutri:sessao'

/** DP-SA-5: o uso vai para o navegador no máximo a cada tanto; dentro da aba, vale o valor exato, em memória. */
export const GRAVAR_USO_A_CADA_MS = 60_000

export interface MarcaDaSessao {
  /** De quem é a marca: a de outra conta não vale (CB-518). */
  readonly conta: string
  /** O último uso (tecla, clique, toque ou rolagem), pela hora do servidor. */
  readonly uso: number
  /** A hora da entrada, pela hora do servidor: a reserva quando o token não traz o `amr` (DP-SA-4). */
  readonly entrada: number | null
  /** Conta de administrador, com ou sem o código do app (CB-526): vale ao reabrir, antes de o perfil chegar. */
  readonly admin: boolean
  /** Hora do servidor menos o relógio daqui (DP-SA-4). */
  readonly desvio: number
  /** DP-SA-6, sem `navigator.locks`: até quando outra aba está fazendo a saída. */
  readonly saindo?: number
}

const numero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isFinite(valor)

/** A marca desta conta, ou nula (sem marca, de outra conta, estragada ou sem armazenamento). */
export function lerMarca(armazenamento: Armazenamento | null, conta: string): MarcaDaSessao | null {
  try {
    const bruto: unknown = JSON.parse(armazenamento?.getItem(CHAVE_MARCA_DA_SESSAO) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return null
    const o = bruto as Record<string, unknown>
    const entrada = o['entrada']
    const { uso, admin, desvio, saindo } = o
    if (o['conta'] !== conta || !numero(uso) || typeof admin !== 'boolean' || !numero(desvio)) return null
    if (entrada !== null && !numero(entrada)) return null
    return { conta, uso, entrada, admin, desvio, ...(numero(saindo) ? { saindo } : {}) }
  } catch {
    return null
  }
}

export function gravarMarca(armazenamento: Armazenamento | null, marca: MarcaDaSessao): void {
  try {
    armazenamento?.setItem(CHAVE_MARCA_DA_SESSAO, JSON.stringify(marca))
  } catch {
    // navegador cheio ou bloqueado: a aba segue com o uso em memória
  }
}

export function apagarMarca(armazenamento: Armazenamento | null): void {
  try {
    armazenamento?.removeItem(CHAVE_MARCA_DA_SESSAO)
  } catch {
    // sem armazenamento: não há o que apagar
  }
}

/** Já passou o bastante desde a última gravação do uso. */
export const deveGravarUso = (ultimaGravacao: number | null, agora: number): boolean => ultimaGravacao === null || agora - ultimaGravacao >= GRAVAR_USO_A_CADA_MS

/**
 * DP-SA-18: o último uso é o maior entre a marca (outra aba pode ter usado), o da memória desta aba e a entrada. Sem
 * marca, vale a hora da entrada (CB-517).
 */
export function ultimoUso(marca: MarcaDaSessao | null, emMemoria: number | null, entrada: number): number {
  return Math.max(marca?.uso ?? entrada, emMemoria ?? entrada, entrada)
}

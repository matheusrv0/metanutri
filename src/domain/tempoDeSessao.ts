// Quanto tempo a sessão dura (spec separacao-site-app, D-514 a D-516).
//
// Sem Supabase Pro, quem mede é o app: a sessão sai sozinha depois de um tempo sem uso e, no máximo, um tempo depois
// de entrar. Tudo aqui é puro: recebe as horas e diz o que fazer. As horas vêm pela hora do servidor (o relógio do
// computador corrigido pelo desvio, DP-SA-4), para um relógio errado não mudar a hora de sair (CA-1454).

export interface LimitesDaSessao {
  /** Sem tecla, clique, toque nem rolagem por este tempo, a sessão sai. */
  readonly semUsoMs: number
  /** Depois deste tempo desde a entrada, a sessão sai mesmo em uso. */
  readonly totalMs: number
}

const MINUTO_MS = 60_000
const HORA_MS = 60 * MINUTO_MS

/** D-514: nutricionista e estudante; e o administrador, que vê as contas inteiras e os comprovantes (CB-526). */
export const LIMITES_DA_SESSAO: { readonly comum: LimitesDaSessao; readonly admin: LimitesDaSessao } = {
  comum: { semUsoMs: 30 * MINUTO_MS, totalMs: 12 * HORA_MS },
  admin: { semUsoMs: 15 * MINUTO_MS, totalMs: 8 * HORA_MS },
}

export const limitesDa = (admin: boolean): LimitesDaSessao => (admin ? LIMITES_DA_SESSAO.admin : LIMITES_DA_SESSAO.comum)

/** D-516: "Você ainda está aí?" aparece este tempo antes da saída sem uso. */
export const AVISO_ANTES_MS = 2 * MINUTO_MS
/** D-516: a faixa com a hora do fim aparece este tempo antes do limite total. */
export const FAIXA_ANTES_MS = 10 * MINUTO_MS

export type MotivoDaSaida = 'inatividade' | 'limite'

export interface HorasDaSessao {
  /** Agora, pela hora do servidor. */
  readonly agora: number
  /** O último uso; sem marca de uso, a hora da entrada (CB-517). */
  readonly uso: number
  /** A hora da entrada, pelo servidor (o `amr` do token). */
  readonly entrada: number
  readonly admin: boolean
}

export interface SituacaoDaSessao {
  /** A sessão venceu, e por quê; nulo enquanto vale. */
  readonly saida: MotivoDaSaida | null
  /** "Você ainda está aí?" (CA-1442). */
  readonly aviso: boolean
  /** A faixa do limite total (CA-1444). */
  readonly faixa: boolean
  /** Quando a sessão termina pelo limite total, que não se estende. */
  readonly fimDoLimite: number
  /** Quando termina se ninguém usar. */
  readonly fimSemUso: number
  /** O próximo instante em que algo muda (aviso, faixa ou saída): é quando conferir de novo. */
  readonly proximaMudanca: number
}

export function situacaoDaSessao({ agora, uso, entrada, admin }: HorasDaSessao): SituacaoDaSessao {
  const { semUsoMs, totalMs } = limitesDa(admin)
  const fimDoLimite = entrada + totalMs
  const fimSemUso = uso + semUsoMs
  const saida: MotivoDaSaida | null = agora >= fimDoLimite ? 'limite' : agora >= fimSemUso ? 'inatividade' : null
  const marcos = [fimSemUso - AVISO_ANTES_MS, fimSemUso, fimDoLimite - FAIXA_ANTES_MS, fimDoLimite].filter((marco) => marco > agora)
  return {
    saida,
    aviso: saida === null && agora >= fimSemUso - AVISO_ANTES_MS,
    faixa: saida === null && agora >= fimDoLimite - FAIXA_ANTES_MS,
    fimDoLimite,
    fimSemUso,
    proximaMudanca: saida !== null ? agora : Math.min(...marcos),
  }
}

/**
 * DP-SA-4: o desvio do relógio deste computador, pelo `iat` de um token que acabou de chegar. Somado ao relógio daqui,
 * dá a hora do servidor.
 */
export const desvioDoRelogio = (emitidoNoServidor: number, recebidoAqui: number): number => emitidoNoServidor - recebidoAqui

export interface LidoDoToken {
  /** A hora da entrada: o menor `timestamp` do `amr`, em milissegundos. */
  readonly entrada: number | null
  /** Quando o token foi emitido (`iat`), em milissegundos. */
  readonly emitido: number | null
}

const NADA_LIDO: LidoDoToken = { entrada: null, emitido: null }

/** O corpo do token de acesso, lido sem conferir a assinatura (quem confere é o servidor) e sem pacote. */
export function lerToken(token: unknown): LidoDoToken {
  if (typeof token !== 'string') return NADA_LIDO
  const partes = token.split('.')
  const corpo = partes[1]
  if (partes.length !== 3 || !corpo) return NADA_LIDO
  let dados: unknown
  try {
    const base64 = corpo.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(corpo.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0))
    dados = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return NADA_LIDO
  }
  if (typeof dados !== 'object' || dados === null) return NADA_LIDO
  const o = dados as Record<string, unknown>
  const amr = Array.isArray(o['amr']) ? (o['amr'] as unknown[]) : []
  const horas = amr
    .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>)['timestamp'] : undefined))
    .filter((hora): hora is number => typeof hora === 'number' && Number.isFinite(hora))
  const iat = o['iat']
  return {
    entrada: horas.length > 0 ? Math.min(...horas) * 1000 : null,
    emitido: typeof iat === 'number' && Number.isFinite(iat) ? iat * 1000 : null,
  }
}

const doisDigitos = (n: number): string => String(n).padStart(2, '0')

/** "21:42", no relógio deste computador. */
export function horaEMinuto(instante: number): string {
  const data = new Date(instante)
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}

const mesmoDia = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** D-526 e CB-516: "as 15:42" no mesmo dia; "ontem às 15:42"; "25/10 às 15:42" antes disso. */
export function textoDaHora(instante: number, agora: number): string {
  const data = new Date(instante)
  const hoje = new Date(agora)
  const ontem = new Date(agora)
  ontem.setDate(ontem.getDate() - 1)
  const hora = horaEMinuto(instante)
  if (mesmoDia(data, hoje)) return `as ${hora}`
  if (mesmoDia(data, ontem)) return `ontem às ${hora}`
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)} às ${hora}`
}

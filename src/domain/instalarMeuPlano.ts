// Quando o link oferece "Instalar o Meu plano" (spec lado-do-paciente, D-1219 e DP-LP-22). O cartão Instalar aparece em
// Hoje depois da primeira marcação ou a partir do segundo dia de uso; "Agora não" esconde por 14 dias; depois de duas
// recusas, só a folha "Meu plano" oferece; no app instalado, nunca. A regra é pura: o estado guardado no aparelho e o que
// o navegador oferece chegam de fora.
import { somarDias } from './retorno.ts'
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_DO_INSTALAR = 'metanutri:instalar-meu-plano'

/** D-1219: "Agora não" esconde por 14 dias. */
export const DIAS_ESCONDIDO = 14
/** D-1219: depois de duas recusas, o cartão não volta (só a folha "Meu plano" oferece). */
export const RECUSAS_ATE_SUMIR = 2

export interface EstadoDoInstalar {
  /** O primeiro dia em que o link foi aberto neste aparelho (AAAA-MM-DD). */
  readonly primeiroDia: string | null
  /** O paciente já marcou uma missão neste aparelho. */
  readonly marcou: boolean
  readonly recusas: number
  /** Até este dia (exclusive), o cartão fica escondido. */
  readonly escondidoAte: string | null
  /** O pedido do navegador foi aceito (Android). */
  readonly instalado: boolean
}

export const ESTADO_INICIAL: EstadoDoInstalar = { primeiroDia: null, marcou: false, recusas: 0, escondidoAte: null, instalado: false }

/** De onde o link foi aberto: o que muda é como se instala. */
export type Plataforma = 'android' | 'iphone' | 'dentro-de-app' | 'outro'

/**
 * DP-LP-22: o navegador de dentro do WhatsApp, do Instagram e do Facebook primeiro (CA-2231); depois o iPhone (Safari,
 * CA-2230) e o Android (o pedido do Chrome, CA-2229). O resto (o computador) só instala se o navegador oferecer (CB-1219).
 */
export function plataformaDoAgente(agente: string): Plataforma {
  if (/WhatsApp|Instagram|FBAN|FBAV|FB_IAB/i.test(agente)) return 'dentro-de-app'
  if (/iPhone|iPad|iPod/i.test(agente)) return 'iphone'
  if (/Android/i.test(agente)) return 'android'
  return 'outro'
}

/** O que o aparelho permite agora. */
export interface ContextoDoInstalar {
  readonly hoje: string
  readonly plataforma: Plataforma
  /** O navegador guardou o pedido de instalação (`beforeinstallprompt`). */
  readonly temPedido: boolean
  /** O link já está aberto como app instalado (`display-mode: standalone`). */
  readonly noAppInstalado: boolean
}

/** Dá para instalar daqui: no iPhone e dentro de outro app, pela folha com os passos; no resto, só com o pedido do navegador. */
export const podeInstalar = (contexto: ContextoDoInstalar): boolean =>
  !contexto.noAppInstalado && (contexto.plataforma === 'iphone' || contexto.plataforma === 'dentro-de-app' || contexto.temPedido)

/** D-1219 e CA-2232: o cartão Instalar em Hoje. */
export function mostrarCartaoInstalar(estado: EstadoDoInstalar, contexto: ContextoDoInstalar): boolean {
  if (estado.instalado || !podeInstalar(contexto)) return false
  if (estado.recusas >= RECUSAS_ATE_SUMIR) return false
  if (estado.escondidoAte !== null && contexto.hoje < estado.escondidoAte) return false
  const segundoDia = estado.primeiroDia !== null && contexto.hoje > estado.primeiroDia
  return estado.marcou || segundoDia
}

/** D-1212: "Instalar na tela inicial" na folha "Meu plano" some no app instalado. */
export const oferecerNaFolha = (estado: EstadoDoInstalar, contexto: ContextoDoInstalar): boolean => !estado.instalado && podeInstalar(contexto)

/** O link foi aberto hoje: guarda o primeiro dia de uso. */
export const usou = (estado: EstadoDoInstalar, hoje: string): EstadoDoInstalar => (estado.primeiroDia === null ? { ...estado, primeiroDia: hoje } : estado)

export const marcou = (estado: EstadoDoInstalar): EstadoDoInstalar => (estado.marcou ? estado : { ...estado, marcou: true })

/** "Agora não" (e o pedido recusado no Android, CB-1220): esconde por 14 dias e conta uma recusa. */
export const recusou = (estado: EstadoDoInstalar, hoje: string): EstadoDoInstalar => ({
  ...estado,
  recusas: estado.recusas + 1,
  escondidoAte: somarDias(hoje, DIAS_ESCONDIDO),
})

/** CA-2229: instalado, o cartão some e não volta. */
export const instalou = (estado: EstadoDoInstalar): EstadoDoInstalar => ({ ...estado, instalado: true })

export function lerEstadoDoInstalar(armazenamento: Armazenamento | null): EstadoDoInstalar {
  try {
    const bruto: unknown = JSON.parse(armazenamento?.getItem(CHAVE_DO_INSTALAR) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return ESTADO_INICIAL
    const o = bruto as Record<string, unknown>
    const dia = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
    return {
      primeiroDia: dia(o['primeiroDia']),
      marcou: o['marcou'] === true,
      recusas: typeof o['recusas'] === 'number' && Number.isInteger(o['recusas']) && o['recusas'] >= 0 ? o['recusas'] : 0,
      escondidoAte: dia(o['escondidoAte']),
      instalado: o['instalado'] === true,
    }
  } catch {
    return ESTADO_INICIAL
  }
}

export function gravarEstadoDoInstalar(armazenamento: Armazenamento | null, estado: EstadoDoInstalar): void {
  try {
    armazenamento?.setItem(CHAVE_DO_INSTALAR, JSON.stringify(estado))
  } catch {
    // Sem armazenamento: o cartão só não lembra a escolha (CB-1226).
  }
}

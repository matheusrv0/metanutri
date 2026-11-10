// O pedido de instalação do navegador (spec lado-do-paciente, D-1219 e DP-LP-22): o Chrome, o Edge e o Samsung Internet
// avisam, com o `beforeinstallprompt`, que o "Meu plano" pode ser instalado. O aviso chega cedo, antes de a tela do link
// abrir; ele é guardado aqui desde o começo do app (`main.tsx`) e usado quando o paciente toca em "Instalar".
import { useSyncExternalStore } from 'react'
import { gravarEstadoDoInstalar, instalou, lerEstadoDoInstalar } from '@/domain/instalarMeuPlano.ts'
import { armazenamentoLocal } from '../../estado/armazenamentoLocal.ts'

/** O evento do Chrome, que o TypeScript não conhece. */
interface PedidoDoNavegador extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>
}

let pedido: PedidoDoNavegador | null = null
let instalado = false
const ouvintes = new Set<() => void>()
const avisar = () => {
  for (const ouvinte of ouvintes) ouvinte()
}

/** Chamado uma vez, no começo do app: guarda o pedido e fica sabendo da instalação. */
export function guardarPedidoDeInstalacao(alvo: Pick<Window, 'addEventListener'> = globalThis): void {
  alvo.addEventListener('beforeinstallprompt', (evento) => {
    // Sem isto, o Chrome mostra a barrinha dele na hora; o link pede quando o paciente já viu valor (D-1219).
    evento.preventDefault()
    pedido = evento as PedidoDoNavegador
    avisar()
  })
  alvo.addEventListener('appinstalled', () => {
    pedido = null
    instalado = true
    // CA-2229: instalado, o cartão não volta: o aparelho guarda.
    gravarEstadoDoInstalar(armazenamentoLocal(), instalou(lerEstadoDoInstalar(armazenamentoLocal())))
    avisar()
  })
}

export type ResultadoDoPedido = 'aceito' | 'recusado' | 'sem-pedido'

/** CA-2229: abre o pedido do navegador. O pedido só vale uma vez: depois dele, o navegador manda outro quando puder. */
export async function pedirInstalacao(): Promise<ResultadoDoPedido> {
  const atual = pedido
  if (atual === null) return 'sem-pedido'
  pedido = null
  avisar()
  try {
    await atual.prompt()
    const { outcome } = await atual.userChoice
    if (outcome === 'accepted') {
      instalado = true
      avisar()
      return 'aceito'
    }
    return 'recusado'
  } catch {
    return 'recusado'
  }
}

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** O navegador tem o pedido guardado agora, e o app já foi instalado nesta visita. */
export function usePedidoDeInstalacao(): { readonly temPedido: boolean; readonly instalado: boolean } {
  const temPedido = useSyncExternalStore(assinar, () => pedido !== null, () => false)
  const jaInstalado = useSyncExternalStore(assinar, () => instalado, () => false)
  return { temPedido, instalado: jaInstalado }
}

/** O link já está aberto como app instalado (sem barra de endereço): nunca oferece instalar (CA-2232). */
export function noAppInstalado(): boolean {
  try {
    const standalone = (globalThis.navigator as Navigator & { readonly standalone?: boolean }).standalone === true
    return standalone || globalThis.matchMedia?.('(display-mode: standalone)').matches === true
  } catch {
    return false
  }
}

/** Só nos testes: o pedido de mentira e o estado zerado. */
export function prepararPedidoParaTeste(novo: PedidoDoNavegador | null, jaInstalado = false): void {
  pedido = novo
  instalado = jaInstalado
  avisar()
}

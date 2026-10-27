// A navegação das telas públicas (spec site-publico-profissional, D-339; spec landing-escura, D-545): links com
// endereço de verdade (aba nova, robôs) que, no clique comum, trocam de tela pelo app, sem recarregar.
import type { MouseEvent } from 'react'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade' | 'fontes'

/**
 * D-339 (CA-1028): o clique comum troca de tela pelo app, sem recarregar; com Ctrl, Cmd, Shift, Alt ou o botão do meio
 * (aba nova), o navegador segue o endereço do link.
 */
export function navegarPeloApp(evento: MouseEvent<HTMLAnchorElement>, ir: () => void) {
  if (evento.defaultPrevented || evento.button !== 0 || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return
  evento.preventDefault()
  ir()
}

/** Rola até a seção da página, se ela existir. */
export function rolarAte(id: string) {
  globalThis.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar. */
export function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return globalThis.scrollTo?.({ top: 0 })
  globalThis.setTimeout(() => rolarAte(ancora), 60)
}

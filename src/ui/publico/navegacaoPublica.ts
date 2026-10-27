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

/** Suave com movimento; na hora (`auto`, o CSS desliga a rolagem suave) com menos movimento (revisão da landing v9). */
const comportamentoDaRolagem = (): ScrollBehavior =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true ? 'auto' : 'smooth'

/** Rola até a seção da página, se ela existir: suave, ou na hora com menos movimento (revisão da landing v9). */
export function rolarAte(id: string) {
  globalThis.document.getElementById(id)?.scrollIntoView({ behavior: comportamentoDaRolagem(), block: 'start' })
}

/** Volta ao alto da página pela mesma regra (spec landing-v3, D-688). */
export function rolarAoTopo() {
  globalThis.scrollTo?.({ top: 0, behavior: comportamentoDaRolagem() })
}

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar; sem âncora, volta ao alto. */
export function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return rolarAoTopo()
  globalThis.setTimeout(() => rolarAte(ancora), 60)
}

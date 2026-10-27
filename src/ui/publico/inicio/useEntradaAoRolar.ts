import { useEffect, type RefObject } from 'react'

/** O atraso entre as partes vizinhas que entram juntas (60 a 90 ms, na direção de arte). */
const PASSO_DO_ATRASO_MS = 80

/** Quanto de uma peça com `data-revela` precisa estar na tela para o movimento dela começar (spec landing-v3, D-664). */
const PARTE_VISIVEL_PARA_REVELAR = 0.35

/**
 * D-549: as partes marcadas com `data-surge` sobem ao entrar na tela, uma vez. O escondido só vale depois daqui
 * (`data-entrada` na raiz, regra em globals.css): na página pré-desenhada, sem JavaScript, sem IntersectionObserver ou
 * com menos movimento, nada se esconde. O que já está na tela agora entra marcado (`data-dentro`), sem piscar. O
 * `data-surge` com número ("0", "1", "2") diz a ordem dela entre as vizinhas; sem número, vale a posição na página.
 *
 * Spec landing-v3, D-664: as peças com `data-revela` (a linha de "Como funciona") não somem; elas só ganham
 * `data-dentro` quando um terço delas está na tela, e o CSS anima a partir daí.
 */
export function useEntradaAoRolar(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elemento = raiz.current
    if (!elemento || typeof IntersectionObserver === 'undefined') return
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const marcarAoEntrar = (opcoes: IntersectionObserverInit) => {
      const observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          entrada.target.setAttribute('data-dentro', '')
          observador.unobserve(entrada.target)
        }
      }, opcoes)
      return observador
    }
    const surgem = marcarAoEntrar({ rootMargin: '0px 0px -8% 0px' })
    const revelam = marcarAoEntrar({ threshold: PARTE_VISIVEL_PARA_REVELAR })
    const altura = globalThis.innerHeight
    elemento.querySelectorAll<HTMLElement>('[data-surge]').forEach((parte, i) => {
      const ordem = Number.parseInt(parte.dataset['surge'] ?? '', 10)
      parte.style.setProperty('--landing-atraso', `${(Number.isNaN(ordem) ? i % 3 : ordem) * PASSO_DO_ATRASO_MS}ms`)
      if (parte.getBoundingClientRect().top < altura) parte.setAttribute('data-dentro', '')
      else surgem.observe(parte)
    })
    elemento.querySelectorAll<HTMLElement>('[data-revela]').forEach((parte) => revelam.observe(parte))
    elemento.setAttribute('data-entrada', '')
    return () => {
      surgem.disconnect()
      revelam.disconnect()
      elemento.removeAttribute('data-entrada')
    }
  }, [raiz])
}

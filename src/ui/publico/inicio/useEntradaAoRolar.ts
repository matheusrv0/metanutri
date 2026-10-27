import { useEffect, type RefObject } from 'react'

/** O atraso entre as partes vizinhas que entram juntas (60 a 90 ms, na direção de arte). */
const PASSO_DO_ATRASO_MS = 80

/**
 * D-549: as partes marcadas com `data-surge` sobem ao entrar na tela, uma vez. O escondido só vale depois daqui
 * (`data-entrada` na raiz, regra em globals.css): na página pré-desenhada, sem JavaScript, sem IntersectionObserver ou
 * com menos movimento, nada se esconde. O que já está na tela agora entra marcado (`data-dentro`), sem piscar.
 */
export function useEntradaAoRolar(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const elemento = raiz.current
    if (!elemento || typeof IntersectionObserver === 'undefined') return
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          entrada.target.setAttribute('data-dentro', '')
          observador.unobserve(entrada.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    const altura = globalThis.innerHeight
    elemento.querySelectorAll<HTMLElement>('[data-surge]').forEach((parte, i) => {
      parte.style.setProperty('--landing-atraso', `${(i % 3) * PASSO_DO_ATRASO_MS}ms`)
      if (parte.getBoundingClientRect().top < altura) parte.setAttribute('data-dentro', '')
      else observador.observe(parte)
    })
    elemento.setAttribute('data-entrada', '')
    return () => {
      observador.disconnect()
      elemento.removeAttribute('data-entrada')
    }
  }, [raiz])
}

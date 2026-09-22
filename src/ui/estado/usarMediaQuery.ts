import { useCallback, useSyncExternalStore } from 'react'

/**
 * `true` enquanto a consulta de mídia casa (ex.: `(min-width: 1280px)`).
 * Lê direto do navegador pelo `useSyncExternalStore`: sem estado copiado, sem
 * piscar no primeiro quadro. Onde não há `matchMedia` (testes, servidor) devolve `false`.
 */
export function useMediaQuery(consulta: string): boolean {
  const assinar = useCallback(
    (aoMudar: () => void) => {
      const mq = globalThis.matchMedia?.(consulta)
      if (!mq) return () => {}
      mq.addEventListener('change', aoMudar)
      return () => mq.removeEventListener('change', aoMudar)
    },
    [consulta],
  )
  const ler = useCallback(() => globalThis.matchMedia?.(consulta).matches ?? false, [consulta])
  return useSyncExternalStore(assinar, ler, () => false)
}

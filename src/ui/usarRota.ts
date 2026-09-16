import { useCallback, useEffect, useState } from 'react'
import { escreverRota, lerRota, type Rota } from './navegacao.ts'

/** Rota atual lida do endereço, atualizada quando o usuário navega (inclusive voltar do navegador). */
export function useRota(): readonly [Rota, (rota: Rota) => void] {
  const [rota, setRota] = useState<Rota>(() => lerRota(globalThis.location?.hash ?? ''))

  useEffect(() => {
    const aoMudar = () => setRota(lerRota(globalThis.location.hash))
    globalThis.addEventListener('hashchange', aoMudar)
    return () => globalThis.removeEventListener('hashchange', aoMudar)
  }, [])

  const navegar = useCallback((nova: Rota) => {
    const hash = escreverRota(nova)
    if (globalThis.location.hash !== hash) globalThis.location.hash = hash
    setRota(nova)
  }, [])

  return [rota, navegar] as const
}

import { useEffect } from 'react'
import type { Rota } from './navegacao.ts'

/** Troca de rota depois de pintar: navegar durante o render atualizaria outro componente no meio do render. */
export function Redirecionar({ para, navegar }: { readonly para: Rota; readonly navegar: (rota: Rota) => void }) {
  useEffect(() => {
    navegar(para)
  }, [para, navegar])
  return null
}

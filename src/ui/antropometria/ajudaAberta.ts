// "Uma ajuda aberta por vez" (spec antropometria-telas, D-1415): a vista Avaliação guarda qual "?" está aberto; abrir
// outro fecha o primeiro. Fora do provedor (num teste, numa tela isolada), cada ajuda guarda o próprio estado.
import { createContext, useContext, useState } from 'react'

export interface AjudaAberta {
  /** O id da ajuda aberta; `null` = nenhuma. */
  readonly aberta: string | null
  readonly abrir: (id: string | null) => void
}

export const ContextoDaAjudaAberta = createContext<AjudaAberta | null>(null)

/** Se a ajuda `id` está aberta, e como abrir e fechar. */
export function useAjudaAberta(id: string): { readonly aberta: boolean; readonly alternar: () => void; readonly fechar: () => void } {
  const doGrupo = useContext(ContextoDaAjudaAberta)
  const [local, setLocal] = useState<string | null>(null)
  const grupo = doGrupo ?? { aberta: local, abrir: setLocal }
  const aberta = grupo.aberta === id
  return {
    aberta,
    alternar: () => grupo.abrir(aberta ? null : id),
    fechar: () => {
      if (aberta) grupo.abrir(null)
    },
  }
}

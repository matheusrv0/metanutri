// Chegou uma versão nova do MetaNutri neste navegador? (spec dados-na-nuvem, D-172.)
// Um estado só, para a página inteira: o registro do service worker avisa uma vez, e cada barra montada o lê.
import { useSyncExternalStore } from 'react'

let temVersaoNova = false
const ouvintes = new Set<() => void>()

/** O service worker de uma versão nova passou a valer: as barras aparecem. Não recarrega nada. */
export function avisarVersaoNova(): void {
  if (temVersaoNova) return
  temVersaoNova = true
  for (const ouvir of [...ouvintes]) ouvir()
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

const ler = (): boolean => temVersaoNova

/** Verdadeiro depois que uma versão nova passou a valer neste navegador. */
export function useVersaoNova(): boolean {
  return useSyncExternalStore(assinar, ler, ler)
}

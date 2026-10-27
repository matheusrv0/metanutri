import { createContext, useContext } from 'react'

/**
 * A hora do fim da sessão, no relógio deste computador, quando a faixa do limite total deve aparecer (spec
 * separacao-site-app, D-516 e DP-SA-21). O vigia mora fora da área de trabalho; a faixa, dentro dela (`Estrutura`).
 * `null` longe do limite, sem sessão ou fora do vigia.
 */
export const ContextoFimDaSessao = createContext<number | null>(null)

export function useFimDaSessao(): number | null {
  return useContext(ContextoFimDaSessao)
}

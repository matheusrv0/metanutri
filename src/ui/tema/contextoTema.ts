import { createContext, useContext } from 'react'

export type PreferenciaTema = 'claro' | 'escuro' | 'sistema'

export interface ValorTema {
  readonly preferencia: PreferenciaTema
  /** Tema efetivamente aplicado depois de resolver "sistema". */
  readonly aplicado: 'claro' | 'escuro'
  readonly definir: (p: PreferenciaTema) => void
  readonly alternar: () => void
}

export const ContextoTema = createContext<ValorTema | null>(null)

export const CHAVE_TEMA = 'metanutri:tema'

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema)
  if (!valor) throw new Error('useTema precisa estar dentro de <ProvedorTema>.')
  return valor
}

import { useMemo, useState } from 'react'
import { criarRepositorioSugestoes, type ListasDeSugestoes, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { armazenamentoLocal } from './armazenamentoLocal.ts'

export interface ValorSugestoes {
  readonly listas: ListasDeSugestoes
  /** Grava e passa a valer em todas as refeições do tipo; `false` quando o aparelho não guardou (CB-70). */
  readonly salvar: (tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]) => boolean
}

/** As listas de sugestões deste aparelho, lidas uma vez e relidas a cada gravação (CA-243). */
export function useSugestoes(): ValorSugestoes {
  const repositorio = useMemo(() => criarRepositorioSugestoes(armazenamentoLocal()), [])
  const [listas, setListas] = useState<ListasDeSugestoes>(() => repositorio.ler())

  const salvar = (tipo: TipoRefeicao, lista: readonly SugestaoAlimento[]) => {
    if (!repositorio.salvar(tipo, lista)) return false
    setListas(repositorio.ler())
    return true
  }

  return { listas, salvar }
}

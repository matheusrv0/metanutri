import { createContext, useContext } from 'react'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import type { FonteAcompanhamentos, RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'

export interface ValorAcompanhamentos {
  readonly repositorio: RepositorioAcompanhamentos
  /** A costura com o servidor: é ela que a tela do paciente usa. */
  readonly fonte: FonteAcompanhamentos
  /** Todos os links criados, do mais novo para o mais antigo. */
  readonly acompanhamentos: readonly Acompanhamento[]
  readonly avisoArmazenamento: string | null
  readonly salvar: (acompanhamento: Acompanhamento) => Acompanhamento
  readonly remover: (id: string) => void
}

export const ContextoAcompanhamentos = createContext<ValorAcompanhamentos | null>(null)

export function useAcompanhamentos(): ValorAcompanhamentos {
  const valor = useContext(ContextoAcompanhamentos)
  if (!valor) throw new Error('useAcompanhamentos precisa estar dentro de <ProvedorAcompanhamentos>.')
  return valor
}

import { createContext, useContext } from 'react'
import type { CasoSalvo, RepositorioCasos, ResumoCaso } from '@/domain/persistencia.ts'

export interface ValorCasos {
  readonly repositorio: RepositorioCasos
  /** Lista resumida, atualizada a cada mudança. */
  readonly casos: readonly ResumoCaso[]
  /** Aviso de armazenamento indisponível ou cheio (CB-09); `null` quando está tudo certo. */
  readonly avisoArmazenamento: string | null
  /** CB-08: outra aba do navegador mudou os casos e esta tela foi atualizada. */
  readonly mudouEmOutraAba: boolean
  readonly dispensarAvisoOutraAba: () => void
  /** Recarrega a lista a partir do armazenamento (após criar, excluir etc.). */
  readonly atualizar: () => void
  /** Salva e devolve a versão gravada, mantendo a lista em dia. */
  readonly salvar: (registro: Pick<CasoSalvo, 'caso' | 'plano'>) => CasoSalvo
}

export const ContextoCasos = createContext<ValorCasos | null>(null)

export function useCasos(): ValorCasos {
  const valor = useContext(ContextoCasos)
  if (!valor) throw new Error('useCasos precisa estar dentro de <ProvedorCasos>.')
  return valor
}

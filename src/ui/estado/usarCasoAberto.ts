import { useCallback, useState } from 'react'
import type { CasoSalvo } from '@/domain/persistencia.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { useCasos } from './contextoCasos.ts'

export interface CasoAbertoEditavel {
  readonly registro: CasoSalvo | null
  readonly alterarCaso: (mudanca: Partial<Caso>) => void
  readonly alterarPlano: (novo: Plano) => void
}

/** Lê o caso do endereço e salva cada alteração na hora, para o trabalho não se perder (CA-49). */
export function useCasoAberto(id: string): CasoAbertoEditavel {
  const { repositorio, salvar } = useCasos()
  const [registro, setRegistro] = useState<CasoSalvo | null>(() => repositorio.obter(id))
  const [idConhecido, setIdConhecido] = useState(id)

  // Ajuste durante a renderização (padrão do React): troca de caso recarrega do armazenamento.
  if (id !== idConhecido) {
    setIdConhecido(id)
    setRegistro(repositorio.obter(id))
  }

  const alterarCaso = useCallback(
    (mudanca: Partial<Caso>) => {
      setRegistro((atual) => (atual ? salvar({ caso: { ...atual.caso, ...mudanca }, plano: atual.plano }) : atual))
    },
    [salvar],
  )

  const alterarPlano = useCallback(
    (novo: Plano) => {
      setRegistro((atual) => (atual ? salvar({ caso: atual.caso, plano: novo }) : atual))
    },
    [salvar],
  )

  return { registro, alterarCaso, alterarPlano }
}

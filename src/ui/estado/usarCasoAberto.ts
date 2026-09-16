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

  // `salvar` mexe no estado do provedor, então é chamado no próprio evento —
  // nunca dentro do atualizador, que roda durante a renderização.
  const alterarCaso = useCallback(
    (mudanca: Partial<Caso>) => {
      if (!registro) return
      setRegistro(salvar({ caso: { ...registro.caso, ...mudanca }, plano: registro.plano }))
    },
    [registro, salvar],
  )

  const alterarPlano = useCallback(
    (novo: Plano) => {
      if (!registro) return
      setRegistro(salvar({ caso: registro.caso, plano: novo }))
    },
    [registro, salvar],
  )

  return { registro, alterarCaso, alterarPlano }
}

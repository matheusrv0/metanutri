import { createContext, useContext } from 'react'
import type { Paciente, RepositorioPacientes } from '@/domain/pacientes.ts'

export interface ValorPacientes {
  readonly repositorio: RepositorioPacientes
  readonly pacientes: readonly Paciente[]
  readonly atualizar: () => void
}

export const ContextoPacientes = createContext<ValorPacientes | null>(null)

export function usePacientes(): ValorPacientes {
  const valor = useContext(ContextoPacientes)
  if (!valor) throw new Error('usePacientes precisa estar dentro de <ProvedorPacientes>.')
  return valor
}

import type { ReactNode } from 'react'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { TelaAbrindoDados } from './TelaAbrindoDados.tsx'

interface PortaoDaNuvemProps {
  /** A área do nutricionista espera a cópia da nuvem; o link do paciente, não (CB-126, DP-12). */
  readonly areaDoNutricionista: boolean
  readonly children: ReactNode
}

/**
 * A área de trabalho só aparece depois de os dados da conta chegarem da nuvem (spec dados-na-nuvem,
 * D-128): antes, "Carregando seus dados…"; sem internet, o aviso do CA-484. Sem nuvem, deixa passar.
 */
export function PortaoDaNuvem({ areaDoNutricionista, children }: PortaoDaNuvemProps) {
  const nuvem = useNuvem()
  if (nuvem === null || !areaDoNutricionista) return <>{children}</>
  const { fase } = nuvem.estado
  if (fase !== 'pronta') return <TelaAbrindoDados fase={fase} />
  return <>{children}</>
}

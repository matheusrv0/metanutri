import type { ReactNode } from 'react'
import { useNuvem } from '../estado/contextoNuvem.ts'
import type { ValorConta } from '../estado/usarConta.ts'
import { TelaAbrindoDados } from './TelaAbrindoDados.tsx'
import { TravaDaNuvem } from './TravaDaNuvem.tsx'

interface PortaoDaNuvemProps {
  /** A área do nutricionista espera a cópia da nuvem e trava; o link do paciente, não (CB-126, DP-12). */
  readonly areaDoNutricionista: boolean
  /** Para o "Sair" da trava (DP-10). */
  readonly conta: Pick<ValorConta, 'sair'>
  readonly aoSaiu: () => void
  readonly children: ReactNode
}

/**
 * A área de trabalho só aparece depois de os dados da conta chegarem da nuvem (spec dados-na-nuvem,
 * D-128): antes, "Carregando seus dados…"; sem internet, o aviso do CA-484. Depois, sem internet ou
 * com a cópia grande demais, a trava cobre a área (D-130, CB-123). Sem nuvem, deixa passar.
 */
export function PortaoDaNuvem({ areaDoNutricionista, conta, aoSaiu, children }: PortaoDaNuvemProps) {
  const nuvem = useNuvem()
  if (nuvem === null || !areaDoNutricionista) return <>{children}</>
  const { fase, trava, reduzindo } = nuvem.estado
  if (fase !== 'pronta') return <TelaAbrindoDados fase={fase} />
  // CB-123: reduzindo, a capa sai e a frase do CA-445 fica no alto da área (Estrutura).
  const capa = trava === 'grande-demais' && reduzindo ? null : trava
  return (
    <>
      {children}
      {capa !== null ? <TravaDaNuvem trava={capa} conta={conta} aoSaiu={aoSaiu} aoReduzir={nuvem.reduzir} /> : null}
    </>
  )
}

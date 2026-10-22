import { useId } from 'react'
import { consumoPorPessoa, type ConsumoMensal } from '@/domain/consumoDaCasa.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'

interface CampoConsumoMensalProps {
  readonly consumo: ConsumoMensal
  readonly pessoasNaCasa: number | null
  readonly aoMudar: (consumo: ConsumoMensal) => void
}

/**
 * Óleo, sal e açúcar por mês na casa e o valor por pessoa por dia (spec ficha-unica, D-361). Sem pessoas na casa, a
 * ficha pede o número em Dados do paciente.
 */
export function CampoConsumoMensal({ consumo, pessoasNaCasa, aoMudar }: CampoConsumoMensalProps) {
  const id = useId()
  const porPessoa = consumoPorPessoa(consumo, pessoasNaCasa)
  const algum = consumo.oleoL !== null || consumo.salKg !== null || consumo.acucarKg !== null
  return (
    <fieldset aria-describedby={`${id}-conta`} className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-foreground">Óleo, sal e açúcar por mês</legend>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <CampoNumero rotulo="Óleo" valor={consumo.oleoL} aoMudar={(oleoL) => aoMudar({ ...consumo, oleoL })} sufixo="litros" />
        <CampoNumero rotulo="Sal" valor={consumo.salKg} aoMudar={(salKg) => aoMudar({ ...consumo, salKg })} sufixo="kg" />
        <CampoNumero rotulo="Açúcar" valor={consumo.acucarKg} aoMudar={(acucarKg) => aoMudar({ ...consumo, acucarKg })} sufixo="kg" />
      </div>
      <p id={`${id}-conta`} className="text-xs text-muted-foreground">
        {porPessoa ?? (algum ? 'Informe quantas pessoas moram na casa, em Dados do paciente, para ver o valor por pessoa.' : 'O consumo da casa inteira.')}
      </p>
    </fieldset>
  )
}

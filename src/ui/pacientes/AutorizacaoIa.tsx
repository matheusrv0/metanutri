import { useId } from 'react'
import { diaNaTela } from '@/domain/iaGaveta.ts'
import { autorizacaoDeIa, type ConsentimentoIa } from '@/domain/pacientes.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { O_QUE_VAI_A_IA } from '../ia/AutorizacaoNaGaveta.tsx'

interface AutorizacaoIaProps {
  readonly consentimento: ConsentimentoIa | null
  /** AAAA-MM-DD. */
  readonly hoje: string
  readonly aoMudar: (consentimento: ConsentimentoIa | null) => void
  readonly aoBaixarTermo: () => void
}

/**
 * Spec assistente-ia, D-1304 e CA-2376: na ficha, a chave da autorização do paciente para o uso de IA, com o dia, a
 * linha do que vai à IA e o termo em Word. Desligar revoga; os planos feitos continuam como estão.
 */
export function AutorizacaoIa({ consentimento, hoje, aoMudar, aoBaixarTermo }: AutorizacaoIaProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surfacerow px-4 py-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          <span id={id} className="font-semibold text-heading">
            Autorizou o uso de IA
          </span>
          {consentimento ? <span className="ml-2 text-muted-foreground">{`Desde ${diaNaTela(consentimento.em)}`}</span> : null}
        </p>
        <Switch checked={consentimento !== null} onCheckedChange={(ligada) => aoMudar(ligada ? autorizacaoDeIa(hoje) : null)} aria-labelledby={id} />
      </div>
      <p className="text-sm text-muted-foreground">
        {O_QUE_VAI_A_IA}{' '}
        <Button variant="link" size="sm" className="h-auto px-0 align-baseline text-sm max-sm:min-h-11" onClick={aoBaixarTermo}>
          Termo de autorização
        </Button>
      </p>
    </div>
  )
}

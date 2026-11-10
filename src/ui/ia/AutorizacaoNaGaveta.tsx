import { useId } from 'react'
import { diaNaTela } from '@/domain/iaGaveta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'

/** D-1304: o que vai à IA e o que não vai, na linha da autorização. */
export const O_QUE_VAI_A_IA = 'Vão idade, sexo, medidas, saúde, restrições e rotina. Nome, contato e nascimento não vão.'

interface AutorizacaoNaGavetaProps {
  /** AAAA-MM-DD da autorização gravada na ficha; nulo sem autorização. */
  readonly desde: string | null
  readonly aoMudar: (ligada: boolean) => void
  /** Sem ele, a linha fica sem o link do termo. */
  readonly aoBaixarTermo?: (() => void) | undefined
}

/** D-1304 e CA-2365: a chave grava na ficha; desligar revoga. O termo em Word sai pelo link. */
export function AutorizacaoNaGaveta({ desde, aoMudar, aoBaixarTermo }: AutorizacaoNaGavetaProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-t border-bordersubtle py-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm">
          <span id={id} className="font-bold text-heading">
            Paciente autorizou o uso de IA
          </span>
          {desde ? <span className="ml-2 text-muted-foreground">{`Desde ${diaNaTela(desde)}`}</span> : null}
        </p>
        <Switch checked={desde !== null} onCheckedChange={aoMudar} aria-labelledby={id} />
      </div>
      <p className="text-sm text-muted-foreground">
        {O_QUE_VAI_A_IA}
        {aoBaixarTermo ? (
          <>
            {' '}
            <Button variant="link" size="sm" className="h-auto px-0 align-baseline text-sm max-sm:min-h-11" onClick={aoBaixarTermo}>
              Termo de autorização
            </Button>
          </>
        ) : null}
      </p>
    </section>
  )
}

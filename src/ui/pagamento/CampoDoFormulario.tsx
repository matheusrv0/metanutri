import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CampoDoFormularioProps {
  /** O id do campo (o nosso) ou do alvo do iframe (o seguro). O rótulo, o erro e a dica derivam dele. */
  readonly id: string
  readonly rotulo: string
  readonly erro?: string | undefined
  readonly dica?: string | undefined
  /** Campo seguro: o rótulo não é <label>, porque o campo de verdade está dentro do iframe. */
  readonly seguro?: boolean | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
}

const ROTULO = 'text-sm font-semibold text-heading'

/** Rótulo em cima, a caixa no meio e, embaixo, o erro (CA-370) ou a dica. */
export function CampoDoFormulario({ id, rotulo, erro, dica, seguro = false, className, children }: CampoDoFormularioProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {seguro ? (
        <span id={`${id}-rotulo`} className={ROTULO}>
          {rotulo}
        </span>
      ) : (
        <label htmlFor={id} className={ROTULO}>
          {rotulo}
        </label>
      )}
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-semibold text-errortext">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  )
}

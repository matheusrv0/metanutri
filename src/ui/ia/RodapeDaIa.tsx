import type { ReactNode } from 'react'

interface RodapeDaIaProps {
  /** Os botões, o principal primeiro. */
  readonly acoes: ReactNode
  /** Por que a ação principal está desligada; nulo quando não está. */
  readonly motivo?: string | null | undefined
  /** "7 de 20 sugestões em novembro" (D-1321); nulo enquanto o contador não chegou. */
  readonly contador: string | null
  /**
   * D-1371: na folha do celular, a linha do motivo fica reservada mesmo sem motivo: o motivo que some (ao ligar a
   * autorização) não encolhe a folha, e o que está acima dela, como a chave, não sai do lugar.
   */
  readonly reservarMotivo?: boolean | undefined
}

/** D-1302: a ação principal, o motivo quando ela está desligada e o contador do mês. */
export function RodapeDaIa({ acoes, motivo, contador, reservarMotivo }: RodapeDaIaProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {acoes}
        {reservarMotivo ? (
          <span data-motivo="" className="min-h-5 basis-full text-sm text-foreground">
            {motivo ?? ''}
          </span>
        ) : motivo ? (
          <span data-motivo="" className="text-sm text-foreground">
            {motivo}
          </span>
        ) : null}
      </div>
      {contador ? <p className="numeros text-xs text-muted-foreground">{contador}</p> : null}
    </div>
  )
}

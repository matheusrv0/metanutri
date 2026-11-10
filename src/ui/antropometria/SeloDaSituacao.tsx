import { Badge, type BadgeProps } from '@ds/componentes/display/badge.tsx'
import type { TomDoSelo } from './textosDaAvaliacao.ts'

const VARIANTE: Readonly<Record<TomDoSelo, NonNullable<BadgeProps['variant']>>> = {
  ok: 'lightSuccess',
  baixo: 'lightWarning',
  alto: 'lightError',
  neutro: 'muted',
}

interface SeloDaSituacaoProps {
  readonly rotulo: string
  readonly tom: TomDoSelo
}

/**
 * O selo da situação de um indicador (spec antropometria-telas, D-1417 e DP-AT-17): o rótulo é sempre o do motor; a cor
 * é o estado (adequado verde, atenção âmbar, alterado e grave vermelho, informativo neutro). O rótulo longo quebra.
 */
export function SeloDaSituacao({ rotulo, tom }: SeloDaSituacaoProps) {
  return (
    <Badge variant={VARIANTE[tom]} data-tom={tom} className="max-w-full whitespace-normal rounded-md px-2 py-0.5 text-left leading-snug">
      {rotulo}
    </Badge>
  )
}

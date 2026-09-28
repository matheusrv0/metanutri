import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Anel de progresso: missões feitas no dia, energia do plano sobre o gasto.
 * A cor segue o estado quando é dado (ok, abaixo, acima) e a marca quando é só
 * contagem. O número vai escrito no meio, para não depender da cor.
 */
export type TomAnel = 'marca' | 'ok' | 'abaixo' | 'acima'

const COR: Readonly<Record<TomAnel, string>> = {
  marca: 'var(--chart-1)',
  ok: 'var(--state-ok)',
  abaixo: 'var(--state-low)',
  acima: 'var(--state-high)',
}

interface AnelProgressoProps {
  readonly valor: number
  readonly maximo: number
  readonly rotulo: string
  readonly tom?: TomAnel | undefined
  readonly grande?: boolean | undefined
  readonly children?: ReactNode
}

export function AnelProgresso({ valor, maximo, rotulo, tom = 'marca', grande = false, children }: AnelProgressoProps) {
  const pct = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  // Variáveis CSS e não `background` direto: o gradiente cônico fica no utilitário,
  // e o componente só informa quanto e com que cor (o jsdom também guarda variável).
  const estilo = { '--anel-pct': `${Math.round(pct)}%`, '--anel-cor': COR[tom] } as CSSProperties

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={Math.min(valor, maximo)}
      style={estilo}
      className={cn(
        'grid shrink-0 place-content-center rounded-full bg-[conic-gradient(var(--anel-cor)_var(--anel-pct),var(--surface-row)_0%)]',
        grande ? 'size-24' : 'size-16',
      )}
    >
      <span className={cn('grid place-content-center rounded-full bg-card text-center', grande ? 'size-19' : 'size-12')}>{children}</span>
    </div>
  )
}

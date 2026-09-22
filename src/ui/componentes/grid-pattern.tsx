import { useId } from 'react'
import { cn } from '@/lib/utils'

interface GridPatternProps {
  readonly width?: number
  readonly height?: number
  readonly x?: number
  readonly y?: number
  /** Células preenchidas, em coordenadas de grade. */
  readonly squares?: readonly (readonly [number, number])[]
  readonly className?: string
}

/**
 * Grade de fundo. Adaptado de GridPattern (21st.dev / magicui).
 *
 * Aqui ela não é enfeite: grade com algumas casas cheias é uma tabela de
 * composição, que é o material deste produto.
 */
export function GridPattern({ width = 44, height = 44, x = -1, y = -1, squares, className }: GridPatternProps) {
  const id = useId()

  return (
    <svg aria-hidden="true" className={cn('pointer-events-none absolute inset-0 size-full text-grade', className)}>
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares ? (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([cx, cy]) => (
            <rect
              key={`${cx}-${cy}`}
              strokeWidth="0"
              width={width - 1}
              height={height - 1}
              x={cx * width + 1}
              y={cy * height + 1}
              className="fill-gradecheia"
            />
          ))}
        </svg>
      ) : null}
    </svg>
  )
}

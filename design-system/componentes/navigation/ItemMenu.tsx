import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

interface ItemMenuProps {
  readonly icone: ReactNode
  readonly rotulo: string
  /** Linha menor abaixo do rótulo (ex.: nome do caso). */
  readonly detalhe?: string | undefined
  /** Conteúdo à direita (ex.: contagem). */
  readonly extra?: ReactNode
  readonly ativo: boolean
  readonly aoClicar: () => void
}

/** Entrada do índice na lombada: ativa vira uma tarja de papel sobre a tinta. */
export function ItemMenu({ icone, rotulo, detalhe, extra, ativo, aoClicar }: ItemMenuProps) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'flex w-full min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativo ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:bg-bordersubtle hover:text-foreground',
      )}
    >
      {icone}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate', ativo ? 'font-semibold' : 'font-medium')}>{rotulo}</span>
        {detalhe ? <span className={cn('truncate text-xs font-normal', 'text-muted-foreground')}>{detalhe}</span> : null}
      </span>
      {extra}
    </button>
  )
}

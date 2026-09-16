import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

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
        'flex w-full items-center gap-3 rounded-xs px-3 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lombadatexto/60',
        ativo ? 'bg-papel text-tinta' : 'text-lombadatexto/85 hover:bg-lombadatexto/10 hover:text-lombadatexto',
      )}
    >
      {icone}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate', ativo ? 'font-semibold' : 'font-medium')}>{rotulo}</span>
        {detalhe ? <span className={cn('truncate text-xs font-normal', ativo ? 'text-muted-foreground' : 'text-lombadafraca')}>{detalhe}</span> : null}
      </span>
      {extra}
    </button>
  )
}

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

export function ItemMenu({ icone, rotulo, detalhe, extra, ativo, aoClicar }: ItemMenuProps) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-current={ativo ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm font-medium transition-colors [&_svg]:size-5 [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativo ? 'bg-lightprimary text-primary' : 'text-foreground hover:bg-lightprimary hover:text-primary',
      )}
    >
      {icone}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{rotulo}</span>
        {detalhe ? <span className="truncate text-xs font-normal text-muted-foreground">{detalhe}</span> : null}
      </span>
      {extra}
    </button>
  )
}

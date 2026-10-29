import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Linha de lista em cinza, dentro de cartão branco (referência Spora). Quando recebe
 * `aoClicar`, a linha inteira vira o botão e ganha a seta no fim.
 */
interface LinhaListaProps {
  readonly titulo: ReactNode
  readonly detalhe?: ReactNode | undefined
  readonly inicio?: ReactNode | undefined
  readonly fim?: ReactNode | undefined
  readonly aoClicar?: (() => void) | undefined
  readonly marcada?: boolean | undefined
  readonly className?: string | undefined
}

export function LinhaLista({ titulo, detalhe, inicio, fim, aoClicar, marcada = false, className }: LinhaListaProps) {
  const base = cn(
    'flex min-h-14 w-full items-center gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-left',
    marcada && 'bg-surfaceaccentsoft ring-1 ring-inset ring-primary/30',
    className,
  )

  const miolo = (
    <>
      {inicio ? <span className="grid size-9 shrink-0 place-content-center rounded-xl bg-card text-primary [&_svg]:size-4">{inicio}</span> : null}
      {/* D-801 (spec ajustes-mobile, M-006): o título identifica, então quebra em até duas linhas, com o resto no
          title; o detalhe quebra livre. Cortar numa linha deixava dois planos iguais na tela. */}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-sm font-semibold text-heading" title={typeof titulo === 'string' ? titulo : undefined}>
          {titulo}
        </span>
        {detalhe ? <span className="block break-words text-xs text-muted-foreground">{detalhe}</span> : null}
      </span>
      {fim ?? (aoClicar ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null)}
    </>
  )

  if (!aoClicar) return <div className={base}>{miolo}</div>

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(base, 'transition-[filter] hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {miolo}
    </button>
  )
}

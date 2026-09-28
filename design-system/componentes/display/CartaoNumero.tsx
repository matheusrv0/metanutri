import { ArrowUpRight } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Cartão de número da referência Spora: valor grande em cima, rótulo e apoio embaixo.
 * A seta laranja só aparece quando o cartão leva a algum lugar (spec estilo-spora,
 * D-29): seta em cartão parado parece botão e engana.
 */
export type TomCartaoNumero = 'branco' | 'cinza' | 'teal'

interface CartaoNumeroProps {
  readonly valor: string
  readonly rotulo: string
  readonly apoio?: string | undefined
  readonly tom?: TomCartaoNumero | undefined
  readonly aoClicar?: (() => void) | undefined
  readonly className?: string | undefined
}

const TONS: Readonly<Record<TomCartaoNumero, string>> = {
  branco: 'bg-card text-card-foreground',
  cinza: 'bg-surfacerow text-foreground',
  teal: 'bg-surfacebrand text-textonbrand',
}

const APOIO: Readonly<Record<TomCartaoNumero, string>> = {
  branco: 'text-muted-foreground',
  cinza: 'text-muted-foreground',
  teal: 'text-textonbrandmuted',
}

export function CartaoNumero({ valor, rotulo, apoio, tom = 'branco', aoClicar, className }: CartaoNumeroProps) {
  const conteudo = (
    <>
      <span className="font-titulo text-4xl font-bold leading-none tracking-tight">{valor}</span>
      <span className="mt-6 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{rotulo}</span>
          {apoio ? <span className={cn('mt-0.5 block text-xs leading-snug', APOIO[tom])}>{apoio}</span> : null}
        </span>
        {aoClicar ? (
          <span aria-hidden="true" className="grid size-9 shrink-0 place-content-center rounded-full bg-acentofundo text-textoacento">
            <ArrowUpRight className="size-4" />
          </span>
        ) : null}
      </span>
    </>
  )

  const base = cn('flex min-h-36 w-full flex-col justify-between rounded-3xl p-5 text-left', TONS[tom], className)
  if (!aoClicar) return <div className={base}>{conteudo}</div>

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(
        base,
        'transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {conteudo}
    </button>
  )
}

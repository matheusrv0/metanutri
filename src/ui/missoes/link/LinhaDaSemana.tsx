import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LinhaDaSemanaProps {
  /** Os 7 dias, do mais antigo até hoje: com missão ou não. */
  readonly pontos: readonly boolean[]
  readonly dias: number
  readonly frase: string
  readonly aoAbrir: () => void
}

/** Os 7 dias em pontos, "3 de 7 dias nesta semana" e a frase da meta, em Hoje (D-1203); abre Semana. */
export function LinhaDaSemana({ pontos, dias, frase, aoAbrir }: LinhaDaSemanaProps) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card py-2.5 pr-3 pl-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-borderstrong"
    >
      <span aria-hidden="true" className="inline-flex shrink-0 gap-1.25">
        {pontos.map((marcado, i) => (
          <span
            key={i}
            className={cn(
              'size-2.25 rounded-full',
              marcado ? 'bg-stateok' : 'bg-surfacesunken ring-[1.5px] ring-borderstrong ring-inset',
              i === pontos.length - 1 ? 'outline-[1.5px] outline-offset-2 outline-heading outline-solid' : null,
            )}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <strong className="block font-bold text-heading">{`${dias} de 7 dias nesta semana`}</strong>
        <span className="block text-muted-foreground">{frase}</span>
      </span>
      <ChevronRight className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" strokeWidth={2.5} />
    </button>
  )
}

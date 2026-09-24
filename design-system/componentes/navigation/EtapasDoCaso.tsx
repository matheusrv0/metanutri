import { cn } from '@ds/lib/cn.ts'
import { ETAPAS, type AbaPlanejador } from '@/ui/navegacao.ts'

interface EtapasDoCasoProps {
  readonly abaAtual: AbaPlanejador
  readonly aoEscolher: (aba: AbaPlanejador) => void
}

/** Trilho das etapas: três colunas separadas por fio, a atual marcada como a linha em leitura. */
export function EtapasDoCaso({ abaAtual, aoEscolher }: EtapasDoCasoProps) {
  return (
    <nav aria-label="Etapas do plano" className="rounded-lg border border-border bg-card p-1.5 shadow-card">
      <ol className="grid grid-cols-3">
        {ETAPAS.map((etapa) => {
          const atual = etapa.aba === abaAtual
          return (
            <li key={etapa.aba} className="flex">
              <button
                type="button"
                onClick={() => aoEscolher(etapa.aba)}
                aria-current={atual ? 'step' : undefined}
                className={cn(
                  'group flex w-full flex-col items-center gap-1.5 rounded-md px-2 py-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-outline-offset-2',
                  atual ? 'bg-lightprimary' : 'hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'numeros flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                    atual ? 'border-transparent bg-surfaceinverse text-surfaceaccent' : 'border-borderdefault bg-card text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {etapa.numero}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn('text-xs font-semibold leading-tight sm:truncate sm:text-sm', 'text-heading')}>
                    <span className="sr-only">Etapa {etapa.numero}: </span>
                    {etapa.rotulo}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">{etapa.descricao}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

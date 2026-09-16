import { cn } from '@/lib/utils'
import { ETAPAS, type AbaPlanejador } from '../navegacao.ts'

interface EtapasDoCasoProps {
  readonly abaAtual: AbaPlanejador
  readonly aoEscolher: (aba: AbaPlanejador) => void
}

/** Trilha numerada do planejador: mostra onde a estudante está e deixa ir para qualquer etapa. */
export function EtapasDoCaso({ abaAtual, aoEscolher }: EtapasDoCasoProps) {
  return (
    <nav aria-label="Etapas do caso">
      <ol className="grid grid-cols-3 gap-2">
        {ETAPAS.map((etapa) => {
          const atual = etapa.aba === abaAtual
          return (
            <li key={etapa.aba} className="flex">
              <button
                type="button"
                onClick={() => aoEscolher(etapa.aba)}
                aria-current={atual ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  atual ? 'border-primary bg-lightprimary' : 'border-border bg-card hover:border-primary',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    atual ? 'bg-primary text-white' : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  {etapa.numero}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn('text-xs font-semibold leading-tight sm:truncate sm:text-sm', atual ? 'text-primary' : 'text-heading')}>
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

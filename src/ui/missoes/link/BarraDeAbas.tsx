import { ChartColumn, CircleCheck, Utensils, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemaDaPrevia } from '../marcaNoLink.ts'

/** As três partes do link (spec lado-do-paciente, D-1202). */
export type ParteDoLink = 'hoje' | 'plano' | 'semana'

const ROTULO: Readonly<Record<ParteDoLink, string>> = { hoje: 'Hoje', plano: 'Plano', semana: 'Semana' }
const ICONE: Readonly<Record<ParteDoLink, LucideIcon>> = { hoje: CircleCheck, plano: Utensils, semana: ChartColumn }

interface BarraDeAbasProps {
  readonly partes: readonly ParteDoLink[]
  readonly atual: ParteDoLink
  readonly aoIr: (parte: ParteDoLink) => void
  /** O endereço do link, para cada parte ser um link de verdade (abre o mesmo plano). */
  readonly endereco: string
  readonly previa?: TemaDaPrevia | undefined
}

/**
 * A barra das partes do link (D-1202, CA-2200 e CA-2217): navegação com um link por parte, a atual marcada pela cor da
 * marca e por `aria-current`. No celular, embaixo, onde o polegar alcança: 56 px mais a área segura do aparelho. Acima de
 * 640 px, um trilho no topo (CB-1219). Na prévia de "Sua marca", sempre o celular, no fim da tela.
 */
export function BarraDeAbas({ partes, atual, aoIr, endereco, previa }: BarraDeAbasProps) {
  return (
    <nav
      aria-label="Partes do plano"
      className={cn(
        'z-30 border-border bg-background',
        previa
          ? 'sticky bottom-0 border-t'
          : 'fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom,0px)] sm:static sm:mb-6 sm:rounded-full sm:border sm:bg-surfacerow sm:p-1 sm:pb-1',
      )}
    >
      <ul className={cn('mx-auto grid w-full max-w-md list-none', partes.length === 3 ? 'grid-cols-3' : 'grid-cols-2', previa ? null : 'sm:max-w-none sm:gap-1')}>
        {partes.map((parte) => {
          const Icone = ICONE[parte]
          const escolhida = parte === atual
          return (
            <li key={parte}>
              <a
                href={endereco}
                aria-current={escolhida ? 'page' : undefined}
                onClick={(evento) => {
                  evento.preventDefault()
                  aoIr(parte)
                }}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-bold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  escolhida ? 'text-linkacao' : 'text-muted-foreground hover:text-heading',
                  previa ? null : 'sm:min-h-10 sm:flex-row sm:gap-2 sm:rounded-full sm:text-sm sm:pointer-coarse:min-h-11',
                  previa || !escolhida ? null : 'sm:bg-card sm:shadow-xs',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-7 w-14 place-content-center rounded-full transition-colors duration-150',
                    escolhida ? 'bg-linkacao/15' : null,
                    previa ? null : 'sm:h-auto sm:w-auto sm:bg-transparent',
                  )}
                >
                  <Icone className="size-5.5" strokeWidth={2} />
                </span>
                <span>{ROTULO[parte]}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

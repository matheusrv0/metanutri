import { cn } from '@/lib/utils'
import { FUNDO_DA_ACAO } from '../marcaNoLink.ts'

interface BarraDoDiaProps {
  readonly feitas: number
  readonly total: number
  /** O segmento que acabou de encher, para o movimento de encher (D-1204); nulo sem marcação agora. */
  readonly segmentoNovo: number | null
  /** O brilho do dia completo, uma vez (D-1204, CA-2204). */
  readonly brilhar: boolean
}

/**
 * A barra do dia em segmentos, um por missão (D-1203, CA-2202): mostra quanto falta em missões, não em porcentagem. Os
 * segmentos cheios ficam na cor da ação (a da marca, D-956); com tudo feito, a barra inteira fica no verde de "feita".
 */
export function BarraDoDia({ feitas, total, segmentoNovo, brilhar }: BarraDoDiaProps) {
  const tudoFeito = total > 0 && feitas >= total
  return (
    <section aria-label="Progresso do dia" className="flex flex-col gap-2.5">
      <div
        role="progressbar"
        aria-label="Missões feitas hoje"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={feitas}
        aria-valuetext={`${feitas} de ${total} feitas`}
        className={cn('relative grid h-2.5 auto-cols-fr grid-flow-col gap-1.25 overflow-hidden rounded-full', brilhar ? 'mp-brilha' : null)}
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="block h-full overflow-hidden rounded-xs bg-surfacesunken ring-1 ring-border ring-inset first:rounded-l-full last:rounded-r-full">
            {i < feitas ? (
              <span
                className={cn(
                  'block h-full transition-colors duration-200 ease-[var(--ease-marcar)] motion-reduce:duration-[120ms]',
                  tudoFeito ? 'bg-stateok' : FUNDO_DA_ACAO,
                  i === segmentoNovo ? 'mp-segmento-novo' : null,
                )}
              />
            ) : null}
          </span>
        ))}
      </div>
      <p className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="numeros text-base font-bold text-heading">
            <span key={feitas} className={segmentoNovo === null ? undefined : 'mp-numero'}>
              {feitas}
            </span>{' '}
            de {total}
          </strong>{' '}
          feitas
        </span>
        {tudoFeito ? <span className="font-bold text-successtext">Tudo feito hoje</span> : null}
      </p>
    </section>
  )
}

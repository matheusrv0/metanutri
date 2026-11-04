import { ChevronRight } from 'lucide-react'
import { useId } from 'react'
import type { MissaoDoDia } from '@/domain/acompanhamento.ts'
import { cn } from '@/lib/utils'
import { Visto } from './Visto.tsx'

interface LinhaDaMissaoProps {
  readonly missao: MissaoDoDia
  /** A missão acabou de ser marcada por este toque: o círculo pulsa e o visto se desenha (D-1204). */
  readonly acabouDeMarcar: boolean
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
  /** D-1205: a missão de refeição tem "Ver", que abre o Plano na refeição; nulo nas outras. */
  readonly ver: { readonly rotulo: string; readonly aoVer: () => void } | null
}

/**
 * Uma missão de Hoje (D-1203 a D-1205, CA-2203 e CA-2217): um botão de alternar de 64 px, com o nome e o estado para o
 * leitor de tela ("Almoço por volta das 12h, feita"), e o "Ver" de 44 px separado, que nunca marca. Feita, a linha fica
 * no verde de "feita", que não é a cor da marca (CA-1965).
 */
export function LinhaDaMissao({ missao, acabouDeMarcar, aoAlternar, ver }: LinhaDaMissaoProps) {
  const idOrigem = useId()
  return (
    <li
      className={cn(
        'flex items-stretch rounded-2xl border transition-colors ease-[var(--ease-marcar)] motion-reduce:duration-[120ms]',
        missao.feita ? 'border-stateok/40 bg-lightsuccess duration-200' : 'border-border bg-card duration-[120ms]',
      )}
    >
      <button
        type="button"
        aria-pressed={missao.feita}
        aria-label={missao.feita ? `${missao.texto}, feita` : missao.texto}
        aria-describedby={idOrigem}
        onClick={() => aoAlternar(missao.id, !missao.feita)}
        className={cn(
          'flex min-h-16 min-w-0 flex-1 items-start gap-3 rounded-2xl py-3.5 pr-2.5 pl-3.5 text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'transition-transform duration-150 ease-[var(--ease-marcar)] motion-safe:active:scale-[0.98]',
          missao.feita ? 'bg-lightsuccess' : 'bg-card hover:bg-surfacerow',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-px grid size-6.5 shrink-0 place-content-center rounded-full border-2 transition-colors ease-[var(--ease-marcar)]',
            missao.feita ? 'border-stateok bg-stateok text-textoninverse duration-200' : 'border-borderstrong duration-[120ms]',
            missao.feita && acabouDeMarcar ? 'mp-pulso' : null,
          )}
        >
          {missao.feita ? <Visto desenhar={acabouDeMarcar} className="size-3.5" /> : null}
        </span>
        <span className="min-w-0">
          <span className={cn('block text-base leading-snug font-semibold [overflow-wrap:anywhere]', missao.feita ? 'text-successtext line-through' : 'text-heading')}>
            {missao.texto}
          </span>
          {/* CA-2218: com a letra a 200% em 360 px, "Refeição do plano" quebra em vez de empurrar a tela para o lado. */}
          <span id={idOrigem} className="mt-0.5 block text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {missao.origem}
          </span>
        </span>
      </button>
      {ver ? (
        <button
          type="button"
          aria-label={ver.rotulo}
          onClick={ver.aoVer}
          className={cn(
            'my-auto mr-1.5 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-r-xl border-l pr-2 pl-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            missao.feita ? 'border-stateok/40 text-successtext' : 'border-border text-heading hover:underline',
          )}
        >
          Ver
          <ChevronRight className="size-4" aria-hidden="true" strokeWidth={2.5} />
        </button>
      ) : null}
    </li>
  )
}

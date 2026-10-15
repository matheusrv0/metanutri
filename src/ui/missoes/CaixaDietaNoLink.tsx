// A escolha de levar a dieta para o link do paciente (spec dieta-no-link, D-152 e D-153).
import { RefreshCw } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'

interface CaixaDietaNoLinkProps {
  readonly marcada: boolean
  readonly aoMudar: (marcada: boolean) => void
  /** Enquanto o link está sendo salvo. */
  readonly ocupada?: boolean
  /** O plano mudou, no que o paciente vê, desde a cópia que está no link (CA-545). */
  readonly desatualizada?: boolean
  readonly aoAtualizar?: (() => void) | undefined
}

/** A caixa (DP-150): o rótulo inteiro é clicável e tem 44 px de altura. */
export function CaixaDietaNoLink({ marcada, aoMudar, ocupada = false, desatualizada = false, aoAtualizar }: CaixaDietaNoLinkProps) {
  const id = useId()
  return (
    <div className="mt-4 flex flex-col gap-2">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-surfacerow px-4 py-3">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          disabled={ocupada}
          aria-labelledby={`${id}-titulo`}
          aria-describedby={`${id}-texto`}
          onChange={(e) => aoMudar(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={`${id}-titulo`} className="text-sm font-semibold text-heading">
            Mostrar a dieta no link
          </span>
          <span id={`${id}-texto`} className="text-xs text-muted-foreground">
            Refeições em medida caseira, substitutos e orientações. Sem kcal.
          </span>
        </span>
      </label>

      {marcada && desatualizada && aoAtualizar ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-3">
          <p className="min-w-0 flex-1 text-sm text-infotext">O plano mudou. O paciente ainda vê a dieta anterior.</p>
          <Button type="button" size="sm" variant="outline" loading={ocupada} onClick={aoAtualizar}>
            <RefreshCw aria-hidden="true" />
            Atualizar a dieta no link
          </Button>
        </div>
      ) : null}
    </div>
  )
}

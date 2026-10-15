// A escolha de levar a dieta para o link do paciente (spec dieta-no-link, D-152, D-153 e D-159).
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
  /** A cópia que está no link não tem nada para o paciente ver: não existe "dieta anterior" (CA-545). */
  readonly copiaVazia?: boolean
  readonly aoAtualizar?: (() => void) | undefined
  /** CA-544: ligar a dieta num link que já existe espera a confirmação de autorização. */
  readonly pedindoAutorizacao?: boolean
  readonly aoAutorizar?: (() => void) | undefined
  readonly aoDesistir?: (() => void) | undefined
}

/** A caixa (DP-150): o rótulo inteiro é clicável e tem 44 px de altura. */
export function CaixaDietaNoLink({
  marcada,
  aoMudar,
  ocupada = false,
  desatualizada = false,
  copiaVazia = false,
  aoAtualizar,
  pedindoAutorizacao = false,
  aoAutorizar,
  aoDesistir,
}: CaixaDietaNoLinkProps) {
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
            Refeições em medida caseira, substitutos, orientações e receitas. Sem kcal.
          </span>
        </span>
      </label>

      {pedindoAutorizacao && aoAutorizar && aoDesistir ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-3">
          <p className="min-w-48 flex-1 text-sm text-infotext">
            Com a dieta, o link também mostra o plano alimentar a quem tiver o endereço. O paciente autorizou?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={ocupada} onClick={aoAutorizar}>
              Já tenho a autorização, mostrar a dieta
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={aoDesistir}>
              Agora não
            </Button>
          </div>
        </div>
      ) : null}

      {marcada && desatualizada && aoAtualizar ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-3">
          {/* No celular, a frase fica numa linha e o botão vai para baixo dela, em vez de espremer a frase. */}
          <p className="min-w-48 flex-1 text-sm text-infotext">
            {copiaVazia ? 'O paciente ainda não vê a dieta.' : 'O plano mudou. O paciente ainda vê a dieta anterior.'}
          </p>
          <Button type="button" size="sm" variant="outline" loading={ocupada} onClick={aoAtualizar}>
            <RefreshCw aria-hidden="true" />
            Atualizar a dieta no link
          </Button>
        </div>
      ) : null}
    </div>
  )
}

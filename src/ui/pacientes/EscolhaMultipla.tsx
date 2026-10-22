import { Check } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

interface EscolhaMultiplaProps {
  /** O id do rótulo do grupo. */
  readonly rotuloId: string
  readonly opcoes: readonly { readonly valor: string; readonly rotulo: string }[]
  /** Os valores marcados; os que não estão em `opcoes` (id de outra versão) ficam guardados e não aparecem. */
  readonly marcados: readonly string[]
  readonly aoMudar: (marcados: readonly string[]) => void
}

/**
 * Várias escolhas em pílulas, para as restrições e as doenças da ficha (spec ficha-unica, D-351 e D-360). Cada pílula
 * é uma caixa de marcar; o visto aparece junto da cor, para a cor não ser a única informação. 44 px de toque no
 * celular.
 */
export function EscolhaMultipla({ rotuloId, opcoes, marcados, aoMudar }: EscolhaMultiplaProps) {
  const alternar = (valor: string) => aoMudar(marcados.includes(valor) ? marcados.filter((m) => m !== valor) : [...marcados, valor])
  return (
    <div role="group" aria-labelledby={rotuloId} className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const marcada = marcados.includes(opcao.valor)
        return (
          <button
            key={opcao.valor}
            type="button"
            role="checkbox"
            aria-checked={marcada}
            onClick={() => alternar(opcao.valor)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'border-primary bg-lightprimary text-primary' : 'border-borderdefault text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            {marcada ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}

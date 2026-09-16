import { cn } from '@/lib/utils'

interface GrupoOpcoesProps<T extends string> {
  readonly rotulo: string
  readonly opcoes: readonly { readonly valor: T; readonly rotulo: string }[]
  readonly valor: T | null
  readonly aoEscolher: (valor: T) => void
  readonly erro?: string | undefined
}

/** Escolha entre poucas opções, todas visíveis: mais rápido que uma lista suspensa. */
export function GrupoOpcoes<T extends string>({ rotulo, opcoes, valor, aoEscolher, erro }: GrupoOpcoesProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{rotulo}</span>
      <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const marcado = valor === o.valor
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={marcado}
              onClick={() => aoEscolher(o.valor)}
              className={cn(
                'rounded-xs border px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                marcado ? 'border-primary bg-lightprimary text-primary' : 'border-fioforte text-muted-foreground hover:border-primary hover:text-primary',
              )}
            >
              {o.rotulo}
            </button>
          )
        })}
      </div>
      {erro ? (
        <p role="alert" className="text-xs text-errortext">
          {erro}
        </p>
      ) : null}
    </div>
  )
}

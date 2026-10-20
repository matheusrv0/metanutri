import { cn } from '@ds/lib/cn.ts'

interface EscolhaUnicaProps {
  /** O id do rótulo da pergunta (o texto pode ter sido renomeado no roteiro). */
  readonly rotuloId: string
  readonly opcoes: readonly string[]
  /** A opção escolhida; `null` sem resposta. */
  readonly valor: string | null
  /** Tocar de novo na opção marcada apaga a resposta (`null`). */
  readonly aoEscolher: (opcao: string | null) => void
}

/**
 * Escolha única em pílulas, para pergunta da anamnese sem texto livre (spec conduta-da-nutricionista, D-299: o
 * trimestre da gestação). Alvo de 44 px no celular; a pergunta pode ficar sem resposta.
 */
export function EscolhaUnica({ rotuloId, opcoes, valor, aoEscolher }: EscolhaUnicaProps) {
  return (
    <div role="radiogroup" aria-labelledby={rotuloId} className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const marcada = valor === opcao
        return (
          <button
            key={opcao}
            type="button"
            role="radio"
            aria-checked={marcada}
            onClick={() => aoEscolher(marcada ? null : opcao)}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'border-primary bg-lightprimary text-primary' : 'border-borderdefault text-muted-foreground hover:border-primary hover:text-primary',
            )}
          >
            {opcao}
          </button>
        )
      })}
    </div>
  )
}

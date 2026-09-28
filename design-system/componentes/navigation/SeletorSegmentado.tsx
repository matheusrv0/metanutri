import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Escolha entre poucas opções vizinhas, em pílula (referência Spora): mensal ou anual,
 * as etapas do plano, as opções de uma refeição. A opção marcada ganha o fundo branco.
 */
interface SeletorSegmentadoProps<T extends string> {
  readonly rotulo: string
  readonly opcoes: readonly { readonly valor: T; readonly rotulo: ReactNode }[]
  readonly valor: T
  readonly aoEscolher: (valor: T) => void
  readonly className?: string | undefined
}

export function SeletorSegmentado<T extends string>({ rotulo, opcoes, valor, aoEscolher, className }: SeletorSegmentadoProps<T>) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn('inline-flex w-fit gap-1 rounded-full bg-surfacerow p-1', className)}>
      {opcoes.map((opcao) => {
        const marcada = opcao.valor === valor
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            onClick={() => aoEscolher(opcao.valor)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors sm:min-h-9',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'bg-card text-heading shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}

import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Escolha entre poucas opções vizinhas, em pílula (referência Spora): mensal ou anual,
 * as etapas do plano, as opções de uma refeição. A opção marcada ganha o fundo branco.
 *
 * Teclado do grupo de rádio (WAI-ARIA APG, Radio Group): o Tab para uma vez só, na opção
 * marcada (sem nenhuma, na primeira); as setas passam à vizinha, dando a volta, e já
 * escolhem; Home e End vão às pontas (spec antropometria-telas, D-1533).
 */
interface SeletorSegmentadoProps<T extends string> {
  readonly rotulo: string
  readonly opcoes: readonly { readonly valor: T; readonly rotulo: ReactNode }[]
  readonly valor: T
  readonly aoEscolher: (valor: T) => void
  readonly className?: string | undefined
}

/** O passo de cada tecla: 1 a próxima, −1 a anterior; Home e End, as pontas. */
const PASSOS: Readonly<Partial<Record<string, 1 | -1 | 'inicio' | 'fim'>>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  Home: 'inicio',
  End: 'fim',
}

export function SeletorSegmentado<T extends string>({ rotulo, opcoes, valor, aoEscolher, className }: SeletorSegmentadoProps<T>) {
  const marcada = opcoes.findIndex((opcao) => opcao.valor === valor)
  const comFoco = marcada >= 0 ? marcada : 0

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>, atual: number) => {
    const passo = PASSOS[evento.key]
    if (passo === undefined) return
    evento.preventDefault()
    const total = opcoes.length
    const proxima = passo === 'inicio' ? 0 : passo === 'fim' ? total - 1 : (atual + passo + total) % total
    const opcao = opcoes[proxima]
    if (!opcao) return
    evento.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[proxima]?.focus()
    if (opcao.valor !== valor) aoEscolher(opcao.valor)
  }

  return (
    <div role="radiogroup" aria-label={rotulo} className={cn('inline-flex w-fit gap-1 rounded-full bg-surfacerow p-1', className)}>
      {opcoes.map((opcao, i) => {
        const estaMarcada = i === marcada
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={estaMarcada}
            tabIndex={i === comFoco ? 0 : -1}
            onClick={() => aoEscolher(opcao.valor)}
            onKeyDown={(evento) => aoTeclar(evento, i)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors sm:min-h-9 sm:pointer-coarse:min-h-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              estaMarcada ? 'bg-card text-heading shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}

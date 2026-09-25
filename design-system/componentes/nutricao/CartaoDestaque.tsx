import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Cartão de número do painel.
 * `grafite` é o herói — um por tela. `ocre` é "precisa de atenção" e `branco` é o
 * cartão comum. Não há tom colorido: neste sistema a cor pertence ao estado.
 * Nenhuma cor mora aqui: todas vêm de design-system/tokens/tokens.css.
 */
export type TomDestaque = 'branco' | 'grafite' | 'ocre'

interface CartaoDestaqueProps {
  readonly rotulo: string
  readonly valor: string
  readonly apoio: string
  readonly icone: LucideIcon
  readonly tom: TomDestaque
  /** Unidade pequena depois do número: "kcal", "%". */
  readonly unidade?: string | undefined
  readonly aoClicar?: (() => void) | undefined
  /** Conteúdo extra abaixo do número (o herói leva dois botões aqui). */
  readonly children?: ReactNode
}

const TONS: Readonly<Record<TomDestaque, string>> = {
  branco: 'bg-card border border-border text-card-foreground shadow-card',
  grafite: 'bg-[image:var(--gradient-ink)] text-textonink',
  ocre: 'bg-gradient-to-br from-warning to-warningtext text-white',
}

/** No cartão claro o halo branco desaparece; nele o brilho é cinza. */
const HALO: Readonly<Record<TomDestaque, string>> = {
  branco: 'bg-muted',
  grafite: 'bg-white/10',
  ocre: 'bg-white/10',
}

const PASTILHA: Readonly<Record<TomDestaque, string>> = {
  branco: 'bg-muted',
  grafite: 'bg-white/15',
  ocre: 'bg-white/15',
}

export function CartaoDestaque({ rotulo, valor, apoio, icone: Icone, tom, unidade, aoClicar, children }: CartaoDestaqueProps) {
  const Elemento = aoClicar ? 'button' : 'div'
  return (
    <Elemento
      {...(aoClicar ? { type: 'button' as const, onClick: aoClicar } : {})}
      className={cn(
        'relative isolate flex w-full flex-col overflow-hidden rounded-lg p-5 text-left',
        TONS[tom],
        aoClicar &&
          'cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <span aria-hidden="true" className={cn('absolute -right-8 -top-10 -z-10 size-32 rounded-full', HALO[tom])} />
      <span aria-hidden="true" className={cn('absolute -bottom-12 -right-2 -z-10 size-24 rounded-full opacity-70', HALO[tom])} />

      <span className={cn('flex size-9 items-center justify-center rounded-full', PASTILHA[tom])}>
        <Icone className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <div className="mt-4">
        <p className="numeros font-titulo text-3xl font-bold leading-none">
          {valor}
          {unidade ? <span className="ml-1.5 align-super text-sm font-medium">{unidade}</span> : null}
        </p>
        {/* O utilitário `rotulo` fixa a cor apagada do papel; sobre gradiente escuro
            o versalete é remontado aqui para herdar a cor do cartão. */}
        <p className="mt-2 font-titulo text-2xs font-semibold uppercase leading-none tracking-[0.1em] [font-stretch:80%]">{rotulo}</p>
        <p className="mt-1 text-xs leading-snug opacity-85">{apoio}</p>
        {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </Elemento>
  )
}

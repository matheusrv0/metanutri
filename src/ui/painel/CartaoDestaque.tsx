import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TomDestaque = 'verde' | 'escuro' | 'ocre'

interface CartaoDestaqueProps {
  readonly rotulo: string
  readonly valor: string
  readonly apoio: string
  readonly icone: LucideIcon
  readonly tom: TomDestaque
  readonly aoClicar?: (() => void) | undefined
}

/** Gradiente diagonal com um halo no canto: o cartão de número do painel. */
const TONS: Readonly<Record<TomDestaque, string>> = {
  verde: 'from-primary to-primaryemphasis text-primary-foreground',
  escuro: 'from-lombada to-[#1d4a2c] text-lombadatexto',
  ocre: 'from-warning to-warningtext text-white',
}

export function CartaoDestaque({ rotulo, valor, apoio, icone: Icone, tom, aoClicar }: CartaoDestaqueProps) {
  const Elemento = aoClicar ? 'button' : 'div'
  return (
    <Elemento
      {...(aoClicar ? { type: 'button' as const, onClick: aoClicar } : {})}
      className={cn(
        'relative isolate flex w-full flex-col overflow-hidden rounded-md bg-gradient-to-br p-5 text-left',
        TONS[tom],
        aoClicar && 'cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <span aria-hidden="true" className="absolute -right-8 -top-10 -z-10 size-32 rounded-full bg-white/10" />
      <span aria-hidden="true" className="absolute -bottom-12 -right-2 -z-10 size-24 rounded-full bg-white/[0.07]" />

      <span className="flex size-9 items-center justify-center rounded-md bg-white/15">
        <Icone className="size-5" aria-hidden="true" />
      </span>

      <div className="mt-4">
        <p className="numeros font-titulo text-3xl font-bold leading-none">{valor}</p>
        {/* O utilitário `rotulo` fixa a cor apagada do papel; sobre gradiente escuro
            o versalete é remontado aqui para herdar o branco do cartão. */}
        <p className="mt-2 font-titulo text-[11px] font-semibold uppercase leading-none tracking-[0.1em] [font-stretch:80%]">{rotulo}</p>
        <p className="mt-1 text-xs leading-snug opacity-85">{apoio}</p>
      </div>
    </Elemento>
  )
}

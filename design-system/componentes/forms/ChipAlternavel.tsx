import * as React from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Ficha que liga e desliga, para escolher vários de uma lista curta (os nutrientes da busca de substitutos). O desenho é
 * o do GrupoOpcoes: contorno quando desligada, tinta diluída da marca quando ligada; o "+" vira "✓". 44 px no celular e
 * no toque do tablet (D-802).
 */
export interface ChipAlternavelProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'> {
  readonly ligado: boolean
  readonly aoAlternar: () => void
}

export function ChipAlternavel({ ligado, aoAlternar, className, children, ...props }: ChipAlternavelProps) {
  return (
    <button
      type="button"
      aria-pressed={ligado}
      onClick={aoAlternar}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 max-sm:min-h-11 sm:pointer-coarse:min-h-11',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ligado ? 'border-primary bg-lightprimary text-primary' : 'border-borderdefault text-foreground hover:border-primary hover:text-primary',
        className,
      )}
      {...props}
    >
      {children}
      {ligado ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <Plus className="size-3.5 shrink-0" aria-hidden="true" />}
    </button>
  )
}

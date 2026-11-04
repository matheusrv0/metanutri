import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'
import { comToque } from '@ds/lib/toque.ts'

/*
 * A lista de escolha do navegador (`<select>`), com o desenho do Input: 44 px e letra de 16 px no celular e no toque,
 * 40 px e 14 px com mouse a partir de 640 px (D-311, M-018). É a lista que o app já usa nas telas de trabalho: no
 * celular abre a do aparelho, e dezenas delas numa tela não pesam como a lista suspensa do Radix (`Select`). A seta é
 * desenho; o clique e o teclado continuam no `<select>`.
 */
export type ListaNativaProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const ListaNativa = React.forwardRef<HTMLSelectElement, ListaNativaProps>(({ className, children, ...props }, ref) => (
  <span className="relative block min-w-0">
    <select
      ref={ref}
      className={comToque(
        cn(
          'flex h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border border-input bg-card py-1.5 pr-9 pl-3 text-base text-foreground transition-colors sm:h-10 sm:text-sm',
          'hover:border-borderstrong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-50',
          className,
        ),
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
  </span>
))
ListaNativa.displayName = 'ListaNativa'

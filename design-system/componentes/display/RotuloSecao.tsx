import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/** Rótulo de seção da referência Spora: versalete pequeno com o ponto laranja da marca. */
export function RotuloSecao({ children, className }: { readonly children: ReactNode; readonly className?: string | undefined }) {
  return (
    <p className={cn('flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.08em] text-foreground', className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-laranja" />
      {children}
    </p>
  )
}

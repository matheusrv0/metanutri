import { cn } from '@/lib/utils'

/**
 * O visto da missão feita (D-1204). Desenhado no traço (o `path` tem 18 de comprimento): marcado agora, ele se desenha em
 * 220 ms (`mp-visto`, em movimento.css); com "reduzir movimento", aparece pronto.
 */
export function Visto({ desenhar, className }: { readonly desenhar: boolean; readonly className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn(desenhar ? 'mp-visto' : null, className)}>
      <path d="M4.5 10.5l3.8 3.8L15.5 6.5" />
    </svg>
  )
}

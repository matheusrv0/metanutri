import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@ds/lib/cn.ts'

/*
 * Selo. As variantes light* carregam o estado da adequação:
 * lightSuccess = dentro · lightWarning = abaixo · lightError = acima do limite
 * · lightInfo = referência/fonte. solid/accent/outline são ênfase de marca.
 */
export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'border-primary bg-primary text-primary-foreground',
      lightPrimary: 'border-primary/30 bg-lightprimary text-primary',
      lightSuccess: 'border-success/35 bg-lightsuccess text-successtext',
      lightWarning: 'border-warning/40 bg-lightwarning text-warningtext',
      lightError: 'border-error/35 bg-lighterror text-errortext',
      lightInfo: 'border-info/30 bg-lightinfo text-infotext',
      muted: 'border-border bg-muted text-muted-foreground',
      solid: 'border-transparent bg-surfaceinverse text-surfaceaccent',
      accent: 'border-transparent bg-surfaceaccent text-textonaccent',
      outline: 'border-borderdefault bg-transparent text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Ponto da cor do próprio selo antes do texto (usado nas legendas de estado). */
  dot?: boolean
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

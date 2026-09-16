import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva('inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'border-primary bg-primary text-primary-foreground',
      lightPrimary: 'border-primary/30 bg-lightprimary text-primary',
      lightSuccess: 'border-success/35 bg-lightsuccess text-successtext',
      lightWarning: 'border-warning/40 bg-lightwarning text-warningtext',
      lightError: 'border-error/35 bg-lighterror text-errortext',
      lightInfo: 'border-info/30 bg-lightinfo text-infotext',
      muted: 'border-border bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

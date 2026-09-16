import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'bg-primary text-white',
      lightPrimary: 'bg-lightprimary text-primary',
      lightSuccess: 'bg-lightsuccess text-successtext',
      lightWarning: 'bg-lightwarning text-warningtext',
      lightError: 'bg-lighterror text-errortext',
      lightInfo: 'bg-lightinfo text-infotext',
      muted: 'bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

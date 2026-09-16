import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const alertVariants = cva('relative flex w-full gap-3 rounded-xs border px-3 py-2.5 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      info: 'border-info/30 bg-lightinfo text-infotext',
      warning: 'border-warning/40 bg-lightwarning text-warningtext',
      error: 'border-error/35 bg-lighterror text-errortext',
      success: 'border-success/35 bg-lightsuccess text-successtext',
    },
  },
  defaultVariants: { variant: 'info' },
})

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />
}

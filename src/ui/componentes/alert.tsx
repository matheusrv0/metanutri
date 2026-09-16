import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const alertVariants = cva('relative flex w-full gap-3 rounded-2xl px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      info: 'bg-lightinfo text-infotext',
      warning: 'bg-lightwarning text-warningtext',
      error: 'bg-lighterror text-errortext',
      success: 'bg-lightsuccess text-successtext',
    },
  },
  defaultVariants: { variant: 'info' },
})

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />
}

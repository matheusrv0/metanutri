import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@ds/lib/cn.ts'

/*
 * Barra de percentual: 8 px, pílula, sem fio. O trilho é cinza claro e o
 * preenchimento carrega o estado — cor aqui sempre significa alguma coisa.
 */
export const progressIndicatorVariants = cva('h-full w-full flex-1 rounded-full transition-transform duration-500', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-stateok',
      warning: 'bg-statelow',
      error: 'bg-statehigh',
      info: 'bg-stateinfo',
      muted: 'bg-muted-foreground/40',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface ProgressProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'value'>,
    VariantProps<typeof progressIndicatorVariants> {
  /** 0 a 100; acima de 100 a barra fica cheia. */
  value: number
}

export const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(({ className, value, variant, ...props }, ref) => {
  const limitado = Math.max(0, Math.min(100, value))
  return (
    <ProgressPrimitive.Root ref={ref} value={limitado} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-bordersubtle', className)} {...props}>
      <ProgressPrimitive.Indicator className={progressIndicatorVariants({ variant })} style={{ transform: `translateX(-${100 - limitado}%)` }} />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

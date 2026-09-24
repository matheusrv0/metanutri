import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@ds/lib/cn.ts'

/*
 * Cartão: superfície branca, raio 16, fio de 1 px e sombra macia.
 *   default  o cartão de sempre
 *   sunken   painel interno cinza, sem fio nem sombra
 *   flat     sem sombra (dentro de outro cartão)
 *   sheen    painel de vitrine, gradiente cinza e raio 28
 * `tight` aperta o respiro para listas densas.
 */
export const cardVariants = cva('text-card-foreground flex flex-col min-w-0', {
  variants: {
    variant: {
      default: 'bg-card border border-border rounded-lg shadow-card',
      sunken: 'bg-surfacesunken rounded-md',
      flat: 'bg-card border border-border rounded-lg',
      sheen: 'rounded-2xl bg-[image:var(--gradient-sheen)] shadow-[var(--shadow-inset-sheen)]',
    },
    tight: { true: 'gap-3 p-3.5', false: 'gap-4 p-5' },
  },
  defaultVariants: { variant: 'default', tight: false },
})

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, tight, ...props }: CardProps) {
  return <div data-slot="card" className={cn(cardVariants({ variant, tight }), className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1 border-b border-borderdefault pb-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-slot="card-title" className={cn('card-title leading-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn(className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-footer" className={cn('flex items-center gap-2', className)} {...props} />
}

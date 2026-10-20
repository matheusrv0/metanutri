import * as React from 'react'
import { cn } from '@ds/lib/cn.ts'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      // Letra de 16 px no celular, para o iPhone não aproximar a tela (spec integracao-rodada-1910, D-311).
      'flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground sm:text-sm',
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

import * as React from 'react'
import { cn } from '@ds/lib/cn.ts'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// autoComplete desligado por padrão: fora do login a sugestão do navegador só atrapalha
// (nome de paciente vira endereço, CRN vira CEP). E-mail e senha passam o próprio valor.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', autoComplete = 'off', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    autoComplete={autoComplete}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
      'aria-[invalid=true]:border-error',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

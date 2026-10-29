import * as React from 'react'
import { cn } from '@ds/lib/cn.ts'
import { comToque } from '@ds/lib/toque.ts'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// autoComplete desligado por padrão: fora do login a sugestão do navegador só atrapalha
// (nome de paciente vira endereço, CRN vira CEP). E-mail e senha passam o próprio valor.
// Abaixo de 640 px, 44 px e letra de 16 px: o iPhone não aproxima a tela ao tocar no campo; a partir de 640 px, 40 px e
// 14 px com mouse (spec integracao-rodada-1910, D-311). Quem muda a altura ou a letra diz também a de 640 px para cima
// (`sm:`), senão volta aos 40 px no computador (D-312).
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', autoComplete = 'off', ...props }, ref) => {
  // M-018: no toque, a partir de 640 px, volta aos 44 px e à letra de 16 px (design-system/lib/toque.ts).
  const classes = comToque(
    cn(
      'flex h-11 w-full rounded-md border border-input bg-card px-3 py-1.5 text-base text-foreground placeholder:text-muted-foreground transition-colors sm:h-10 sm:text-sm',
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
      'aria-[invalid=true]:border-error',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    ),
  )
  return <input ref={ref} type={type} autoComplete={autoComplete} className={classes} {...props} />
})
Input.displayName = 'Input'

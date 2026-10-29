import * as React from 'react'
import { cn } from '@ds/lib/cn.ts'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/*
 * M-018 (spec ajustes-mobile): a densidade de computador (40 px e 14 px) é para o mouse. No toque (`pointer-coarse`, o
 * tablet), a partir de 640 px o campo volta aos 44 px e à letra de 16 px. A volta só entra onde a classe de computador
 * ficou depois do `cn`: quem troca a altura ou a letra no `sm:` (D-312), como o campo do código (CA-978), manda também
 * no tablet. Uma classe fixa não serviria: o CSS de `sm:pointer-coarse:` vem depois do `sm:` de quem usa o campo.
 */
const DE_VOLTA_NO_TOQUE: Readonly<Record<string, string>> = {
  'sm:h-10': 'sm:pointer-coarse:h-11',
  'sm:text-sm': 'sm:pointer-coarse:text-base',
}

// autoComplete desligado por padrão: fora do login a sugestão do navegador só atrapalha
// (nome de paciente vira endereço, CRN vira CEP). E-mail e senha passam o próprio valor.
// Abaixo de 640 px, 44 px e letra de 16 px: o iPhone não aproxima a tela ao tocar no campo; a partir de 640 px, 40 px e
// 14 px com mouse (spec integracao-rodada-1910, D-311). Quem muda a altura ou a letra diz também a de 640 px para cima
// (`sm:`), senão volta aos 40 px no computador (D-312).
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', autoComplete = 'off', ...props }, ref) => {
  const classes = cn(
    'flex h-11 w-full rounded-md border border-input bg-card px-3 py-1.5 text-base text-foreground placeholder:text-muted-foreground transition-colors sm:h-10 sm:text-sm',
    'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring',
    'aria-[invalid=true]:border-error',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )
  const noToque = classes.split(' ').flatMap((c) => DE_VOLTA_NO_TOQUE[c] ?? [])
  return <input ref={ref} type={type} autoComplete={autoComplete} className={cn(classes, noToque)} {...props} />
})
Input.displayName = 'Input'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

interface FlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode
  /** `cheio` pinta o botão de verde; `linha` fica discreto até o toque. */
  readonly tom?: 'cheio' | 'linha'
  readonly tamanho?: 'md' | 'sm'
}

/**
 * Botão de ação principal: um círculo cresce do centro e toma o botão, a cor
 * inverte e a pílula vira canto de 12 px.
 *
 * Adaptado de FlowButton (21st.dev) sem as setas, como pedido. Sem elas, o
 * deslize do texto perdeu a função — ele existia só para abrir espaço — então saiu.
 */
export function FlowButton({ children, className, tom = 'cheio', tamanho = 'md', type = 'button', ...props }: FlowButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        'group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full',
        'border-[1.5px] font-semibold tracking-[0.01em]',
        'transition-[color,border-color,border-radius] duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:rounded-xl hover:border-transparent focus-visible:rounded-xl focus-visible:border-transparent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
        tamanho === 'md' ? 'min-h-12 px-8 text-[15px]' : 'min-h-10 px-5 text-sm',
        tom === 'cheio'
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-borderdefault bg-transparent text-heading hover:text-background focus-visible:text-background',
        className,
      )}
    >
      {/* O círculo que preenche. Fora do fluxo, então não empurra o texto. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0',
          'transition-[width,height,opacity] duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)]',
          'group-hover:size-[28rem] group-hover:opacity-100 group-focus-visible:size-[28rem] group-focus-visible:opacity-100',
          tom === 'cheio' ? 'bg-primaryemphasis' : 'bg-heading',
        )}
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

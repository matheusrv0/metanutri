import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Botão pílula do sistema (referência Spora, 28/09/2026).
 *   default      teal da marca (ação principal)   laranja   acento da marca (chamar para começar)
 *   secondary    azul de nota                     soft      teal diluído
 *   outline      fio, fundo do cartão              ghost   sem moldura
 *   lightprimary tinta diluída                     link    só texto sublinhado
 *   destructive  vermelhão                         lighterror vermelhão diluído
 * No celular todo botão tem pelo menos 44 px de altura (spec estilo-spora, CA-108).
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primaryemphasis',
        laranja: 'bg-acentofundo text-textoacento hover:brightness-110',
        accent: 'bg-surfaceaccent text-textonaccent hover:brightness-95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondaryemphasis',
        destructive: 'bg-error text-white hover:bg-erroremphasis',
        outline: 'border border-borderdefault bg-card text-foreground hover:border-primary hover:text-primary',
        soft: 'bg-surfaceaccentsoft text-textstrong hover:brightness-95',
        lightprimary: 'border border-primary/30 bg-lightprimary text-primary hover:bg-primary hover:text-primary-foreground',
        lighterror: 'bg-lighterror text-errortext hover:bg-error hover:text-white',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2 sm:h-10',
        sm: 'h-11 px-3.5 text-xs sm:h-8',
        lg: 'h-12 px-7',
        icon: 'size-11 px-0 sm:size-10',
        iconsm: 'size-11 px-0 sm:size-8',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'default', size: 'default', block: false },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Mostra a roda e bloqueia o clique enquanto a ação não termina. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, type, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      >
        {loading && !asChild ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

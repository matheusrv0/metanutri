import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

interface TextHighlightProps {
  readonly children: ReactNode
  readonly className?: string
  readonly delay?: number
  readonly duration?: number
  /** Cor do traço. Por padrão o marca-texto do tema, que acompanha claro e escuro. */
  readonly cor?: string
}

/**
 * Marca-texto que corre da esquerda, como alguém grifa no livro.
 * Adaptado de TextHighlight (21st.dev): a cor sai do token do tema, e o traço
 * fica atrás do texto para não lavar a leitura.
 */
export function TextHighlight({ children, className, delay = 0.25, duration = 0.6, cor }: TextHighlightProps) {
  const semMovimento = useReducedMotion()

  return (
    <span className={cn('relative inline-block pb-0.5', className)}>
      <motion.span
        aria-hidden="true"
        className="absolute -inset-x-0.5 bottom-0 -z-10 h-[0.42em] rounded-xs"
        style={{ backgroundColor: cor ?? 'var(--surface-accent)', transformOrigin: 'left' }}
        initial={{ scaleX: semMovimento ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={semMovimento ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] }}
      />
      <span className="relative">{children}</span>
    </span>
  )
}

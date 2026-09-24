import { motion, useInView, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type ElementType, type ReactNode, type RefObject } from 'react'

interface TimelineContentProps {
  readonly children: ReactNode
  /** Posição na sequência: multiplica o atraso e escalona a entrada. */
  readonly animationNum: number
  /** Mantido por compatibilidade com o componente original; a observação é do próprio bloco. */
  readonly timelineRef?: RefObject<HTMLElement | null>
  readonly customVariants?: Variants
  readonly className?: string
  readonly as?: ElementType
}

const PADRAO: Variants = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
  hidden: { filter: 'blur(8px)', y: -16, opacity: 0 },
}

/** Rede de segurança: sem IntersectionObserver (ou em captura de tela), o conteúdo aparece assim mesmo. */
const ESPERA_MAXIMA_MS = 1200

/**
 * Entrada escalonada quando o bloco chega na tela.
 * Duas garantias: nunca fica preso invisível, e com `prefers-reduced-motion` nada se move.
 */
export function TimelineContent({ children, animationNum, customVariants, className, as }: TimelineContentProps) {
  const proprio = useRef<HTMLDivElement>(null)
  const naTela = useInView(proprio, { once: true, amount: 0.15, margin: '0px 0px -10% 0px' })
  const semMovimento = useReducedMotion()
  const [liberado, setLiberado] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setLiberado(true), ESPERA_MAXIMA_MS)
    return () => clearTimeout(id)
  }, [])

  if (semMovimento) {
    const Simples = (as ?? 'div') as ElementType
    return <Simples className={className}>{children}</Simples>
  }

  const Componente = motion[(as ?? 'div') as 'div']

  return (
    <Componente
      ref={proprio}
      className={className}
      custom={animationNum}
      variants={customVariants ?? PADRAO}
      initial="hidden"
      animate={naTela || liberado ? 'visible' : 'hidden'}
    >
      {children}
    </Componente>
  )
}

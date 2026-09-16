import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import * as React from 'react'
import { cn } from '@/lib/utils'

const DURACAO_PREENCHIMENTO = 0.5
const CURVA = [0.16, 1, 0.3, 1] as const

type AtributosBotao = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onAnimationStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDragStart'
  | 'onDrop'
>

/** Diâmetro do círculo que cobre o botão inteiro a partir do ponto clicado. */
function diametroDeCobertura(largura: number, altura: number, x: number, y: number) {
  return Math.ceil(
    2 * Math.max(Math.hypot(x, y), Math.hypot(largura - x, y), Math.hypot(x, altura - y), Math.hypot(largura - x, altura - y)),
  )
}

function ligarRef<T>(ref: React.ForwardedRef<T>, valor: T | null) {
  if (typeof ref === 'function') {
    ref(valor)
    return
  }
  // O tipo do ref encaminhado é somente leitura, mas escrever nele é justamente o contrato.
  if (ref) (ref as React.MutableRefObject<T | null>).current = valor
}

function temTexto(no: React.ReactNode): boolean {
  if (typeof no === 'string' || typeof no === 'number') return String(no).trim().length > 0
  if (Array.isArray(no)) return no.some(temTexto)
  if (React.isValidElement<{ children?: React.ReactNode }>(no)) return temTexto(no.props.children)
  return false
}

export interface OriginButtonProps extends AtributosBotao {
  readonly children?: React.ReactNode
  readonly loading?: boolean
  /** `verde` usa a cor de ação do sistema; `contorno` fica discreto até o toque. */
  readonly tom?: 'verde' | 'contorno'
}

/**
 * Botão de destaque: a cor preenche a partir do ponto que você tocou.
 * Usado só onde a ação é a principal da tela — na área pública e no topo do painel.
 */
export const OriginButton = React.forwardRef<HTMLButtonElement, OriginButtonProps>(function OriginButton(
  {
    children,
    className,
    disabled = false,
    loading = false,
    tom = 'verde',
    type = 'button',
    onBlur,
    onClick,
    onFocus,
    onKeyDown,
    onKeyUp,
    onPointerCancel,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
    onPointerUp,
    ...props
  },
  ref,
) {
  const botaoRef = React.useRef<HTMLButtonElement | null>(null)
  const desativado = Boolean(disabled || loading)
  const [sobre, setSobre] = React.useState(false)
  const [pressionado, setPressionado] = React.useState(false)
  const [origem, setOrigem] = React.useState({ x: 0, y: 0 })
  const [tamanho, setTamanho] = React.useState(0)
  const semMovimento = useReducedMotion()

  const rotulo = props['aria-label']
  const rotuladoPor = props['aria-labelledby']

  React.useEffect(() => {
    if (!import.meta.env.DEV) return
    if (temTexto(children) || rotulo?.trim() || rotuladoPor?.trim()) return
    console.warn('OriginButton: dê um texto visível ou aria-label, senão o botão não tem nome acessível.')
  }, [rotulo, rotuladoPor, children])

  const atualizarOrigem = React.useCallback((x: number, y: number) => {
    const no = botaoRef.current
    if (!no) return
    const caixa = no.getBoundingClientRect()
    setOrigem({ x, y })
    setTamanho(diametroDeCobertura(caixa.width, caixa.height, x, y))
  }, [])

  const origemPeloPonteiro = React.useCallback(
    (evento: React.PointerEvent<HTMLButtonElement>) => {
      const caixa = evento.currentTarget.getBoundingClientRect()
      atualizarOrigem(evento.clientX - caixa.left, evento.clientY - caixa.top)
    },
    [atualizarOrigem],
  )

  const origemPeloCentro = React.useCallback(() => {
    const no = botaoRef.current
    if (!no) return
    const caixa = no.getBoundingClientRect()
    atualizarOrigem(caixa.width / 2, caixa.height / 2)
  }, [atualizarOrigem])

  const preencher = !desativado && (sobre || pressionado)

  React.useLayoutEffect(() => {
    const no = botaoRef.current
    if (!no || !preencher) return
    const medir = () => {
      const caixa = no.getBoundingClientRect()
      setTamanho(diametroDeCobertura(caixa.width, caixa.height, origem.x, origem.y))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(no)
    return () => observador.disconnect()
  }, [preencher, origem.x, origem.y])

  const juntarRefs = React.useCallback(
    (no: HTMLButtonElement | null) => {
      botaoRef.current = no
      ligarRef(ref, no)
    },
    [ref],
  )

  return (
    <motion.button
      // `exactOptionalPropertyTypes` recusa o spread direto: os atributos opcionais do
      // botão aceitam `undefined`, e a tipagem do motion não.
      {...(props as HTMLMotionProps<'button'>)}
      {...(loading ? { 'aria-busy': true as const } : {})}
      {...(desativado || semMovimento ? {} : { whileTap: { scale: 0.985 } })}
      className={cn(
        'relative inline-flex h-11 cursor-pointer touch-manipulation select-none items-center justify-center overflow-hidden rounded-xs px-6 font-medium text-[15px] tracking-[0.01em]',
        'border border-fioforte bg-card text-heading',
        'transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        preencher && 'text-primary-foreground',
        className,
      )}
      data-pressionado={pressionado ? 'true' : 'false'}
      disabled={desativado}
      onBlur={(evento) => {
        onBlur?.(evento)
        setPressionado(false)
        if (!evento.defaultPrevented) setSobre(false)
      }}
      onClick={onClick}
      onFocus={(evento) => {
        onFocus?.(evento)
        if (desativado || evento.defaultPrevented) return
        if (evento.currentTarget.matches(':focus-visible')) {
          origemPeloCentro()
          setSobre(true)
        }
      }}
      onKeyDown={(evento) => {
        onKeyDown?.(evento)
        if (evento.defaultPrevented || desativado || evento.repeat || (evento.key !== ' ' && evento.key !== 'Enter')) return
        if (evento.key === ' ') evento.preventDefault()
        origemPeloCentro()
        setPressionado(true)
        setSobre(true)
      }}
      onKeyUp={(evento) => {
        onKeyUp?.(evento)
        if (evento.key === ' ' || evento.key === 'Enter') {
          setPressionado(false)
          if (!evento.currentTarget.matches(':focus-visible')) setSobre(false)
        }
      }}
      onPointerCancel={(evento) => {
        onPointerCancel?.(evento)
        setPressionado(false)
      }}
      onPointerDown={(evento) => {
        onPointerDown?.(evento)
        if (evento.defaultPrevented || desativado || evento.button !== 0) return
        origemPeloPonteiro(evento)
        setPressionado(true)
        setSobre(true)
      }}
      onPointerEnter={(evento) => {
        onPointerEnter?.(evento)
        if (desativado || evento.defaultPrevented) return
        origemPeloPonteiro(evento)
        setSobre(true)
      }}
      onPointerLeave={(evento) => {
        onPointerLeave?.(evento)
        setSobre(false)
        setPressionado(false)
      }}
      onPointerUp={(evento) => {
        onPointerUp?.(evento)
        setPressionado(false)
      }}
      ref={juntarRefs}
      type={type}
    >
      <motion.span
        animate={{ scale: preencher && tamanho > 0 ? 1 : 0 }}
        aria-hidden="true"
        className={cn('pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full', tom === 'verde' ? 'bg-primary' : 'bg-heading')}
        initial={false}
        style={{ height: tamanho, left: origem.x, top: origem.y, width: tamanho }}
        transition={semMovimento ? { duration: 0 } : { duration: DURACAO_PREENCHIMENTO, ease: CURVA }}
      />
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  )
})

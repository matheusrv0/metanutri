import { motion, useReducedMotion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AuroraBackgroundProps {
  readonly className?: string
  readonly children?: ReactNode
  /** Quantidade de pontos de luz. Zero desliga. */
  readonly estrelas?: number
  /** Duas cores dos halos radiais. */
  readonly cores?: readonly [string, string]
  readonly duracaoPulso?: number
  readonly rotuloAcessivel?: string
}

/**
 * Ruído determinístico: a mesma estrela cai sempre no mesmo lugar.
 * `Math.random` não pode rodar na renderização — daria posição diferente a cada atualização.
 */
function ruido(semente: number): number {
  const x = Math.sin(semente * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function useEstrelas(quantidade: number) {
  return useMemo(
    () =>
      Array.from({ length: quantidade }, (_, i) => ({
        id: i,
        esquerda: ruido(i + 1) * 100,
        topo: ruido(i + 57) * 100,
        brilho: ruido(i + 113) * 0.7 + 0.1,
        duracao: ruido(i + 191) * 3 + 2,
        atraso: ruido(i + 271) * 5,
      })),
    [quantidade],
  )
}

/**
 * Fundo escuro com halos em movimento. Vive só na área pública (início, preços, entrar):
 * tela de trabalho com tabela de nutriente continua em papel claro, que é onde se lê.
 */
export function AuroraBackground({
  className,
  children,
  estrelas = 50,
  cores = ['var(--aurora-um, rgba(11,110,51,0.30))', 'var(--aurora-dois, rgba(79,70,229,0.22))'],
  duracaoPulso = 10,
  rotuloAcessivel = 'Fundo animado',
}: AuroraBackgroundProps) {
  const semMovimento = useReducedMotion()
  const pontos = useEstrelas(semMovimento ? 0 : estrelas)
  const [corA, corB] = cores

  return (
    <div
      role="img"
      aria-label={rotuloAcessivel}
      className={cn('relative flex w-full flex-col items-center justify-center overflow-hidden bg-lombada text-lombadatexto', className)}
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, ${corA} 0%, transparent 70%), radial-gradient(circle at 75% 75%, ${corB} 0%, transparent 70%)`,
            backgroundSize: '100% 100%',
            animation: semMovimento ? undefined : `pulso-aurora ${duracaoPulso}s ease-in-out infinite`,
          }}
        />

        {semMovimento ? null : (
          <motion.div className="absolute inset-0 mix-blend-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
            <motion.div
              className="absolute -left-1/4 -top-1/4 size-1/2 rounded-full bg-primary opacity-30 blur-3xl"
              animate={{ x: [-50, 50, -50], y: [-20, 20, -20], scale: [1, 1.2, 1] }}
              transition={{ duration: 30, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-1/4 -right-1/4 size-1/2 rounded-full bg-warning opacity-20 blur-3xl"
              animate={{ x: [50, -50, 50], y: [20, -20, 20], scale: [1, 1.3, 1] }}
              transition={{ duration: 40, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute left-1/3 top-1/3 size-1/3 rounded-full bg-indigo-600 opacity-25 blur-3xl"
              animate={{ x: [20, -20, 20], y: [-30, 30, -30] }}
              transition={{ duration: 50, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {pontos.map((p) => (
          <motion.span
            key={p.id}
            className="absolute size-px rounded-full bg-white"
            style={{ left: `${p.esquerda}%`, top: `${p.topo}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, p.brilho, 0] }}
            transition={{ duration: p.duracao, repeat: Infinity, delay: p.atraso }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full">{children}</div>
    </div>
  )
}

import { useId } from 'react'
import type { DiaDeAtividade } from '@/domain/atividade.ts'

interface GraficoAtividadeProps {
  readonly dias: readonly DiaDeAtividade[]
  readonly maior: number
}

const ALTURA = 120
const LARGURA = 640
const MARGEM_BAIXO = 18

/**
 * Barras dos últimos dias, em SVG puro: nenhuma biblioteca de gráfico entra
 * no pacote por causa de um retângulo por dia.
 */
export function GraficoAtividade({ dias, maior }: GraficoAtividadeProps) {
  const id = useId()
  if (dias.length === 0) return null

  const teto = Math.max(maior, 1)
  const passo = LARGURA / dias.length
  const larguraBarra = Math.max(passo - 6, 4)
  const util = ALTURA - MARGEM_BAIXO

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="h-32 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${id}-titulo`}
      >
        <title id={`${id}-titulo`}>{`Planos mexidos por dia nos últimos ${dias.length} dias. Pico de ${teto} num dia.`}</title>
        <defs>
          <linearGradient id={`${id}-barra`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <line x1="0" y1={util} x2={LARGURA} y2={util} stroke="var(--color-fio)" strokeWidth="1" />

        {dias.map((dia, i) => {
          const altura = dia.planos === 0 ? 2 : Math.max((dia.planos / teto) * (util - 8), 6)
          const x = i * passo + (passo - larguraBarra) / 2
          return (
            <rect
              key={dia.data}
              x={x}
              y={util - altura}
              width={larguraBarra}
              height={altura}
              rx="2"
              fill={dia.planos === 0 ? 'var(--color-fio)' : `url(#${id}-barra)`}
            />
          )
        })}
      </svg>

      <figcaption className="numeros flex justify-between text-xs text-muted-foreground">
        <span>{dias[0]?.rotulo}</span>
        <span>{dias[dias.length - 1]?.rotulo}</span>
      </figcaption>
    </figure>
  )
}

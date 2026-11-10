import type { ReactNode } from 'react'
import { TITULO_DA_GAVETA, type ModoDaGaveta } from '@/domain/iaGaveta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'

interface BotoesDaIaProps {
  /** O "Modelos de plano" da etapa, que fica ao lado (D-1350). */
  readonly modelos: ReactNode
  /** "Adequar com IA" só com o plano preenchido (D-1301). */
  readonly podeAdequar: boolean
  /** CA-2360: por que a IA não pode ser usada neste plano; nulo quando pode. */
  readonly motivo: string | null
  readonly aberta: ModoDaGaveta | null
  /** O botão vai junto: o foco volta a ele quando a gaveta fecha (D-1359). */
  readonly aoAbrir: (modo: ModoDaGaveta, botao: HTMLElement) => void
}

/** D-1301 e D-1350: os botões ao lado de "Modelos de plano", com o motivo do botão desligado na linha de baixo. */
export function BotoesDaIa({ modelos, podeAdequar, motivo, aberta, aoAbrir }: BotoesDaIaProps) {
  const modos: readonly ModoDaGaveta[] = podeAdequar ? ['gerar', 'ajustar'] : ['gerar']
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {modelos}
        {modos.map((modo) => (
          <Button key={modo} variant="outline" size="sm" disabled={motivo !== null} aria-expanded={aberta === modo} onClick={(e) => aoAbrir(modo, e.currentTarget)}>
            {TITULO_DA_GAVETA[modo]}
          </Button>
        ))}
      </div>
      {motivo ? <p className="text-right text-sm text-foreground">{motivo}</p> : null}
    </div>
  )
}

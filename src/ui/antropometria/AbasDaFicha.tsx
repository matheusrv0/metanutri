import { cn } from '@ds/lib/cn.ts'

export type AbaDaFicha = 'ficha' | 'antropometria'

interface AbasDaFichaProps {
  readonly atual: AbaDaFicha
  readonly aoIrPara: (aba: AbaDaFicha) => void
}

const ABAS: readonly { readonly aba: AbaDaFicha; readonly rotulo: string }[] = [
  { aba: 'ficha', rotulo: 'Ficha' },
  { aba: 'antropometria', rotulo: 'Antropometria' },
]

/**
 * As abas da ficha do paciente (spec antropometria-telas, D-1402): "Ficha" (dados, anamnese, conduta e planos, como
 * hoje) e "Antropometria". A marcada leva o fio de baixo na cor da ação e `aria-current="page"`.
 */
export function AbasDaFicha({ atual, aoIrPara }: AbasDaFichaProps) {
  return (
    <nav aria-label="Ficha do paciente" className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
      {ABAS.map(({ aba, rotulo }) => {
        const marcada = aba === atual
        return (
          <button
            key={aba}
            type="button"
            aria-current={marcada ? 'page' : undefined}
            onClick={() => {
              if (!marcada) aoIrPara(aba)
            }}
            className={cn(
              '-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors sm:min-h-10 sm:pointer-coarse:min-h-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'border-primary text-heading' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {rotulo}
          </button>
        )
      })}
    </nav>
  )
}

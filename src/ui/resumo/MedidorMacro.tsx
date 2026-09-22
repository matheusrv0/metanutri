import type { EstadoFaixa, ResultadoMacro } from '@/domain/macros.ts'
import { medirMacro } from '@/domain/medidorMacro.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'

interface MedidorMacroProps {
  readonly nome: string
  readonly macro: ResultadoMacro
  /** Texto da meta em uso, ex.: "Meta: 10 a 35% (faixa da idade)". */
  readonly meta: string | null
}

const COR_MARCADOR: Readonly<Record<EstadoFaixa, string>> = {
  dentro: 'bg-primary',
  abaixo: 'bg-warning',
  acima: 'bg-error',
}

const COR_FRASE: Readonly<Record<EstadoFaixa, string>> = {
  dentro: 'text-successtext',
  abaixo: 'text-warningtext',
  acima: 'text-errortext',
}

/**
 * Onde o macro está na faixa: um trilho com a faixa recomendada em destaque e o
 * marcador do plano. Muda a cada alimento adicionado, e a frase diz se está perto,
 * longe, dentro ou passou — o que o WebDiet mostra e a estudante pediu.
 */
export function MedidorMacro({ nome, macro, meta }: MedidorMacroProps) {
  const medidor = medirMacro(macro)

  const valores = `${formatarNumero(macro.gramas, 1)} g${macro.pctKcal === null ? '' : ` · ${formatarNumero(macro.pctKcal, 1)}%`}${
    macro.gPorKg === null ? '' : ` · ${formatarNumero(macro.gPorKg, 2)} g/kg`
  }`

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3.5 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{nome}</span>
        <span className="numeros text-sm font-semibold text-heading">{valores}</span>
      </div>

      {medidor ? (
        <>
          <div
            role="img"
            aria-label={`${nome}: ${formatarNumero(medidor.valor, 1)}${medidor.unidade} · faixa de ${medidor.min} a ${medidor.max}${medidor.unidade} · ${medidor.frase}`}
            className="relative h-2.5 rounded-full bg-muted"
          >
            {/* A faixa recomendada: onde o marcador deveria cair. */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 rounded-full bg-lightprimary ring-1 ring-inset ring-primary/30"
              style={{ left: `${medidor.faixaInicio}%`, width: `${Math.max(medidor.faixaFim - medidor.faixaInicio, 1)}%` }}
            />
            {/* O marcador do plano, que anda a cada alimento. */}
            <div
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-card',
                'transition-[left] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                COR_MARCADOR[medidor.estado],
              )}
              style={{ left: `${medidor.posicao}%` }}
            />
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-xs font-medium', COR_FRASE[medidor.estado])}>{medidor.frase}</span>
            {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">{meta ?? 'Sem meta: informe a idade ou defina uma meta.'}</span>
      )}
    </div>
  )
}

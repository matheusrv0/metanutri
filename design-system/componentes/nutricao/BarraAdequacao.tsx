import { estadoDaAdequacao, type EstadoAdequacao } from '@/domain/estadoAdequacao.ts'
import { cn } from '@ds/lib/cn.ts'

interface BarraAdequacaoProps {
  readonly nome: string
  /** Texto pequeno à esquerda do rodapé: "680 de 1.000 mg". */
  readonly detalhe?: string | undefined
  /** `null` quando a tabela não traz o nutriente. */
  readonly pct: number | null
  readonly fonte?: string | undefined
  /** Nutriente com limite superior: passar de 100% já é excesso. */
  readonly temLimite?: boolean
  readonly marca?: string | undefined
}

const COR: Readonly<Record<EstadoAdequacao, string>> = {
  dentro: 'bg-stateok',
  abaixo: 'bg-warning',
  acima: 'bg-error',
  // Hachura: a tabela não mediu. Zero seria mentira.
  semdado: 'w-full bg-[image:var(--pattern-nodata)]',
}

const COR_TEXTO: Readonly<Record<EstadoAdequacao, string>> = {
  dentro: 'text-heading',
  abaixo: 'text-warningtext',
  acima: 'text-errortext',
  semdado: 'font-medium text-muted-foreground',
}

/** O trilho vai até 160% da meta; passou disso, satura. */
export function BarraAdequacao({ nome, detalhe, pct, fonte, temLimite = false, marca }: BarraAdequacaoProps) {
  const estado = estadoDaAdequacao(pct, temLimite)
  const largura = pct === null ? 100 : Math.min(pct, 160) / 1.6

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {nome}
          {marca ? <sup className="ml-0.5 font-semibold text-primary">{marca}</sup> : null}
        </span>
        <span className={cn('numeros text-sm font-semibold', COR_TEXTO[estado])}>{pct === null ? 'sem dado' : `${pct}%`}</span>
      </div>

      <div
        role="img"
        aria-label={`${nome}: ${pct === null ? 'a tabela de composição não traz este nutriente' : `${pct}% da meta`}`}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]', COR[estado])}
          style={pct === null ? undefined : { width: `${largura}%` }}
        />
      </div>

      {detalhe || fonte ? (
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{detalhe}</span>
          <span>{fonte}</span>
        </div>
      ) : null}
    </div>
  )
}

import { ESCALA_DA_URINA } from '@/domain/anamnese.ts'
import { cn } from '@ds/lib/cn.ts'

interface EscalaDaUrinaProps {
  /** O id do rótulo da pergunta (o texto pode ter sido renomeado no roteiro). */
  readonly rotuloId: string
  readonly dicaId?: string | undefined
  /** O número escolhido, de 1 a 8; `null` sem resposta. */
  readonly valor: number | null
  /** Tocar de novo na cor marcada apaga a resposta (`null`). */
  readonly aoEscolher: (numero: number | null) => void
}

/** As cores de dado, por número; a classe inteira, para o Tailwind achar. */
const COR: Readonly<Record<number, string>> = {
  1: 'bg-[var(--urina-1)]',
  2: 'bg-[var(--urina-2)]',
  3: 'bg-[var(--urina-3)]',
  4: 'bg-[var(--urina-4)]',
  5: 'bg-[var(--urina-5)]',
  6: 'bg-[var(--urina-6)]',
  7: 'bg-[var(--urina-7)]',
  8: 'bg-[var(--urina-8)]',
}

/**
 * A cor da urina pela escala de Armstrong (spec conduta-da-nutricionista, D-299): escolha única entre 8 cores, cada uma
 * com o número e o nome escritos, para a cor nunca ser a única informação. Duas linhas de 4 no celular, uma de 8 na
 * tela larga.
 */
export function EscalaDaUrina({ rotuloId, dicaId, valor, aoEscolher }: EscalaDaUrinaProps) {
  return (
    <div role="radiogroup" aria-labelledby={rotuloId} aria-describedby={dicaId} className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {ESCALA_DA_URINA.map(({ numero, nome }) => {
        const marcada = valor === numero
        return (
          <button
            key={numero}
            type="button"
            role="radio"
            aria-checked={marcada}
            aria-label={`${numero} · ${nome}`}
            onClick={() => aoEscolher(marcada ? null : numero)}
            className={cn(
              'flex min-h-11 flex-col items-stretch gap-1.5 rounded-xl border bg-card p-1.5 text-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'border-primary ring-2 ring-primary' : 'border-borderdefault hover:border-primary',
            )}
          >
            <span aria-hidden="true" className={cn('h-7 rounded-md border border-border', COR[numero])} />
            <span aria-hidden="true" className="flex flex-col leading-tight">
              <span className={cn('numeros text-sm font-bold', marcada ? 'text-primary' : 'text-heading')}>{numero}</span>
              <span className="text-xs text-muted-foreground">{nome}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

import type { MedidaCaseira } from '@/domain/busca.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'

/** O valor do seletor para "só gramas"; nenhuma medida tem esse nome. */
const SO_GRAMAS = '__gramas'
/** O valor de "+ Nova medida…" (D-387). */
const NOVA = '__nova'

interface SeletorDeMedidaProps {
  readonly rotulo: string
  /** As medidas do alimento, na ordem do seletor (`medidasDoSeletor`). */
  readonly medidas: readonly MedidaCaseira[]
  /** O nome da medida marcada; `null` = "gramas". */
  readonly valor: string | null
  /** "g" ou "ml" ao lado do peso de cada medida. */
  readonly unidade: string
  readonly aoEscolher: (medida: MedidaCaseira | null) => void
  /** Com ele, o seletor oferece "+ Nova medida…" no fim (spec alimentos-e-gramaturas, D-387). */
  readonly aoCriarMedida?: (() => void) | undefined
  readonly className?: string | undefined
}

/**
 * G3 (spec alimentos-e-gramaturas): "gramas", as medidas da conta (marcadas "sua") e as da POF, cada uma com o peso
 * ("concha · 140 g"). É o select do navegador, como as outras listas de escolha do app.
 */
export function SeletorDeMedida({ rotulo, medidas, valor, unidade, aoEscolher, aoCriarMedida, className }: SeletorDeMedidaProps) {
  return (
    <select
      aria-label={rotulo}
      value={valor ?? SO_GRAMAS}
      onChange={(e) => {
        const escolhido = e.target.value
        if (escolhido === NOVA) {
          aoCriarMedida?.()
          return
        }
        aoEscolher(escolhido === SO_GRAMAS ? null : (medidas.find((m) => m.nome === escolhido) ?? null))
      }}
      className={cn(
        'h-11 min-w-0 rounded-md border border-input bg-card px-2.5 text-base text-foreground sm:h-10 sm:text-sm',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <option value={SO_GRAMAS}>{unidade === 'ml' ? 'ml' : 'gramas'}</option>
      {medidas.map((m) => (
        <option key={`${m.propria === true ? 'p' : 'b'}-${m.nome}`} value={m.nome}>
          {`${m.nome} · ${formatarNumero(m.gramas, m.gramas < 10 && !Number.isInteger(m.gramas) ? 1 : 0)} ${unidade}${m.propria === true ? ' · sua' : ''}`}
        </option>
      ))}
      {aoCriarMedida ? <option value={NOVA}>+ Nova medida…</option> : null}
    </select>
  )
}

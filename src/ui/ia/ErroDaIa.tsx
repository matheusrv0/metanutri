import type { ErroDaIa as Erro } from '@/domain/iaGaveta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'

interface ErroDaIaProps {
  /** Nulo sem erro: a região fica vazia, à espera da frase (D-1364). */
  readonly erro: Erro | null
  /** "Ver planos", no limite do mês. */
  readonly aoVerPlanos: () => void
}

/**
 * CA-2374: uma frase só por erro; no limite do mês, o link "Ver planos" (o botão da ação fica no rodapé). D-1364: a
 * região viva está na gaveta desde que ela abre, vazia, e recebe a frase quando o erro chega: o leitor de tela anuncia.
 */
export function ErroDaIa({ erro, aoVerPlanos }: ErroDaIaProps) {
  return (
    <div className={erro ? 'flex flex-col items-start gap-2.5 py-5' : undefined}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {erro ? <p className="text-sm text-foreground">{erro.frase}</p> : null}
      </div>
      {erro?.acao === 'ver-planos' ? (
        <Button variant="link" size="sm" className="h-auto px-0 max-sm:min-h-11" onClick={aoVerPlanos}>
          Ver planos
        </Button>
      ) : null}
    </div>
  )
}

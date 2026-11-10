import type { ErroDaIa as Erro } from '@/domain/iaGaveta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'

interface ErroDaIaProps {
  readonly erro: Erro
  /** "Ver planos", no limite do mês. */
  readonly aoVerPlanos: () => void
}

/** CA-2374: uma frase só por erro; no limite do mês, o link "Ver planos" (o botão da ação fica no rodapé). */
export function ErroDaIa({ erro, aoVerPlanos }: ErroDaIaProps) {
  return (
    <div role="status" className="flex flex-col items-start gap-2.5 py-5">
      <p className="text-sm text-foreground">{erro.frase}</p>
      {erro.acao === 'ver-planos' ? (
        <Button variant="link" size="sm" className="h-auto px-0 max-sm:min-h-11" onClick={aoVerPlanos}>
          Ver planos
        </Button>
      ) : null}
    </div>
  )
}

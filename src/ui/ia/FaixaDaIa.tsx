import { Check } from 'lucide-react'
import { Button } from '@ds/componentes/forms/button.tsx'

interface FaixaDaIaProps {
  /** "Sugestão da IA no plano, como rascunho." ou "N mudanças aplicadas." */
  readonly texto: string
  readonly aoDesfazer: () => void
}

/** D-1308 e D-1309: a faixa acima das refeições, depois de usar a sugestão ou aplicar as mudanças, com "Desfazer". */
export function FaixaDaIa({ texto, aoDesfazer }: FaixaDaIaProps) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-lightsuccess px-3.5 py-2 text-sm text-foreground">
      <Check className="size-4 shrink-0 text-successtext" strokeWidth={2.5} aria-hidden="true" />
      <span>{texto}</span>
      <Button variant="link" size="sm" className="h-auto px-0 text-sm max-sm:min-h-11" onClick={aoDesfazer}>
        Desfazer
      </Button>
    </p>
  )
}

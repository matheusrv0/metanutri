import { Check } from 'lucide-react'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface AvisoDeTrocaProps {
  /** "Arroz, tipo 1, cozido trocado por Batata, inglesa, cozida, 2 unidades e meia · 350 g. Almoço passou a somar 488 kcal." */
  readonly texto: string
  readonly aoDesfazer: () => void
}

/** CA-2118 e CA-2119 (spec busca-substitutos, D-1113): a troca feita, na refeição dela, com "Desfazer". */
export function AvisoDeTroca({ texto, aoDesfazer }: AvisoDeTrocaProps) {
  return (
    <Alert variant="success" className="items-start">
      <Check aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">
        {texto}{' '}
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 align-baseline text-sm font-semibold text-successtext underline max-sm:min-h-11"
          onClick={aoDesfazer}
        >
          Desfazer
        </Button>
      </p>
    </Alert>
  )
}

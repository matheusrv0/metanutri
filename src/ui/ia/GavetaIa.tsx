import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Sheet, SheetContent, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'

/**
 * Onde a gaveta mora (spec assistente-ia, D-1302 e D-1350): ao lado do plano a partir de 1180 px, no fluxo da página
 * (acima das refeições) de 640 a 1180 px, e na folha de baixo do sistema abaixo de 640 px. Nada flutua por cima do
 * conteúdo fora da folha, que é um diálogo.
 */
export type LugarDaGaveta = 'lado' | 'fluxo' | 'folha'

interface GavetaIaProps {
  readonly titulo: string
  readonly lugar: LugarDaGaveta
  readonly aoFechar: () => void
  readonly corpo: ReactNode
  readonly rodape: ReactNode
}

/** D-1302: o título é o nome do botão que a abriu; o rodapé fica fixo embaixo, com a ação, o motivo e o contador. */
export function GavetaIa({ titulo, lugar, aoFechar, corpo, rodape }: GavetaIaProps) {
  const idTitulo = useId()

  if (lugar === 'folha') {
    return (
      <Sheet open onOpenChange={(aberta) => !aberta && aoFechar()}>
        <SheetContent side="bottom" className="gap-0 p-0" aria-describedby={undefined}>
          <div className="border-b border-bordersubtle px-4 pb-3 pt-4 pr-14">
            <SheetTitle className="text-base">{titulo}</SheetTitle>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">{corpo}</div>
          <div className="border-t border-bordersubtle bg-card px-4 pb-4 pt-3">{rodape}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      aria-labelledby={idTitulo}
      className={cn('flex min-w-0 flex-col rounded-xl border border-bordersubtle bg-card', lugar === 'lado' && 'sticky top-4 max-h-[calc(100dvh-2rem)] self-start')}
    >
      <div className="flex items-center justify-between gap-3 border-b border-bordersubtle py-2 pl-5 pr-2">
        <h2 id={idTitulo} className="text-base font-bold text-heading">
          {titulo}
        </h2>
        <Button variant="ghost" size="iconsm" onClick={aoFechar} aria-label="Fechar">
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className={cn('px-5', lugar === 'lado' && 'min-h-0 flex-1 overflow-y-auto')}>{corpo}</div>
      <div className={cn('rounded-b-xl border-t border-bordersubtle bg-card px-5 pb-4 pt-3', lugar === 'lado' && 'sticky bottom-0')}>{rodape}</div>
    </aside>
  )
}

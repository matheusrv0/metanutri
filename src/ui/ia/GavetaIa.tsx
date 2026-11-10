import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Sheet, SheetContent, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'

/**
 * Onde a gaveta mora (spec assistente-ia, D-1302, D-1350 e D-1357): ao lado do plano a partir de 1180 px, no fluxo da
 * página (logo abaixo da linha de "Modelos de plano", acima das refeições) de 640 a 1180 px, e na folha de baixo do sistema abaixo de 640 px. Nada flutua por cima do
 * conteúdo fora da folha, que é um diálogo.
 */
export type LugarDaGaveta = 'lado' | 'fluxo' | 'folha'

interface GavetaIaProps {
  readonly titulo: string
  readonly lugar: LugarDaGaveta
  readonly aoFechar: () => void
  /** O botão que abriu a gaveta: o foco volta a ele quando ela fecha (D-1359). */
  readonly quemAbriu?: RefObject<HTMLElement | null> | undefined
  readonly corpo: ReactNode
  readonly rodape: ReactNode
}

/**
 * D-1302: o título é o nome do botão que a abriu; o rodapé fica fixo embaixo, com a ação, o motivo e o contador. Ao lado
 * e no fluxo, o foco vai ao título quando ela abre (D-1357); a folha é um diálogo e leva o foco sozinha.
 */
export function GavetaIa({ titulo, lugar, aoFechar, quemAbriu, corpo, rodape }: GavetaIaProps) {
  const idTitulo = useId()
  const refTitulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    refTitulo.current?.focus()
  }, [titulo])
  // D-1359: fechada (o X, "Fechar", "Usar como rascunho"…), o foco que ficou sem lugar volta ao botão que a abriu.
  useEffect(
    () => () => {
      const ativo = globalThis.document?.activeElement
      if (!ativo || ativo === globalThis.document.body) quemAbriu?.current?.focus()
    },
    [quemAbriu],
  )
  const devolverFoco = (evento: Event) => {
    // A folha não tem gatilho do Radix (ela é controlada): sem isto, o foco cairia no corpo da página.
    evento.preventDefault()
    quemAbriu?.current?.focus()
  }

  if (lugar === 'folha') {
    return (
      <Sheet open onOpenChange={(aberta) => !aberta && aoFechar()}>
        <SheetContent side="bottom" className="gap-0 p-0" aria-describedby={undefined} onCloseAutoFocus={devolverFoco}>
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
      className={cn('flex min-w-0 flex-col rounded-xl border border-bordersubtle bg-card', lugar === 'lado' && 'self-start')}
    >
      <div className="flex items-center justify-between gap-3 border-b border-bordersubtle py-2 pl-5 pr-2">
        <h2 id={idTitulo} ref={refTitulo} tabIndex={-1} className="rounded-sm text-base font-bold text-heading outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {titulo}
        </h2>
        <Button variant="ghost" size="iconsm" onClick={aoFechar} aria-label="Fechar">
          <X aria-hidden="true" />
        </Button>
      </div>
      <div className="px-5">{corpo}</div>
      {/* Como no protótipo: o rodapé fica preso ao pé da tela enquanto a gaveta passa por ela, e a ação não some. */}
      <div className={cn('rounded-b-xl border-t border-bordersubtle bg-card px-5 pb-4 pt-3', lugar === 'lado' && 'sticky bottom-0')}>{rodape}</div>
    </aside>
  )
}

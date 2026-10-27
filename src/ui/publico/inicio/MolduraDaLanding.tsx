import { useRef, type ReactNode } from 'react'
import type { DestinoPublico } from '../navegacaoPublica.ts'
import { BarraDaLanding } from './BarraDaLanding.tsx'
import { RodapeDaLanding } from './RodapeDaLanding.tsx'
import { useEntradaAoRolar } from './useEntradaAoRolar.ts'

interface MolduraDaLandingProps {
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

/**
 * A moldura da landing escura (D-530 e D-545): a raiz leva `.landing-escura` (os tokens `--landing-*`) e `.dark` (os
 * componentes do sistema dentro dela, como a logo e o aviso de conta excluída, viram escuros junto), em qualquer tema
 * do app. A classe fica nesta raiz, nunca no `<html>`: Preços continua no tema do app (CB-544).
 */
export function MolduraDaLanding({ temSessao, aoIrPara, children }: MolduraDaLandingProps) {
  const raiz = useRef<HTMLDivElement>(null)
  useEntradaAoRolar(raiz)
  return (
    <div
      ref={raiz}
      className="landing-escura dark flex min-h-dvh flex-col overflow-x-clip bg-landing-chao font-sans text-(length:--landing-fs-corpo) leading-[1.55] text-landing-tinta tabular-nums antialiased"
    >
      <BarraDaLanding temSessao={temSessao} aoIrPara={aoIrPara} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <RodapeDaLanding aoIrPara={aoIrPara} />
    </div>
  )
}

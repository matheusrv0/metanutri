import { useRef, useState, type ReactNode } from 'react'
import { armazenamentoLocal } from '@/ui/estado/armazenamentoLocal.ts'
import type { DestinoPublico } from '../navegacaoPublica.ts'
import { BarraDaLanding } from './BarraDaLanding.tsx'
import { RodapeDaLanding } from './RodapeDaLanding.tsx'
import { guardarTemaDaLanding, lerTemaDaLanding, marcarTemaNoHtml, type TemaDaLanding } from './temaDaLanding.ts'
import { useEntradaAoRolar } from './useEntradaAoRolar.ts'

interface MolduraDaLandingProps {
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

/** O próximo quadro do navegador; sem ele (jsdom antigo, servidor), logo depois. */
const noProximoQuadro = (feito: () => void) =>
  typeof globalThis.requestAnimationFrame === 'function' ? globalThis.requestAnimationFrame(feito) : globalThis.setTimeout(feito, 16)

/**
 * A moldura da landing (D-545; spec landing-v3, D-607 a D-614): a raiz leva `.landing` (os tokens `--landing-*`) e, no
 * tema dela, `.dark` ou `.landing-clara tema-claro` (os componentes do sistema dentro dela, como a logo e o aviso de
 * conta excluída, seguem o tema da landing, em qualquer tema do app). A classe fica nesta raiz, nunca no `<html>`: Preços
 * continua no tema do app (CB-544). No build (sem `document`), a landing sai escura, o padrão.
 */
export function MolduraDaLanding({ temSessao, aoIrPara, children }: MolduraDaLandingProps) {
  const raiz = useRef<HTMLDivElement>(null)
  const [tema, setTema] = useState<TemaDaLanding>(() => (typeof document === 'undefined' ? 'escuro' : lerTemaDaLanding(armazenamentoLocal())))
  useEntradaAoRolar(raiz)

  const trocarTema = () => {
    const novo: TemaDaLanding = tema === 'claro' ? 'escuro' : 'claro'
    const elemento = raiz.current
    // D-614: um quadro só. Nada anima enquanto a raiz está marcada; a marca sai dois quadros depois do novo desenho.
    elemento?.setAttribute('data-trocando-tema', '')
    guardarTemaDaLanding(armazenamentoLocal(), novo)
    // D-613: a marca do <html> muda antes do novo desenho, para o CSS da página pré-desenhada não segurar o tema velho.
    marcarTemaNoHtml(globalThis.document.documentElement, novo)
    setTema(novo)
    noProximoQuadro(() => noProximoQuadro(() => elemento?.removeAttribute('data-trocando-tema')))
  }

  return (
    <div
      ref={raiz}
      className={`landing ${tema === 'claro' ? 'landing-clara tema-claro' : 'dark'} flex min-h-dvh flex-col overflow-x-clip bg-landing-chao font-sans text-(length:--landing-fs-corpo) leading-[1.55] text-landing-tinta tabular-nums antialiased`}
    >
      <BarraDaLanding temSessao={temSessao} aoIrPara={aoIrPara} tema={tema} aoTrocarTema={trocarTema} />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <RodapeDaLanding aoIrPara={aoIrPara} />
    </div>
  )
}

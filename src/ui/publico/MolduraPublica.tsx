import { ArrowRight } from 'lucide-react'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'painel'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

const LINKS: readonly { readonly destino: DestinoPublico; readonly texto: string; readonly ancora?: string }[] = [
  { destino: 'inicio', texto: 'Como funciona', ancora: 'como-funciona' },
  { destino: 'precos', texto: 'Preços' },
]

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar. */
function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return globalThis.scrollTo({ top: 0 })
  globalThis.setTimeout(() => globalThis.document.getElementById(ancora)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}

/**
 * Moldura das telas públicas: barra flutuante em pílula sobre papel claro.
 * O fundo escuro saiu — a tela de trabalho e a pública agora vivem no mesmo papel,
 * e a grade de fundo é que separa a área de venda da de trabalho.
 */
export function MolduraPublica({ atual, aoIrPara, children }: MolduraPublicaProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-50 px-4 pt-3.5 sm:px-8">
        <div className="mx-auto flex min-h-[62px] max-w-[1266px] flex-wrap items-center gap-x-4 rounded-3xl border border-border bg-card/85 px-4 py-2 shadow-card backdrop-blur-xl sm:rounded-full sm:px-5 sm:py-0">
          <button
            type="button"
            onClick={() => aoIrPara('inicio')}
            className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={28} />
          </button>

          <nav aria-label="Seções" className="order-3 flex w-full justify-center gap-0.5 border-t border-border pt-1.5 sm:order-none sm:ml-auto sm:w-auto sm:border-0 sm:pt-0">
            {LINKS.map((link) => (
              <button
                key={link.destino}
                type="button"
                onClick={() => irComAncora(aoIrPara, link.destino, link.ancora)}
                aria-current={atual === link.destino && !link.ancora ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  atual === link.destino && !link.ancora ? 'bg-acentoclaro font-semibold text-acento' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {link.texto}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <button
              type="button"
              onClick={() => aoIrPara('entrar')}
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => aoIrPara('painel')}
              className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full bg-acentofundo px-4 text-sm font-semibold text-textoacento transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Começar grátis
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="mt-0 border-t border-bordersubtle bg-surfacebrandsoft px-4 pb-8 pt-14 sm:px-8">
        <div className="mx-auto grid max-w-[1266px] gap-9 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo tamanho={28} />
            </div>
            <p className="mt-3.5 max-w-[38ch] text-sm text-muted-foreground">
              O programa de nutrição que mostra o que falta no plano e sugere o que comer. Funciona no navegador, até sem internet.
            </p>
          </div>
          <div>
            <h2 className="mb-3.5 text-[13px] font-semibold text-muted-foreground">Fontes dos dados</h2>
            <ul className="grid gap-2.5 text-sm text-muted-foreground">
              <li>NEPA/UNICAMP. TACO, 4ª ed., 2011</li>
              <li>IBGE. POF 2008-2009</li>
              <li>NASEM. DRI, Apêndice J, 2019</li>
              <li>OMS, 2006 e 2007 · SISVAN, 2011</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3.5 text-[13px] font-semibold text-muted-foreground">Produto</h2>
            <ul className="grid gap-2.5 text-sm">
              <li>
                <button type="button" onClick={() => aoIrPara('precos')} className="rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Preços
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('painel')} className="rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Começar grátis
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('entrar')} className="rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Entrar
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1266px] gap-2 border-t border-border pt-6 text-[13px] text-muted-foreground">
          <p>A prescrição de dieta é privativa de nutricionista com registro no CRN — Lei 8.234/1991.</p>
          <p>Os cálculos ainda não foram conferidos por nutricionista.</p>
        </div>
      </footer>
    </div>
  )
}

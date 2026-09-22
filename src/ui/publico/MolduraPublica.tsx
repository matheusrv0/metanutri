import { ArrowRight, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'painel'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

const LINKS: readonly { readonly destino: DestinoPublico; readonly texto: string }[] = [
  { destino: 'inicio', texto: 'Início' },
  { destino: 'precos', texto: 'Preços' },
]

/**
 * Moldura das telas públicas: barra flutuante em pílula sobre papel claro.
 * O fundo escuro saiu — a tela de trabalho e a pública agora vivem no mesmo papel,
 * e a grade de fundo é que separa a área de venda da de trabalho.
 */
export function MolduraPublica({ atual, aoIrPara, children }: MolduraPublicaProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-50 px-4 pt-3.5 sm:px-8">
        <div className="mx-auto flex min-h-[62px] max-w-[1266px] items-center gap-4 rounded-full border border-border bg-card/85 px-4 shadow-card backdrop-blur-xl sm:px-5">
          <button
            type="button"
            onClick={() => aoIrPara('inicio')}
            className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="grid size-[30px] place-content-center rounded-[9px] bg-primary text-primary-foreground">
              <Target className="size-4" />
            </span>
            <span className="font-titulo text-[17px] font-semibold tracking-[-0.3px]">MetaNutri</span>
          </button>

          <nav aria-label="Seções" className="ml-auto flex flex-wrap gap-0.5">
            {LINKS.map((link) => (
              <button
                key={link.destino}
                type="button"
                onClick={() => aoIrPara(link.destino)}
                aria-current={atual === link.destino ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  atual === link.destino ? 'bg-lightprimary font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {link.texto}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
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
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primaryemphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Abrir o sistema
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="mt-20 rounded-t-2xl bg-muted px-4 pb-8 pt-14 sm:px-8">
        <div className="mx-auto grid max-w-[1266px] gap-9 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="grid size-[30px] place-content-center rounded-[9px] bg-primary text-primary-foreground">
                <Target className="size-4" />
              </span>
              <span className="font-titulo text-[17px] font-semibold tracking-[-0.3px]">MetaNutri</span>
            </div>
            <p className="mt-3.5 max-w-[38ch] text-sm text-muted-foreground">
              Planejador alimentar para estudante de nutrição e recém-formado. Tudo roda no navegador; nada é enviado para servidor.
            </p>
          </div>
          <div>
            <h2 className="mb-3.5 text-[13px] font-semibold text-muted-foreground">De onde vêm os números</h2>
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
                <button type="button" onClick={() => aoIrPara('precos')} className="rounded-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Preços
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('painel')} className="rounded-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Abrir o sistema
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('entrar')} className="rounded-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Entrar
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1266px] gap-2 border-t border-fio pt-6 text-[13px] text-muted-foreground">
          <p>A prescrição de dieta é privativa de nutricionista com registro no CRN — Lei 8.234/1991.</p>
          <p>Os cálculos ainda não foram conferidos por nutricionista.</p>
        </div>
      </footer>
    </div>
  )
}

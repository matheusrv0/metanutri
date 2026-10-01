import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ReactNode } from 'react'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { cn } from '@/lib/utils'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade' | 'fontes'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico | null
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

const LINKS: readonly { readonly texto: string; readonly destino: DestinoPublico; readonly ancora?: string }[] = [
  { texto: 'Como funciona', destino: 'inicio', ancora: 'como-funciona' },
  { texto: 'O diferencial', destino: 'inicio', ancora: 'o-diferencial' },
  { texto: 'Preços', destino: 'precos' },
]

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar. */
export function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return globalThis.scrollTo?.({ top: 0 })
  globalThis.setTimeout(() => globalThis.document.getElementById(ancora)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}

const LINK_RODAPE =
  'rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Moldura das telas públicas no estilo da referência Spora: menu reto sobre a mesa
 * cinza, em versalete, e o botão de começar em pílula de contorno.
 */
export function MolduraPublica({ atual, temSessao, aoIrPara, children }: MolduraPublicaProps) {
  const itemMenu =
    'inline-flex items-center min-h-11 sm:min-h-9 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-8 sm:py-4">
          <button
            type="button"
            onClick={() => irComAncora(aoIrPara, 'inicio')}
            aria-label="MetaNutri, início"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={28} />
          </button>

          <nav aria-label="Seções" className="order-3 flex w-full justify-center gap-1 sm:order-none sm:mx-auto sm:w-auto">
            {LINKS.map((link) => {
              const aqui = atual === link.destino && !link.ancora
              return (
                <button
                  key={link.texto}
                  type="button"
                  onClick={() => irComAncora(aoIrPara, link.destino, link.ancora)}
                  aria-current={aqui ? 'page' : undefined}
                  className={cn(itemMenu, aqui ? 'text-heading underline underline-offset-8' : 'text-foreground hover:bg-card')}
                >
                  {link.texto}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {temSessao ? (
              <Button onClick={() => aoIrPara('painel')}>Ir para o painel</Button>
            ) : (
              <>
                <button type="button" onClick={() => aoIrPara('entrar')} className={cn(itemMenu, 'text-sm normal-case tracking-normal text-foreground hover:bg-card')}>
                  Entrar
                </button>
                <Button variant="outline" className="border-heading bg-transparent text-heading" onClick={() => aoIrPara('criar-conta')}>
                  Começar grátis
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="bg-card px-4 pb-8 pt-14 sm:px-8">
        <div className="mx-auto grid max-w-[1216px] gap-9 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo tamanho={28} />
            <p className="mt-3.5 max-w-[38ch] text-sm text-muted-foreground">
              O programa de nutrição que mostra o que falta no plano e sugere o que comer. Funciona no navegador, até sem internet.
            </p>
          </div>
          <section aria-labelledby="fontes">
            <h2 id="fontes" className="mb-3.5 scroll-mt-24 text-sm font-semibold text-muted-foreground">
              Fontes dos dados
            </h2>
            <ul className="grid gap-2.5 text-sm text-muted-foreground">
              <li className="flex flex-wrap items-center gap-x-1">
                <span>{`${NOME_DA_BASE} ·`}</span>
                <button type="button" onClick={() => aoIrPara('fontes')} className={`${LINK_RODAPE} inline-flex min-h-11 items-center`}>
                  Fontes da base
                </button>
              </li>
              <li>NASEM. DRI, Apêndice J, 2019</li>
              <li>OMS, 2006 e 2007 · SISVAN, 2011</li>
            </ul>
          </section>
          <div>
            <h2 className="mb-3.5 text-sm font-semibold text-muted-foreground">Produto</h2>
            <ul className="grid gap-2.5 text-sm">
              <li>
                <button type="button" onClick={() => aoIrPara('precos')} className={LINK_RODAPE}>
                  Preços
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara(temSessao ? 'painel' : 'criar-conta')} className={LINK_RODAPE}>
                  {temSessao ? 'Ir para o painel' : 'Começar grátis'}
                </button>
              </li>
              {temSessao ? null : (
                <li>
                  <button type="button" onClick={() => aoIrPara('entrar')} className={LINK_RODAPE}>
                    Entrar
                  </button>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mb-3.5 text-sm font-semibold text-muted-foreground">Legal</h2>
            <ul className="grid gap-2.5 text-sm">
              <li>
                <button type="button" onClick={() => aoIrPara('termos')} className={LINK_RODAPE}>
                  Termos de uso
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('privacidade')} className={LINK_RODAPE}>
                  Política de privacidade
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1216px] gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991).</p>
          <p>Os cálculos ainda não foram conferidos por nutricionista.</p>
        </div>
      </footer>
    </div>
  )
}

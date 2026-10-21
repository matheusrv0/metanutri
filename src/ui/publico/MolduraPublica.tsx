import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useEffect, type ReactNode } from 'react'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { cn } from '@/lib/utils'
import { useVersaoNova } from '../aplicativo/versaoNova.ts'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade' | 'fontes'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico | null
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
  /** Recarrega a página quando chega versão nova (D-320). Os testes passam um dublê. */
  readonly recarregar?: () => void
}

const recarregarPagina = () => globalThis.location.reload()

interface LinkPublico {
  readonly texto: string
  readonly destino: DestinoPublico
  readonly ancora?: string
}

/** D-321 (spec site-publico-profissional): as seções da landing e Preços, em caixa normal. */
const LINKS: readonly LinkPublico[] = [
  { texto: 'Como funciona', destino: 'inicio', ancora: 'como-funciona' },
  { texto: 'Recursos', destino: 'inicio', ancora: 'recursos' },
  { texto: 'Preços', destino: 'precos' },
]

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar. */
export function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return globalThis.scrollTo?.({ top: 0 })
  globalThis.setTimeout(() => globalThis.document.getElementById(ancora)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}

/**
 * Spec revisao-geral-publica, D-235: 44 px de toque no celular e o texto que quebra alinhado à esquerda (o botão
 * centraliza por padrão).
 */
const LINK_RODAPE_44 =
  'inline-flex min-h-11 items-center text-left rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
/** A partir de 640 px, os links de navegação do rodapé voltam à altura do texto. */
const LINK_RODAPE = `${LINK_RODAPE_44} sm:min-h-0`

interface ColunaRodape {
  readonly titulo: string
  readonly links: readonly { readonly texto: string; readonly ir: () => void; readonly classe: string }[]
}

/**
 * Moldura das telas públicas no estilo da referência Spora: menu reto sobre a mesa cinza e o botão de começar em pílula
 * de contorno. Spec site-publico-profissional: o menu em caixa normal (D-321) e o rodapé só com links (D-322).
 */
export function MolduraPublica({ atual, temSessao, aoIrPara, children, recarregar = recarregarPagina }: MolduraPublicaProps) {
  // D-320: a vitrine não tem nada digitado a perder; versão nova que passou a valer recarrega a página na hora, para
  // ninguém ficar lendo textos que já saíram do site.
  const versaoNova = useVersaoNova()
  useEffect(() => {
    if (versaoNova) recarregar()
  }, [versaoNova, recarregar])

  const itemMenu =
    'inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9'
  const ano = new Date().getFullYear()
  const colunas: readonly ColunaRodape[] = [
    {
      titulo: 'Produto',
      links: [
        ...LINKS.map((link) => ({ texto: link.texto, ir: () => irComAncora(aoIrPara, link.destino, link.ancora), classe: LINK_RODAPE })),
        // M-1 (revisão de 20/10/2026): 44 px em qualquer largura, como desde 01/10 (tablet também é toque).
        { texto: 'Fontes da base', ir: () => irComAncora(aoIrPara, 'fontes'), classe: LINK_RODAPE_44 },
      ],
    },
    {
      titulo: 'Conta',
      links: temSessao
        ? [{ texto: 'Ir para o painel', ir: () => aoIrPara('painel'), classe: LINK_RODAPE }]
        : [
            { texto: 'Começar grátis', ir: () => aoIrPara('criar-conta'), classe: LINK_RODAPE },
            { texto: 'Entrar', ir: () => aoIrPara('entrar'), classe: LINK_RODAPE },
          ],
    },
    {
      titulo: 'Legal',
      links: [
        { texto: 'Termos de uso', ir: () => irComAncora(aoIrPara, 'termos'), classe: LINK_RODAPE },
        { texto: 'Política de privacidade', ir: () => irComAncora(aoIrPara, 'privacidade'), classe: LINK_RODAPE },
      ],
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-8 sm:py-4">
          <button
            type="button"
            onClick={() => irComAncora(aoIrPara, 'inicio')}
            aria-label="MetaNutri, início"
            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
          >
            <Logo tamanho={28} />
          </button>

          {/* D-235: até 767 px o menu desce para a segunda linha; em 640 px ele cabia ao lado da logo e empurrava os
              botões de Entrar para uma linha sozinhos. */}
          <nav aria-label="Seções" className="order-3 flex w-full justify-center gap-1 md:order-none md:mx-auto md:w-auto">
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

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {temSessao ? (
              <Button onClick={() => aoIrPara('painel')}>Ir para o painel</Button>
            ) : (
              <>
                <button type="button" onClick={() => aoIrPara('entrar')} className={cn(itemMenu, 'text-foreground hover:bg-card')}>
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
        <div className="mx-auto grid max-w-[1216px] gap-9 sm:grid-cols-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="sm:col-span-3 md:col-span-1">
            <Logo tamanho={28} />
          </div>
          {colunas.map((coluna) => (
            <div key={coluna.titulo}>
              <h2 className="mb-3.5 text-sm font-semibold text-heading">{coluna.titulo}</h2>
              <ul className="grid gap-2.5 text-sm">
                {coluna.links.map((link) => (
                  <li key={link.texto}>
                    <button type="button" onClick={link.ir} className={link.classe}>
                      {link.texto}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-[1216px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>{`© ${ano} MetaNutri`}</p>
          {CONTATO_EMAIL ? (
            <a href={`mailto:${CONTATO_EMAIL}`} className={LINK_RODAPE_44}>
              {CONTATO_EMAIL}
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  )
}

import { Logo } from '@ds/componentes/display/Logo.tsx'
import { buttonVariants } from '@ds/componentes/forms/button.tsx'
import type { ReactNode } from 'react'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { cn } from '@/lib/utils'
import { ENDERECO_DO_APP, telaNoApp } from '../enderecos.ts'
import { MolduraDaLanding } from './inicio/MolduraDaLanding.tsx'
import { irComAncora, navegarPeloApp, type DestinoPublico } from './navegacaoPublica.ts'

export type { DestinoPublico } from './navegacaoPublica.ts'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico | null
  /** Spec separacao-site-app, DP-SA-36: o site decide para onde vai cada clique (outra página, o app ou "Continuar"). */
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

interface LinkPublico {
  readonly texto: string
  readonly destino: DestinoPublico
  readonly ancora?: string
  /** D-339: o endereço que a aba nova e os robôs seguem. As páginas próprias são relativas à raiz do site. */
  readonly href: string
}

/** Spec separacao-site-app, D-503: a seção da landing é endereço próprio, `./#<seção>`, que o navegador abre e rola. */
const COMO_FUNCIONA = './#como-funciona'

/**
 * D-321 (spec site-publico-profissional): as seções da landing e Preços, em caixa normal. Spec landing-escura: a landing
 * nova não tem a seção Recursos; o menu fica com Como funciona e Preços.
 */
const LINKS: readonly LinkPublico[] = [
  { texto: 'Como funciona', destino: 'inicio', ancora: 'como-funciona', href: COMO_FUNCIONA },
  { texto: 'Preços', destino: 'precos', href: 'precos/' },
]

/**
 * Spec revisao-geral-publica, D-235: 44 px de toque e o texto que quebra alinhado à esquerda (o botão centraliza por
 * padrão). Spec site-publico-profissional: 44 px em qualquer largura para todos, como já era o "Fontes da base" (M-1),
 * e a lista sem vão entre eles; com alturas diferentes, o rodapé ficava com espaços desiguais.
 */
const LINK_RODAPE =
  'inline-flex min-h-11 items-center text-left rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface ColunaRodape {
  readonly titulo: string
  /** Sem `ir`, o link é só o endereço: o navegador abre (a seção da landing). */
  readonly links: readonly { readonly texto: string; readonly href: string; readonly ir?: () => void }[]
}

/**
 * Moldura das telas públicas no estilo da referência Spora: menu reto sobre a mesa cinza e o botão de começar em pílula
 * de contorno. Spec site-publico-profissional: o menu em caixa normal (D-321) e o rodapé só com links (D-322).
 *
 * Spec separacao-site-app: só o site a usa, e o site não tem sessão (D-501). "Entrar" e "Começar grátis" levam ao app,
 * e "Ir para o painel" sai; cada página fica no próprio endereço, sem a recarga da vitrine (D-503, fim do D-320).
 */
export function MolduraPublica({ atual, aoIrPara, children }: MolduraPublicaProps) {
  // Spec landing-escura (D-530, D-545): a página inicial tem moldura própria, escura em qualquer tema.
  if (atual === 'inicio') {
    return (
      <MolduraDaLanding aoIrPara={aoIrPara}>
        {children}
      </MolduraDaLanding>
    )
  }

  const itemMenu =
    'inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9'
  const ano = new Date().getFullYear()
  const colunas: readonly ColunaRodape[] = [
    {
      titulo: 'Produto',
      links: [
        ...LINKS.map((link) => (link.ancora ? { texto: link.texto, href: link.href } : { texto: link.texto, href: link.href, ir: () => irComAncora(aoIrPara, link.destino) })),
        // Spec landing-escura, D-542: a página das fontes se chama Referências.
        { texto: 'Referências', href: 'fontes/', ir: () => irComAncora(aoIrPara, 'fontes') },
      ],
    },
    {
      titulo: 'Conta',
      links: [
        { texto: 'Começar grátis', href: telaNoApp('#/criar-conta'), ir: () => aoIrPara('criar-conta') },
        { texto: 'Entrar', href: ENDERECO_DO_APP, ir: () => aoIrPara('entrar') },
      ],
    },
    {
      titulo: 'Legal',
      links: [
        { texto: 'Termos de uso', href: 'termos/', ir: () => irComAncora(aoIrPara, 'termos') },
        { texto: 'Política de privacidade', href: 'privacidade/', ir: () => irComAncora(aoIrPara, 'privacidade') },
      ],
    },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-8 sm:py-4">
          <a
            href="./"
            aria-label="MetaNutri, início"
            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
          >
            {/* M-012 (spec ajustes-mobile): até 373 px, só o símbolo, como a barra da landing (D-622); o nome da marca
                continua no rótulo do link. */}
            <span className="max-[373px]:hidden">
              <Logo tamanho={28} />
            </span>
            <span className="hidden max-[373px]:inline">
              <Logo tamanho={28} soSimbolo />
            </span>
          </a>

          {/* D-235: de 640 a 767 px o menu desce para a segunda linha; em 640 px ele cabia ao lado da logo e empurrava os
              botões de Entrar para uma linha sozinhos. M-012 e D-804 (spec ajustes-mobile): no celular, o cabeçalho fixo
              fica numa linha, como a barra da landing: a logo, "Entrar" e "Começar grátis". As seções ficam no rodapé. */}
          <nav aria-label="Seções" className="order-3 hidden w-full justify-center gap-1 sm:flex md:order-none md:mx-auto md:w-auto">
            {LINKS.map((link) => {
              const aqui = atual === link.destino && !link.ancora
              return (
                <a
                  key={link.texto}
                  href={link.href}
                  onClick={link.ancora ? undefined : (evento) => navegarPeloApp(evento, () => irComAncora(aoIrPara, link.destino))}
                  aria-current={aqui ? 'page' : undefined}
                  className={cn(itemMenu, aqui ? 'text-heading underline underline-offset-8' : 'text-foreground hover:bg-card')}
                >
                  {link.texto}
                </a>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <a
              href={ENDERECO_DO_APP}
              onClick={(evento) => navegarPeloApp(evento, () => aoIrPara('entrar'))}
              className={cn(itemMenu, 'text-foreground hover:bg-card')}
            >
              Entrar
            </a>
            {/* O botão do design system, como link (o endereço é o do app): a mesma classe, como no WhatsApp. */}
            <a
              href={telaNoApp('#/criar-conta')}
              onClick={(evento) => navegarPeloApp(evento, () => aoIrPara('criar-conta'))}
              className={cn(buttonVariants({ variant: 'outline' }), 'border-heading bg-transparent text-heading max-[420px]:px-4')}
            >
              Começar grátis
            </a>
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
              <h2 className="mb-1 text-sm font-semibold text-heading">{coluna.titulo}</h2>
              <ul className="grid text-sm">
                {coluna.links.map((link) => (
                  <li key={link.texto}>
                    <a href={link.href} onClick={link.ir ? (evento) => navegarPeloApp(evento, link.ir ?? (() => undefined)) : undefined} className={LINK_RODAPE}>
                      {link.texto}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-[1216px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>{`© ${ano} MetaNutri`}</p>
          {CONTATO_EMAIL ? (
            <a href={`mailto:${CONTATO_EMAIL}`} className={LINK_RODAPE}>
              {CONTATO_EMAIL}
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  )
}

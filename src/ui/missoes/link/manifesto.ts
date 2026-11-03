// O "Meu plano" instalado (spec lado-do-paciente, D-1213 e DP-LP-2): o link do paciente vira ícone na tela inicial, com o
// nome "Meu plano", o ícone próprio e o começo no endereço do link (`/p/<token>`), para o ícone abrir o plano dele e não
// o login da nutricionista. A Cloudflare não monta arquivo por pedido; o manifesto nasce aqui, em `data:` (a CSP aceita,
// `manifest-src 'self' data:`). No iPhone, que não lê manifesto assim, valem o título, o nome e o ícone da página.
import { useEffect } from 'react'

export const NOME_DO_MEU_PLANO = 'Meu plano'

/** Os ícones em `public/`, gerados por scripts/icone-meu-plano.mjs. */
export const ICONES_DO_MEU_PLANO = {
  pequeno: '/meu-plano-192.png',
  grande: '/meu-plano-512.png',
  mascaravel: '/meu-plano-maskable-512.png',
  iphone: '/apple-touch-icon-meu-plano.png',
} as const

export interface ManifestoDoLink {
  readonly id: string
  readonly name: string
  readonly short_name: string
  readonly lang: 'pt-BR'
  readonly start_url: string
  readonly scope: string
  readonly display: 'standalone'
  readonly icons: readonly { readonly src: string; readonly sizes: string; readonly type: 'image/png'; readonly purpose?: 'maskable' }[]
  readonly background_color?: string
  readonly theme_color?: string
}

/**
 * O manifesto de um link. `id`, `start_url` e `scope` são o endereço absoluto do link: o manifesto em `data:` não tem
 * endereço próprio para resolver caminho relativo. As cores, quando a página as tem (o tema lido do CSS), vão junto.
 */
export function manifestoDoLink(origem: string, token: string, cores: { readonly fundo?: string; readonly tema?: string } = {}): ManifestoDoLink {
  const link = `${origem}/p/${token}`
  return {
    id: link,
    name: NOME_DO_MEU_PLANO,
    short_name: NOME_DO_MEU_PLANO,
    lang: 'pt-BR',
    start_url: link,
    scope: link,
    display: 'standalone',
    icons: [
      { src: `${origem}${ICONES_DO_MEU_PLANO.pequeno}`, sizes: '192x192', type: 'image/png' },
      { src: `${origem}${ICONES_DO_MEU_PLANO.grande}`, sizes: '512x512', type: 'image/png' },
      { src: `${origem}${ICONES_DO_MEU_PLANO.mascaravel}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    ...(cores.fundo ? { background_color: cores.fundo } : {}),
    ...(cores.tema ? { theme_color: cores.tema } : {}),
  }
}

/** O manifesto como endereço `data:`, que o `<link rel="manifest">` aponta. */
export const enderecoDoManifesto = (manifesto: ManifestoDoLink): string => `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifesto))}`

/** O elemento da cabeça com este seletor; sem ele, um novo, criado com os atributos e marcado para sair no fim. */
function elementoDaCabeca(doc: Document, seletor: string, criar: () => HTMLElement): { readonly elemento: HTMLElement; readonly criado: boolean } {
  const existente = doc.head.querySelector<HTMLElement>(seletor)
  if (existente) return { elemento: existente, criado: false }
  const novo = criar()
  doc.head.appendChild(novo)
  return { elemento: novo, criado: true }
}

const novoLink = (doc: Document, rel: string) => () => {
  const link = doc.createElement('link')
  link.rel = rel
  return link
}

const novaMeta = (doc: Document, nome: string) => () => {
  const meta = doc.createElement('meta')
  meta.name = nome
  return meta
}

/** A cor de um token do tema, lida do CSS da página; vazia quando o CSS não carregou. */
function corDoTema(doc: Document, token: string): string | undefined {
  const valor = doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(token).trim()
  return valor ? valor : undefined
}

/**
 * Troca, na cabeça da página, o manifesto do MetaNutri pelo do "Meu plano" deste link, o ícone e o nome do iPhone e o
 * título. Devolve como desfazer (a tela do link desmonta ou o token muda).
 */
export function aplicarMeuPlano(doc: Document, origem: string, token: string): () => void {
  const desfazer: (() => void)[] = []
  const trocarAtributo = (seletor: string, criar: () => HTMLElement, atributo: string, valor: string) => {
    const { elemento, criado } = elementoDaCabeca(doc, seletor, criar)
    const antes = elemento.getAttribute(atributo)
    elemento.setAttribute(atributo, valor)
    desfazer.push(() => {
      if (criado) elemento.remove()
      else if (antes === null) elemento.removeAttribute(atributo)
      else elemento.setAttribute(atributo, antes)
    })
  }

  const manifesto = manifestoDoLink(origem, token, { fundo: corDoTema(doc, '--ivory'), tema: corDoTema(doc, '--bg-page') })
  trocarAtributo('link[rel="manifest"]', novoLink(doc, 'manifest'), 'href', enderecoDoManifesto(manifesto))
  trocarAtributo('link[rel="apple-touch-icon"]', novoLink(doc, 'apple-touch-icon'), 'href', ICONES_DO_MEU_PLANO.iphone)
  trocarAtributo('meta[name="apple-mobile-web-app-title"]', novaMeta(doc, 'apple-mobile-web-app-title'), 'content', NOME_DO_MEU_PLANO)
  trocarAtributo('meta[name="apple-mobile-web-app-capable"]', novaMeta(doc, 'apple-mobile-web-app-capable'), 'content', 'yes')
  trocarAtributo('meta[name="mobile-web-app-capable"]', novaMeta(doc, 'mobile-web-app-capable'), 'content', 'yes')

  const tituloAntes = doc.title
  doc.title = NOME_DO_MEU_PLANO
  desfazer.push(() => {
    doc.title = tituloAntes
  })

  return () => {
    for (const passo of desfazer.reverse()) passo()
  }
}

/** A tela do link põe o "Meu plano" na página enquanto está aberta. */
export function useMeuPlanoNaPagina(token: string | null): void {
  useEffect(() => {
    if (token === null || typeof document === 'undefined') return
    return aplicarMeuPlano(document, globalThis.location.origin, token)
  }, [token])
}

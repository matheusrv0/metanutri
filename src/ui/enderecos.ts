// Os dois endereços do MetaNutri (spec separacao-site-app, D-500 e DP-SA-3): o site público e o app. Os de produção são
// o padrão; só os testes de navegador trocam os dois, pelas variáveis do build, para as portas locais. O canônico e o SEO
// do site continuam fixos em `src/seo/paginas.ts`.
import type { IdPlano } from '@/domain/conta.ts'

export const APP_EM_PRODUCAO = 'https://app.metanutri.com.br/'
export const SITE_EM_PRODUCAO = 'https://metanutri.com.br/'

/** O endereço da variável, só a origem e com a barra do fim; vazio, inválido ou fora de `http(s):`, o padrão. */
export function enderecoOuPadrao(valor: unknown, padrao: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') return padrao
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? `${url.origin}/` : padrao
  } catch {
    return padrao
  }
}

export const ENDERECO_DO_APP = enderecoOuPadrao(import.meta.env.VITE_ENDERECO_DO_APP, APP_EM_PRODUCAO)
export const ENDERECO_DO_SITE = enderecoOuPadrao(import.meta.env.VITE_ENDERECO_DO_SITE, SITE_EM_PRODUCAO)

/** As páginas do site (D-503), cada uma no seu caminho. */
export type PaginaDoSite = 'inicio' | 'precos' | 'termos' | 'privacidade' | 'fontes'

const CAMINHOS: Readonly<Record<PaginaDoSite, string>> = {
  inicio: '',
  precos: 'precos/',
  termos: 'termos/',
  privacidade: 'privacidade/',
  fontes: 'fontes/',
}

/** A página do site; em Preços, o plano em destaque vai na consulta (D-505 e DP-SA-37). */
export function paginaDoSite(pagina: PaginaDoSite, destaque?: IdPlano | null): string {
  return `${ENDERECO_DO_SITE}${CAMINHOS[pagina]}${pagina === 'precos' && destaque ? `?destaque=${destaque}` : ''}`
}

/** Uma tela do app, com a consulta e o `#` de onde a pessoa veio (D-510). */
export function telaNoApp(hash = '', busca = ''): string {
  return `${ENDERECO_DO_APP}${busca}${hash}`
}

const CLOUDFLARE = 'metanutri-app.pages.dev'

/**
 * D-509 e CA-1417: o app aberto no endereço da Cloudflare (ou numa prévia, `<algo>.metanutri-app.pages.dev`) vai para o
 * oficial, com a mesma consulta e o mesmo `#`. Em qualquer outro endereço, nulo.
 */
export function enderecoOficial(local: { readonly hostname: string; readonly search: string; readonly hash: string }): string | null {
  const host = local.hostname.toLowerCase()
  if (host !== CLOUDFLARE && !host.endsWith(`.${CLOUDFLARE}`)) return null
  return telaNoApp(local.hash, local.search)
}

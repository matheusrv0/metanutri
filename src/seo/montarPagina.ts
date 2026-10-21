// Monta o HTML de cada página indexável a partir do index.html que o build escreveu (spec site-publico-profissional,
// D-331). Texto puro e só import relativo: roda no plugin do build, no Node.
import { MARCA_FIM, MARCA_INICIO } from './marcas.ts'

export interface PaginaDesenhada {
  readonly rota: string
  /** Vazio na inicial; "precos/" em Preços. */
  readonly caminho: string
  /** As tags do <head> desta página (título, descrição, canônico, Open Graph e, quando cabe, o JSON-LD). */
  readonly cabecalho: string
  /** A tela já desenhada, dentro da moldura pública. */
  readonly corpo: string
}

export interface OpcoesDaPagina {
  /** O woff2 da Manrope a pré-carregar, a partir da raiz ("assets/manrope-latin-….woff2"), ou nulo. */
  readonly fonte: string | null
}

const RAIZ_VAZIA = '<div id="root"></div>'
const CSP = /<meta http-equiv="Content-Security-Policy"[^>]*>/
const PACOTE = '<script type="module"'

/** O woff2 latino da Manrope entre os arquivos de `assets/` (CA-1020). */
export function localizarFonte(arquivosDeAssets: readonly string[]): string | null {
  const achado = arquivosDeAssets.find((nome) => /^manrope-latin-wght-normal-[\w-]+\.woff2$/.test(nome))
  return achado ? `assets/${achado}` : null
}

/**
 * O index.html da página: o cabeçalho dela entre as marcas, a tela dentro do #root (embrulhada em `data-vitrine`, que o
 * script do <head> esconde quando o endereço pede outra tela) e, nas páginas de subpasta, `<base>` e `data-rota`.
 * Falta alguma peça, o build para: melhor do que publicar uma página pela metade.
 */
export function montarPagina(html: string, pagina: PaginaDesenhada, { fonte }: OpcoesDaPagina): string {
  const inicio = html.indexOf(MARCA_INICIO)
  const fim = html.indexOf(MARCA_FIM)
  if (inicio < 0 || fim < inicio) throw new Error('index.html sem as marcas do bloco de busca (seo:inicio e seo:fim).')
  if (!html.includes(RAIZ_VAZIA)) throw new Error('index.html sem o #root vazio: a página pré-desenhada entra nele.')

  let saida = `${html.slice(0, inicio)}${pagina.cabecalho}${html.slice(fim + MARCA_FIM.length)}`
  saida = saida.replace(RAIZ_VAZIA, `<div id="root"><div data-vitrine="">${pagina.corpo}</div></div>`)

  if (fonte) {
    const preload = `<link rel="preload" href="./${fonte}" as="font" type="font/woff2" crossorigin />`
    const pacote = saida.indexOf(PACOTE)
    saida = pacote >= 0 ? `${saida.slice(0, pacote)}${preload}\n    ${saida.slice(pacote)}` : saida.replace('</head>', `  ${preload}\n  </head>`)
  }

  const profundidade = pagina.caminho.split('/').filter(Boolean).length
  if (profundidade > 0) {
    const csp = CSP.exec(saida)
    if (!csp) throw new Error(`Página ${pagina.rota} sem a CSP: o <base> entra logo depois dela.`)
    const depois = csp.index + csp[0].length
    saida = `${saida.slice(0, depois)}\n    <base href="${'../'.repeat(profundidade)}" />${saida.slice(depois)}`
    saida = saida.replace('<html lang="pt-BR">', `<html lang="pt-BR" data-rota="${pagina.rota}">`)
  }
  return saida
}

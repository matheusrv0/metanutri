// O plugin do build que separa o site e o app (spec separacao-site-app, DP-SA-1 e DP-SA-2). Um index.html só, ajustado
// por alvo: no site, a entrada passa ao pacote do site e o <html> ganha o endereço do app (o script do <head> lê dali);
// no app, o bloco de busca vira a cabeça do D-506 e o script do <head> vira o que só aplica o tema. No fim do build, cada
// pasta perde o que é do outro, antes de o plugin do PWA montar o service worker (que guardaria o arquivo).
//
// Só import relativo e do Node: este arquivo é lido pelo vite.config.ts, sem os atalhos `@/`.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import type { VitePWAOptions } from 'vite-plugin-pwa'
import type { AlvoDoBuild } from '../seguranca/csp.ts'
import { MARCA_FIM, MARCA_INICIO } from './marcas.ts'

/** O endereço do app em produção: o mesmo `APP_EM_PRODUCAO` de `src/ui/enderecos.ts` (que não roda no Node do build). */
export const APP_PADRAO = 'https://app.metanutri.com.br/'

const ENTRADA_DO_APP = '/src/main.tsx'
const ENTRADA_DO_SITE = '/src/site/main.tsx'
const SCRIPT_DO_SITE = './preparar-pagina.js'
const SCRIPT_DO_APP = './preparar-app.js'

/** O que só o site publica: a busca (D-506: o app não tem) e o script do <head> da vitrine. */
export const SO_DO_SITE: readonly string[] = ['robots.txt', 'sitemap.xml', 'llms.txt', 'preparar-pagina.js']
/** O que só o app publica: o script do <head> que aplica o tema e o catálogo de rótulos (spec base-ampliada, fase 2, D-753). */
export const SO_DO_APP: readonly string[] = ['preparar-app.js', 'catalogo-off']

/** O endereço do app pela variável do build, com a regra de `enderecoOuPadrao` (src/ui/enderecos.ts). */
export function enderecoDoApp(valor: unknown): string {
  if (typeof valor !== 'string' || valor.trim() === '') return APP_PADRAO
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? `${url.origin}/` : APP_PADRAO
  } catch {
    return APP_PADRAO
  }
}

/** D-506 e CA-1418: a cabeça do app. Fora dos buscadores, título "MetaNutri" e prévia de link só com o nome e o ícone. */
export function cabecaDoApp(app: string): string {
  return [
    '<title>MetaNutri</title>',
    '<meta name="robots" content="noindex" />',
    '<meta property="og:site_name" content="MetaNutri" />',
    '<meta property="og:title" content="MetaNutri" />',
    `<meta property="og:image" content="${app}icon-512.png" />`,
  ].join('\n    ')
}

/** Troca um trecho que precisa existir; sem ele, o build para: melhor do que publicar a página errada. */
function trocar(html: string, de: string, para: string): string {
  if (!html.includes(de)) throw new Error(`index.html sem ${de}: o plugin do alvo (src/seo/pluginAlvo.ts) troca esse trecho.`)
  return html.replace(de, para)
}

/** O index.html do alvo (DP-SA-2). */
export function prepararHtml(html: string, alvo: AlvoDoBuild, app: string): string {
  if (alvo === 'site') {
    const doSite = trocar(html, `src="${ENTRADA_DO_APP}"`, `src="${ENTRADA_DO_SITE}"`)
    if (!/<html\b[^>]*>/.test(doSite)) throw new Error('index.html sem <html>: o endereço do app entra nele.')
    return doSite.replace(/<html\b([^>]*)>/, `<html$1 data-app="${app}">`)
  }
  const inicio = html.indexOf(MARCA_INICIO)
  const fim = html.indexOf(MARCA_FIM)
  if (inicio < 0 || fim < inicio) throw new Error('index.html sem as marcas do bloco de busca (seo:inicio e seo:fim).')
  const semBusca = `${html.slice(0, inicio)}${cabecaDoApp(app)}${html.slice(fim + MARCA_FIM.length)}`
  return trocar(semBusca, `src="${SCRIPT_DO_SITE}"`, `src="${SCRIPT_DO_APP}"`)
}

/** As cores do manifest do app, que o vite.config.ts passa (o manifest é JSON puro: não lê var()). */
export interface CoresDoAplicativo {
  readonly fundo: string
  readonly tema: string
}

/**
 * O aplicativo instalado de cada alvo (DP-SA-13 e DP-SA-14). No site, só o service worker que se desliga: quem tinha o
 * do app velho recebe este, que sai, apaga o que guardava e recarrega a página uma vez (D-508, CA-1407); quem nunca teve
 * não registra nada, e o site não tem manifesto. No app, o de sempre, com o manifesto preso à raiz do endereço novo.
 */
export function opcoesDoAplicativo(alvo: AlvoDoBuild, cores: CoresDoAplicativo): Partial<VitePWAOptions> {
  if (alvo === 'site') return { selfDestroying: true, injectRegister: false, manifest: false }
  return {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'marca/*.svg'],
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      // A base de alimentos e as tabelas entram no pacote JavaScript: precisa caber no cache.
      maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      // D-338 (spec site-publico-profissional): arquivo de texto, XML ou imagem aberto no navegador é o arquivo, não a
      // página do app.
      navigateFallbackDenylist: [/\.(?:txt|xml|png)$/],
      // D-753 e CA-1763 (spec base-ampliada, fase 2): o catálogo de rótulos não entra no precache (megabytes que quase
      // ninguém usa inteiros); o índice e cada fatia ficam guardados na primeira vez que são pedidos. O caminho tem a
      // versão: o que está guardado nunca fica velho.
      runtimeCaching: [
        {
          urlPattern: /\/catalogo-off\/\d{4}-\d{2}-\d{2}\/.+\.json$/,
          handler: 'CacheFirst',
          options: { cacheName: 'catalogo-off', expiration: { maxEntries: 120 } },
        },
      ],
    },
    manifest: {
      // DP-SA-14: a identidade do aplicativo instalado é a raiz do endereço do app (D-508).
      id: '/',
      // DP-SA-61: só o nome, sem frase de venda nem descrição (sem tagline, regra do dono).
      name: 'MetaNutri',
      short_name: 'MetaNutri',
      lang: 'pt-BR',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: cores.fundo,
      theme_color: cores.tema,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  }
}

/** Tira da pasta do build o que é do outro alvo. */
export function limparSaida(pasta: string, alvo: AlvoDoBuild): void {
  for (const arquivo of alvo === 'site' ? SO_DO_APP : SO_DO_SITE) rmSync(join(pasta, arquivo), { force: true, recursive: true })
}

export function pluginAlvo(alvo: AlvoDoBuild): Plugin {
  let config: ResolvedConfig | null = null
  let app = APP_PADRAO
  return {
    name: 'metanutri:alvo',
    config(usuario, { mode }) {
      // DP-SA-48: os dois endereços sempre definidos, mesmo vazios (vazios valem o de produção). Leitura de variável que
      // não existe vira, no pacote, o objeto inteiro das variáveis: o site levaria o endereço e a chave do Supabase.
      const pasta = typeof usuario.envDir === 'string' ? usuario.envDir : (usuario.root ?? process.cwd())
      const ambiente = loadEnv(mode, pasta, 'VITE_ENDERECO_')
      return {
        define: {
          'import.meta.env.VITE_ENDERECO_DO_APP': JSON.stringify(ambiente['VITE_ENDERECO_DO_APP'] ?? ''),
          'import.meta.env.VITE_ENDERECO_DO_SITE': JSON.stringify(ambiente['VITE_ENDERECO_DO_SITE'] ?? ''),
        },
      }
    },
    configResolved(resolvido) {
      config = resolvido
      // DP-SA-3: o mesmo VITE_ENDERECO_DO_APP que vai para o pacote; só os testes de navegador o definem.
      app = enderecoDoApp(resolvido.env['VITE_ENDERECO_DO_APP'])
    },
    transformIndexHtml: {
      // Antes de o Vite ler o index.html: a entrada trocada é a que ele monta (DP-SA-2, R-511).
      order: 'pre',
      handler: (html) => prepararHtml(html, alvo, app),
    },
    writeBundle: {
      sequential: true,
      order: 'post',
      handler(saida) {
        if (!config || config.build.ssr) return
        limparSaida(saida.dir ?? join(config.root, config.build.outDir), alvo)
      },
    },
  }
}

// O plugin do build que pré-desenha as páginas públicas (spec site-publico-profissional, D-331). Só no build.
//
// Depois que o Vite escreve o index.html (já com a CSP), um servidor do Vite em modo SSR carrega src/seo/vitrine.tsx,
// que desenha cada página indexável com react-dom/server. A inicial vai para o próprio index.html; Preços, Termos,
// Privacidade e Fontes viram `<caminho>/index.html`. Tudo isso antes de o plugin do PWA montar o service worker, que
// assim guarda as páginas novas no precache (CA-1021).
//
// Só import relativo e do Node: este arquivo é lido pelo vite.config.ts, sem os atalhos `@/`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer, type Plugin, type ResolvedConfig } from 'vite'
import { localizarFonte, montarPagina, type PaginaDesenhada } from './montarPagina.ts'

interface ModuloDaVitrine {
  readonly desenharPaginas: () => readonly PaginaDesenhada[]
}

async function desenharNoServidor(config: ResolvedConfig): Promise<readonly PaginaDesenhada[]> {
  const servidor = await createServer({
    configFile: config.configFile ?? false,
    root: config.root,
    mode: config.mode,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const modulo = (await servidor.ssrLoadModule('/src/seo/vitrine.tsx')) as ModuloDaVitrine
    return modulo.desenharPaginas()
  } finally {
    await servidor.close()
  }
}

export function pluginSeo(): Plugin {
  let config: ResolvedConfig | null = null
  return {
    name: 'metanutri:paginas-publicas',
    apply: 'build',
    configResolved(resolvido) {
      config = resolvido
    },
    writeBundle: {
      sequential: true,
      order: 'post',
      async handler(saida) {
        if (!config || config.build.ssr) return
        const pasta = saida.dir ?? join(config.root, config.build.outDir)
        const indice = join(pasta, 'index.html')
        const html = readFileSync(indice, 'utf8')
        const fonte = localizarFonte(readdirSync(join(pasta, config.build.assetsDir)))
        for (const pagina of await desenharNoServidor(config)) {
          const destino = join(pasta, pagina.caminho)
          mkdirSync(destino, { recursive: true })
          writeFileSync(join(destino, 'index.html'), montarPagina(html, pagina, { fonte }))
        }
      },
    },
  }
}

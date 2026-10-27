// O plugin do build que põe a regra de conteúdo no index.html (spec seguranca-lote-4, D-135). A regra vem do csp.ts.
// Spec separacao-site-app: a regra é a do alvo (D-502), e o build do app escreve também o `_headers` (DP-SA-16).
//
// Só no build (`apply: 'build'`): o servidor de desenvolvimento escreve scripts dentro da página para o recarregamento
// e ficaria quebrado com a regra. O `vite preview` serve o build, então ele tem a regra.
import type { Plugin } from 'vite'
import { cabecalhosDoApp, diretivasDaPolitica, diretivasDoSite, origemDoSupabase, textoDaPolitica, type AlvoDoBuild } from './csp.ts'

const CHARSET = /<meta\s+charset=["']?utf-8["']?\s*\/?>/i

export function metaDaPolitica(politica: string): string {
  return `<meta http-equiv="Content-Security-Policy" content="${politica}" />`
}

/**
 * A regra só vale para o que vem depois dela na página, então ela entra logo depois do charset, antes de qualquer
 * script, folha de estilo ou ícone. Sem o charset, o build para: melhor do que publicar sem a regra.
 */
export function injetarPolitica(html: string, politica: string): string {
  const charset = CHARSET.exec(html)
  if (!charset) throw new Error('index.html sem <meta charset="UTF-8">: a regra de conteúdo (CSP) entra logo depois dele.')
  const fim = charset.index + charset[0].length
  return `${html.slice(0, fim)}\n    ${metaDaPolitica(politica)}${html.slice(fim)}`
}

export function pluginPoliticaDeConteudo(alvo: AlvoDoBuild = 'app'): Plugin {
  let politica = ''
  return {
    name: 'metanutri:politica-de-conteudo',
    apply: 'build',
    configResolved(config) {
      // DP-CSP-1: o mesmo VITE_SUPABASE_URL que vai para o pacote (o do .env ou o da Cloudflare). O site não usa (D-502).
      const endereco: unknown = config.env['VITE_SUPABASE_URL']
      politica = textoDaPolitica(alvo === 'site' ? diretivasDoSite() : diretivasDaPolitica({ supabase: origemDoSupabase(endereco) }))
    },
    generateBundle() {
      // D-507: a Cloudflare lê o `_headers` da pasta publicada. O GitHub Pages, do site, não lê cabeçalho nenhum.
      if (alvo === 'app') this.emitFile({ type: 'asset', fileName: '_headers', source: cabecalhosDoApp(politica) })
    },
    transformIndexHtml: {
      // Depois dos outros plugins (o do PWA põe o manifest): a posição vem do charset, não da ordem.
      order: 'post',
      handler: (html) => injetarPolitica(html, politica),
    },
  }
}

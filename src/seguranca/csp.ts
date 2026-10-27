// A regra de conteúdo do site, a CSP (spec seguranca-lote-4, D-135, CA-485, CB-128). Este arquivo é a única fonte:
// o plugin do build (pluginCsp.ts) a põe numa <meta> do index.html, porque o GitHub Pages não deixa mandar cabeçalho,
// e os testes a leem daqui. Spec separacao-site-app: o app tem a regra de sempre, também em cabeçalho (`_headers` da
// Cloudflare, D-507); o site público tem uma regra menor, só do próprio site (D-502). O inventário de cada origem, com o motivo, está em specs/seguranca-lote-4/PLAN-csp.md.
// Mudou o que o site carrega de fora? Muda aqui e roda `npm run test:csp`, que usa os scripts de verdade.
//
// Nada de DOM nem de Node aqui: o arquivo roda no navegador (o nonce) e no build (a regra).

/**
 * DP-CSP-3: o SDK do Mercado Pago escreve na página o script do antifraude, que muda a cada visita (hash não serve).
 * Ele aceita um nonce, e o site passa este (processadorMercadoPago.ts). Num site estático o nonce é fixo e público;
 * mesmo assim, atributo de evento, `javascript:`, script de outro domínio e `eval` continuam bloqueados.
 */
/** O que o build monta (spec separacao-site-app, DP-SA-1): o app (`vite build`) ou o site público (`--mode site`). */
export type AlvoDoBuild = 'app' | 'site'

export const NONCE_DO_ANTIFRAUDE = '5dafffd0bcbd90745abc635124d841de'

/** O SDK dos campos do cartão (script). */
const SDK_DO_PAGAMENTO = 'https://sdk.mercadopago.com'
/** A bandeira pelo BIN e o registro do aparelho (conexão). */
const API_DO_PAGAMENTO = 'https://api.mercadopago.com'
/** Os três campos do cartão são iframes daqui; o SDK também faz uma consulta a esta origem. */
const CAMPOS_DO_CARTAO = 'https://secure-fields.mercadopago.com'
/** O servidor reserva dos campos do cartão (o `sourceUrl` do SDK): moldura e conexão. */
const CAMPOS_DO_CARTAO_RESERVA = 'https://api-static.mercadopago.com'
/** Antifraude do pagamento: a consulta `etid` (conexão) e o pixel (imagem). */
const ANTIFRAUDE = 'https://www.mercadolibre.com'
/** Antifraude do pagamento: o pixel do Brasil (imagem), o que ele usa fora do domínio de produção. */
const ANTIFRAUDE_BRASIL = 'https://www.mercadolivre.com'
/**
 * Antifraude do pagamento no domínio de produção: em `metanutri.com.br` (`.com.br`) o script usa este host, por imagem
 * ou por `fetch`, conforme a variante da visita. Em `localhost` ele não aparece (achado da revisão de 14/10/2026).
 */
const ANTIFRAUDE_DOMINIO_BR = 'https://www.mercadopago.com.br'
/** As métricas do SDK do pagamento (`/tracks`). */
const METRICAS_DO_PAGAMENTO = 'https://api.mercadolibre.com'
/** A verificação contra robôs: o script e o iframe do Turnstile. */
const VERIFICACAO = 'https://challenges.cloudflare.com'
/** DP-CSP-2: o rótulo pelo código de barras, buscado direto do navegador (domain/codigoBarras.ts). */
const ROTULOS = 'https://world.openfoodfacts.org'

export type NomeDaDiretiva =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'frame-src'
  | 'child-src'
  | 'worker-src'
  | 'manifest-src'
  | 'base-uri'
  | 'form-action'
  | 'object-src'
  | 'upgrade-insecure-requests'

/** As diretivas na ordem em que vão para a <meta>, cada uma com as suas fontes. */
export type Politica = readonly (readonly [NomeDaDiretiva, readonly string[]])[]

export interface OpcoesDaPolitica {
  /** A origem do Supabase do build (`origemDoSupabase`), ou nulo quando o site não tem nuvem. */
  readonly supabase: string | null
}

/**
 * DP-CSP-1: a origem do Supabase sai do mesmo `VITE_SUPABASE_URL` que vai para o pacote. Só vale `https:`; vazio,
 * `desligado` (os testes) ou um Supabase local em `http:` não liberam nada.
 */
export function origemDoSupabase(endereco: unknown): string | null {
  if (typeof endereco !== 'string') return null
  try {
    const url = new URL(endereco.trim())
    return url.protocol === 'https:' && url.hostname !== '' ? url.origin : null
  } catch {
    return null
  }
}

export function diretivasDaPolitica({ supabase }: OpcoesDaPolitica): Politica {
  const molduras = [CAMPOS_DO_CARTAO, CAMPOS_DO_CARTAO_RESERVA, VERIFICACAO]
  return [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", `'nonce-${NONCE_DO_ANTIFRAUDE}'`, SDK_DO_PAGAMENTO, VERIFICACAO]],
    // React, Radix, motion, o SDK do pagamento e o Turnstile escrevem estilo na página. Script, nunca.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    // `data:` é a logo do perfil (o FileReader a lê assim).
    ['img-src', ["'self'", 'data:', ANTIFRAUDE, ANTIFRAUDE_BRASIL, ANTIFRAUDE_DOMINIO_BR]],
    // DP-CSP-4: as fontes vêm como arquivo do próprio site, nunca `data:`.
    ['font-src', ["'self'"]],
    [
      'connect-src',
      ["'self'", ...(supabase ? [supabase] : []), API_DO_PAGAMENTO, CAMPOS_DO_CARTAO, CAMPOS_DO_CARTAO_RESERVA, ANTIFRAUDE, ANTIFRAUDE_DOMINIO_BR, METRICAS_DO_PAGAMENTO, ROTULOS],
    ],
    ['frame-src', molduras],
    // DP-CSP-5 (CB-128): reserva para o navegador que não entende frame-src ou worker-src.
    ['child-src', ["'self'", ...molduras]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['object-src', ["'none'"]],
    ['upgrade-insecure-requests', []],
  ]
}

/**
 * D-502 e CA-1406: a regra do site público. Ele só tem a vitrine, sem conta, pagamento, verificação contra robôs nem
 * leitor de rótulo: nada vem de fora do próprio site, e nenhum script escrito na página passa (sem o nonce).
 */
export function diretivasDoSite(): Politica {
  return [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'"]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'"]],
    ['frame-src', ["'none'"]],
    ['child-src', ["'self'"]],
    // O service worker que se desliga (DP-SA-13) é do próprio site.
    ['worker-src', ["'self'"]],
    // CA-1407: o site não tem manifesto.
    ['manifest-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['object-src', ["'none'"]],
    ['upgrade-insecure-requests', []],
  ]
}

/** O texto que vai no `content` da <meta>. */
export function textoDaPolitica(politica: Politica): string {
  return politica.map(([nome, fontes]) => [nome, ...fontes].join(' ')).join('; ')
}

/** D-507: no cabeçalho, a regra da <meta> mais a moldura, que a <meta> não cobre (CA-1419). */
export function politicaDoCabecalho(textoDaMeta: string): string {
  return `${textoDaMeta}; frame-ancestors 'none'`
}

/**
 * D-507 e CA-1419: o `_headers` do app na Cloudflare, para todo endereço. Sem `Cross-Origin-Opener-Policy` até a P3: ele
 * cortaria a ligação entre a aba do site e a do app na mudança dos dados (D-512, R-504).
 */
export function cabecalhosDoApp(textoDaMeta: string): string {
  return [
    '/*',
    `  Content-Security-Policy: ${politicaDoCabecalho(textoDaMeta)}`,
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Strict-Transport-Security: max-age=31536000',
    '  X-Robots-Tag: noindex',
    '',
  ].join('\n')
}

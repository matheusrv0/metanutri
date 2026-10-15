// O ambiente do `npm run test:csp` (spec seguranca-lote-4, CA-486), lido pela configuração do Playwright, pela do Vite
// da bancada e pelo teste.
import { fileURLToPath, URL } from 'node:url'

//
// A URL do Supabase é a pública do site no ar, para a regra sair igual à publicada; a chave anon fica `desligado`, então
// nada conversa com o banco. As chaves do pagamento e da verificação são as de TESTE, públicas: a do Mercado Pago não
// cobra nada, e a do Cloudflare sempre aprova.
export const AMBIENTE_DO_TESTE_CSP = {
  VITE_SUPABASE_URL: 'https://qmpljfjbdcrdbqutuvmg.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'desligado',
  VITE_MERCADOPAGO_PUBLIC_KEY: 'APP_USR-5178310a-e7c1-47e6-867e-d9bb01fc0f5d',
  VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
} as const

export const PORTA_DO_SITE = 4174
export const PORTA_DA_BANCADA = 4175
export const ENDERECO_DO_SITE = `http://localhost:${PORTA_DO_SITE}`
export const ENDERECO_DA_BANCADA = `http://localhost:${PORTA_DA_BANCADA}`

/** Onde o Vite monta a bancada (e2e-csp/vite.config.ts) e de onde o teste a serve no domínio de produção. */
export const PASTA_DA_BANCADA = fileURLToPath(new URL('../node_modules/.tmp/csp-bancada', import.meta.url))

/**
 * DP-CSP-7: o antifraude do Mercado Pago escolhe o host pelo domínio da página. O teste do cartão abre a bancada neste
 * endereço, interceptado pelo Playwright: nada sai para o domínio de verdade.
 */
export const DOMINIO_DE_PRODUCAO = 'https://metanutri.com.br'

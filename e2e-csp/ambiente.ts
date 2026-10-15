// O ambiente do `npm run test:csp` (spec seguranca-lote-4, CA-486), lido pela configuração do Playwright e pelo teste.
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

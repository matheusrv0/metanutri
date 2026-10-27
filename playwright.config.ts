import { defineConfig, devices } from '@playwright/test'
import { CHAVE_FALSA, ENDERECO_FALSO } from './e2e/apoio/servidorFalso.ts'
import { AMBIENTE_DO_TESTE_CSP } from './e2e-csp/ambiente.ts'

const PORTA = 4173
/** O segundo app de teste, com o servidor de conta falso (spec revisao-geral-publica, D-233). */
const PORTA_COM_CONTA = 4176
const SAIDA_COM_CONTA = 'node_modules/.tmp/e2e-servidor-falso'
/** O site público (spec separacao-site-app, DP-SA-17): leva ao app com conta falsa; os dois apps levam a ele. */
const PORTA_DO_SITE = 4178
const SAIDA_DO_SITE = 'node_modules/.tmp/e2e-site'

const SITE = `http://localhost:${PORTA_DO_SITE}`
const APP_COM_CONTA = `http://localhost:${PORTA_COM_CONTA}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /(servidor-falso|site)[\\/]/ },
    // D-233: as telas que só existem com o servidor de conta ligado (Completar cadastro, Comprovar matrícula, o
    // checkout com sessão, o link lido da nuvem). O Playwright responde pelo endereço falso; nada sai da máquina.
    {
      name: 'servidor-falso',
      testDir: './e2e/servidor-falso',
      use: { ...devices['Desktop Chrome'], baseURL: APP_COM_CONTA },
    },
    // Spec separacao-site-app (DP-SA-17): o site público, num endereço próprio, que leva ao app com conta falsa.
    {
      name: 'site',
      testDir: './e2e/site',
      use: { ...devices['Desktop Chrome'], baseURL: SITE },
    },
    // A mudança dos dados também no Firefox e no WebKit (o Safari separa as abas de outro jeito, R-512).
    {
      name: 'site-firefox',
      testDir: './e2e/site',
      testMatch: /mudanca\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'], baseURL: SITE },
    },
    {
      name: 'site-webkit',
      testDir: './e2e/site',
      testMatch: /mudanca\.spec\.ts$/,
      use: { ...devices['Desktop Safari'], baseURL: SITE },
    },
  ],
  // M-8 (spec revisao-geral-publica, D-233): nenhum dos servidores reaproveita um que já esteja na porta. Um
  // `vite preview` esquecido, de outra worktree ou de um build antigo, faria o teste rodar contra o site errado em
  // silêncio; com a porta ocupada, o Playwright para e diz isso.
  webServer: [
    {
      command: `npm run build:app && npx vite preview --port ${PORTA} --strictPort`,
      url: `http://localhost:${PORTA}`,
      reuseExistingServer: false,
      timeout: 240_000,
      // Sem servidor de conta nos testes de navegador: o app abre no modo local
      // (SPEC CA-150), mesmo que exista um .env.local com as chaves nesta máquina.
      // Sem a verificação contra robôs também (spec seguranca-lote-3, CA-463 e R-45):
      // o script do Cloudflare nunca carrega aqui.
      env: {
        VITE_SUPABASE_URL: 'desligado',
        VITE_SUPABASE_ANON_KEY: 'desligado',
        VITE_TURNSTILE_SITE_KEY: 'desligado',
        VITE_ENDERECO_DO_APP: `http://localhost:${PORTA}`,
        VITE_ENDERECO_DO_SITE: SITE,
      },
    },
    {
      // Num build e numa pasta próprios: o `dist/` do site de cima fica intacto. Sem a verificação contra robôs. A
      // chave do pagamento é a pública de TESTE (a mesma do `npm run test:csp`), para o checkout desenhar o formulário
      // do cartão; o script da operadora é respondido pelo servidor falso e nunca sai da máquina.
      command: `npx vite build --outDir ${SAIDA_COM_CONTA} --emptyOutDir && npx vite preview --outDir ${SAIDA_COM_CONTA} --port ${PORTA_COM_CONTA} --strictPort`,
      url: APP_COM_CONTA,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        VITE_SUPABASE_URL: ENDERECO_FALSO,
        VITE_SUPABASE_ANON_KEY: CHAVE_FALSA,
        VITE_TURNSTILE_SITE_KEY: 'desligado',
        VITE_MERCADOPAGO_PUBLIC_KEY: AMBIENTE_DO_TESTE_CSP.VITE_MERCADOPAGO_PUBLIC_KEY,
        VITE_ENDERECO_DO_APP: APP_COM_CONTA,
        VITE_ENDERECO_DO_SITE: SITE,
      },
    },
    {
      // Spec separacao-site-app: o site, com as chaves do app no ambiente, de propósito: o pacote servido não pode
      // levar nenhuma (CA-1406, DP-SA-48).
      command: `npx vite build --mode site --outDir ${SAIDA_DO_SITE} --emptyOutDir && npx vite preview --mode site --outDir ${SAIDA_DO_SITE} --port ${PORTA_DO_SITE} --strictPort`,
      url: SITE,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        VITE_SUPABASE_URL: ENDERECO_FALSO,
        VITE_SUPABASE_ANON_KEY: CHAVE_FALSA,
        VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
        VITE_MERCADOPAGO_PUBLIC_KEY: AMBIENTE_DO_TESTE_CSP.VITE_MERCADOPAGO_PUBLIC_KEY,
        VITE_ENDERECO_DO_APP: APP_COM_CONTA,
        VITE_ENDERECO_DO_SITE: SITE,
      },
    },
  ],
})

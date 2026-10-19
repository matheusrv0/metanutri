import { defineConfig, devices } from '@playwright/test'
import { CHAVE_FALSA, ENDERECO_FALSO } from './e2e/apoio/servidorFalso.ts'

const PORTA = 4173
/** O segundo site de teste, com o servidor de conta falso (spec revisao-geral-publica, D-233). */
const PORTA_COM_CONTA = 4176
const SAIDA_COM_CONTA = 'node_modules/.tmp/e2e-servidor-falso'

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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /servidor-falso[\\/]/ },
    // D-233: as telas que só existem com o servidor de conta ligado (Completar cadastro, Comprovar matrícula, o
    // checkout com sessão, o link lido da nuvem). O Playwright responde pelo endereço falso; nada sai da máquina.
    {
      name: 'servidor-falso',
      testDir: './e2e/servidor-falso',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PORTA_COM_CONTA}` },
    },
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
      url: `http://localhost:${PORTA}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
      // Sem servidor de conta nos testes de navegador: o app abre no modo local
      // (SPEC CA-150), mesmo que exista um .env.local com as chaves nesta máquina.
      // Sem a verificação contra robôs também (spec seguranca-lote-3, CA-463 e R-45):
      // o script do Cloudflare nunca carrega aqui.
      env: { VITE_SUPABASE_URL: 'desligado', VITE_SUPABASE_ANON_KEY: 'desligado', VITE_TURNSTILE_SITE_KEY: 'desligado' },
    },
    {
      // Num build e numa pasta próprios: o `dist/` do site de cima fica intacto. Sem a chave do pagamento e sem a
      // verificação contra robôs, como o site de cima: nenhum script de fora carrega.
      command: `npx vite build --outDir ${SAIDA_COM_CONTA} --emptyOutDir && npx vite preview --outDir ${SAIDA_COM_CONTA} --port ${PORTA_COM_CONTA} --strictPort`,
      url: `http://localhost:${PORTA_COM_CONTA}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
      env: {
        VITE_SUPABASE_URL: ENDERECO_FALSO,
        VITE_SUPABASE_ANON_KEY: CHAVE_FALSA,
        VITE_TURNSTILE_SITE_KEY: 'desligado',
        VITE_MERCADOPAGO_PUBLIC_KEY: ' ',
      },
    },
  ],
})

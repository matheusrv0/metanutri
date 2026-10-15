import { defineConfig, devices } from '@playwright/test'
import { AMBIENTE_DO_TESTE_CSP, ENDERECO_DA_BANCADA, ENDERECO_DO_SITE, PORTA_DA_BANCADA, PORTA_DO_SITE } from './e2e-csp/ambiente.ts'

/**
 * `npm run test:csp` (spec seguranca-lote-4, CA-486): a regra de conteúdo com os scripts de verdade do Mercado Pago e
 * do Cloudflare, baixados pela rede. Por isso fica fora do `npx playwright test` de sempre.
 *
 * Dois servidores, cada um com o seu build numa pasta própria (o `dist/` do Playwright de sempre fica intacto): o site,
 * com a chave de teste da verificação contra robôs, e a bancada de e2e-csp/bancada, com os campos do cartão. Os dois
 * builds passam pelo mesmo plugin, com o mesmo ambiente: a mesma <meta>.
 */
const SAIDA_DO_SITE = 'node_modules/.tmp/csp-site'

export default defineConfig({
  testDir: './e2e-csp',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npx vite build --outDir ${SAIDA_DO_SITE} --emptyOutDir && npx vite preview --outDir ${SAIDA_DO_SITE} --port ${PORTA_DO_SITE} --strictPort`,
      url: ENDERECO_DO_SITE,
      reuseExistingServer: false,
      timeout: 180_000,
      env: AMBIENTE_DO_TESTE_CSP,
    },
    {
      command: `npx vite build --config e2e-csp/vite.config.ts && npx vite preview --config e2e-csp/vite.config.ts --port ${PORTA_DA_BANCADA} --strictPort`,
      url: ENDERECO_DA_BANCADA,
      reuseExistingServer: false,
      timeout: 180_000,
      env: AMBIENTE_DO_TESTE_CSP,
    },
  ],
})

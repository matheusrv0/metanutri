import { defineConfig, devices } from '@playwright/test'

const PORTA = 4173

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
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
})

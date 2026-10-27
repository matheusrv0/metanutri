/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { AlvoDoBuild } from './src/seguranca/csp.ts'
import { pluginPoliticaDeConteudo } from './src/seguranca/pluginCsp.ts'
import { opcoesDoAplicativo, pluginAlvo } from './src/seo/pluginAlvo.ts'
import { pluginSeo } from './src/seo/pluginSeo.ts'

// O manifest do PWA é JSON puro: não lê var(). Estes dois espelham
// --mesa e --ink-800 de design-system/tokens/tokens.css — mudou lá, muda aqui.
const CORES_DO_APLICATIVO = { fundo: '#f1f0f0', tema: '#232a33' }

// Spec separacao-site-app, DP-SA-1: `vite build` monta o app em dist/; `vite build --mode site`, o site público em
// dist-site/. Os testes (Vitest, Playwright, `npm run test:csp`) continuam montando o app.
export default defineConfig(({ mode }) => {
  const alvo: AlvoDoBuild = mode === 'site' ? 'site' : 'app'
  return {
    // Caminho relativo: o mesmo build serve em localhost e numa subpasta (GitHub Pages).
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // CB-10: depois do primeiro acesso, o planejador abre e calcula sem internet. No site, só o service worker que se
      // desliga (spec separacao-site-app, DP-SA-13 e DP-SA-14); a configuração de cada alvo vive em src/seo/pluginAlvo.ts.
      VitePWA(opcoesDoAplicativo(alvo, CORES_DO_APLICATIVO)),
      // DP-SA-2: o index.html e a pasta de cada alvo.
      pluginAlvo(alvo),
      // D-135: a regra de conteúdo (CSP) numa <meta> do index.html, só no build. A regra vive em src/seguranca/csp.ts.
      // No app, também o _headers da Cloudflare (D-507); no site, a regra menor (D-502).
      pluginPoliticaDeConteudo(alvo),
      // D-331 (spec site-publico-profissional): a landing e as páginas de Preços, Termos, Privacidade e Fontes saem
      // pré-desenhadas, antes de o PWA montar o service worker. Só no site (DP-SA-1).
      ...(alvo === 'site' ? [pluginSeo()] : []),
    ],
    build: {
      outDir: alvo === 'site' ? 'dist-site' : 'dist',
      // DP-CSP-4: fonte pequena virava `data:` dentro do CSS; como arquivo, a CSP aceita fonte só do próprio site.
      assetsInlineLimit: (arquivo) => (arquivo.endsWith('.woff2') ? false : undefined),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // A biblioteca de design vive fora de src/: é consumida pelo app, não o contrário.
        '@ds': fileURLToPath(new URL('./design-system', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'design-system/**/*.test.{ts,tsx}'],
      // Os testes de interface usam userEvent em jsdom, que é lento por natureza.
      // Com 48 arquivos em paralelo eles passam de 5 s (o padrão do Vitest) por
      // disputa entre workers, não por lentidão de código: sozinhos rodam em ~1 s.
      testTimeout: 20000,
      css: false,
      // CA-463: os testes começam sem a verificação contra robôs, mesmo com a chave no .env.local desta
      // máquina. O teste que precisa dela liga a chave sozinho (vi.stubEnv).
      env: { VITE_TURNSTILE_SITE_KEY: 'desligado' },
    },
  }
})

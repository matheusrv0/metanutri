/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// O manifest do PWA é JSON puro: não lê var(). Estes dois espelham
// --bg-page e --ink-800 de design-system/tokens/tokens.css — mudou lá, muda aqui.
const COR_FUNDO_PWA = '#f2f2f3'
const COR_TEMA_PWA = '#232a33'

export default defineConfig({
  // Caminho relativo: o mesmo build serve em localhost e numa subpasta (GitHub Pages).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // CB-10: depois do primeiro acesso, o planejador abre e calcula sem internet.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'marca/*.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // A base de alimentos e as tabelas entram no pacote JavaScript: precisa caber no cache.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'MetaNutri — nutrição que diz o que comer',
        short_name: 'MetaNutri',
        description: 'Software de nutrição que diz o que comer: adequação de micronutrientes com o botão cobrir, macros ao vivo e missões para o paciente.',
        lang: 'pt-BR',
        start_url: './',
        display: 'standalone',
        background_color: COR_FUNDO_PWA,
        theme_color: COR_TEMA_PWA,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
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
  },
})

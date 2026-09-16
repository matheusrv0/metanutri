/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Caminho relativo: o mesmo build serve em localhost e numa subpasta (GitHub Pages).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // CB-10: depois do primeiro acesso, o planejador abre e calcula sem internet.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // A base de alimentos e as tabelas entram no pacote JavaScript: precisa caber no cache.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'MetaNutri — planejador alimentar',
        short_name: 'MetaNutri',
        description: 'Planejador alimentar para estudantes de nutrição: energia, macros e adequação de micronutrientes.',
        lang: 'pt-BR',
        start_url: './',
        display: 'standalone',
        background_color: '#fbfbf7',
        theme_color: '#12301c',
        icons: [{ src: 'icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})

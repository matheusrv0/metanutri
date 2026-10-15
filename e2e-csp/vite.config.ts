// A bancada da regra de conteúdo (spec seguranca-lote-4, CA-486): só o `npm run test:csp` monta esta página, e ela
// nunca vai para o site. O plugin é o mesmo do site, e o ambiente também (`envDir` na raiz): a <meta> sai igual.
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { pluginPoliticaDeConteudo } from '../src/seguranca/pluginCsp.ts'

export default defineConfig({
  root: fileURLToPath(new URL('./bancada', import.meta.url)),
  base: './',
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [pluginPoliticaDeConteudo()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL('../node_modules/.tmp/csp-bancada', import.meta.url)),
    emptyOutDir: true,
  },
})

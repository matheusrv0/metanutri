// A bancada da regra de conteúdo (spec seguranca-lote-4, CA-486): só o `npm run test:csp` monta esta página, e ela
// nunca vai para o site. O plugin é o mesmo do site, e o ambiente também (`envDir` na raiz): a <meta> sai igual.
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { pluginPoliticaDeConteudo } from '../src/seguranca/pluginCsp.ts'
import { PASTA_DA_BANCADA } from './ambiente.ts'

export default defineConfig({
  root: fileURLToPath(new URL('./bancada', import.meta.url)),
  base: './',
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [pluginPoliticaDeConteudo()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  build: {
    outDir: PASTA_DA_BANCADA,
    emptyOutDir: true,
  },
})

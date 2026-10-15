// A suíte de ataques com banco (spec seguranca-lote-4, D-136). Fica fora do `npm run check`: quem roda é
// scripts/testes-de-ataque.mjs (`npm run test:seguranca`), depois de subir o Supabase local.
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  // Os arquivos .env vêm desta pasta, que não tem nenhum: a suíte nunca carrega o .env.local da raiz.
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['testes/seguranca/**/*.test.ts'],
    environment: 'node',
    // Um arquivo por vez: as contas de teste são criadas por arquivo e o banco é um só.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})

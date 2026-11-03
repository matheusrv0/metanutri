// Gera os ícones do "Meu plano", o link do paciente instalado na tela inicial (spec lado-do-paciente, D-1213 e
// DP-LP-2): o símbolo da marca (public/marca/simbolo.svg) sobre o marfim, como no protótipo aprovado. Quatro arquivos:
//   public/meu-plano-192.png e meu-plano-512.png (o manifesto, com o canto que o sistema arredonda);
//   public/meu-plano-maskable-512.png (Android, o símbolo dentro da zona segura de 80%);
//   public/apple-touch-icon-meu-plano.png (iPhone, 180 × 180, sem transparência).
// As cores repetem design-system/tokens/tokens.css (--ivory); mudou lá, rode de novo.
//
// Uso: node scripts/icone-meu-plano.mjs
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const raiz = new URL('../', import.meta.url)
const arquivo = (caminho) => fileURLToPath(new URL(caminho, raiz))

const MARFIM = '#f6f2ea'
const simbolo = readFileSync(arquivo('public/marca/simbolo.svg'), 'utf8')

/** O ícone num quadrado de `lado` px, com o símbolo ocupando `fracao` do lado. */
const pagina = (lado, fracao) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: ${lado}px; height: ${lado}px; background: ${MARFIM}; display: grid; place-items: center; }
  svg { width: ${Math.round(lado * fracao)}px; height: ${Math.round(lado * fracao)}px; display: block; }
</style>
</head>
<body>${simbolo}</body>
</html>`

const ICONES = [
  { saida: 'public/meu-plano-192.png', lado: 192, fracao: 0.78 },
  { saida: 'public/meu-plano-512.png', lado: 512, fracao: 0.78 },
  // A zona segura do ícone mascarável é o círculo de 80% do lado: o símbolo fica em 56%.
  { saida: 'public/meu-plano-maskable-512.png', lado: 512, fracao: 0.56 },
  { saida: 'public/apple-touch-icon-meu-plano.png', lado: 180, fracao: 0.72 },
]

const navegador = await chromium.launch()
try {
  for (const { saida, lado, fracao } of ICONES) {
    const aba = await navegador.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 })
    await aba.setContent(pagina(lado, fracao))
    await aba.screenshot({ path: arquivo(saida), type: 'png', omitBackground: false })
    await aba.close()
    console.log(`${saida}: ${Math.round(statSync(arquivo(saida)).size / 1024)} KB`)
  }
} finally {
  await navegador.close()
}

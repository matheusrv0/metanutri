// Gera a imagem das prévias de link (WhatsApp, redes, buscadores): public/imagem-compartilhar.png, 1200 × 630
// (spec site-publico-profissional, D-329, CA-1010). Só a marca: o símbolo de public/marca, o nome na Bricolage, como na
// Logo, e uma frase na Manrope, sobre o teal da marca. As cores repetem design-system/tokens/tokens.css
// (--teal-900 e --ivory); mudou lá, rode de novo.
//
// Uso: node scripts/imagem-de-compartilhar.mjs
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const raiz = new URL('../', import.meta.url)
const arquivo = (caminho) => fileURLToPath(new URL(caminho, raiz))
// A página nasce em about:blank, que não lê arquivo do disco: a fonte vai embutida.
const fonte = (caminho) => `data:font/woff2;base64,${readFileSync(arquivo(caminho)).toString('base64')}`

const TEAL = '#0e3b43'
const MARFIM = '#f6f2ea'
const simbolo = readFileSync(arquivo('public/marca/simbolo-fundo-escuro.svg'), 'utf8')

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: 'Marca'; src: url('${fonte('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')}') format('woff2'); font-weight: 200 800; }
  @font-face { font-family: 'Texto'; src: url('${fonte('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2')}') format('woff2'); font-weight: 200 800; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${TEAL}; color: ${MARFIM}; display: flex; flex-direction: column; justify-content: center; padding: 0 104px; }
  .marca { display: flex; align-items: center; gap: 28px; }
  .marca svg { width: 132px; height: 132px; flex: none; }
  .nome { font-family: 'Marca'; font-weight: 700; font-size: 104px; letter-spacing: -0.035em; line-height: 1; }
  .frase { margin-top: 44px; max-width: 900px; font-family: 'Texto'; font-weight: 500; font-size: 42px; line-height: 1.25; letter-spacing: -0.01em; opacity: 0.86; }
  .endereco { position: absolute; left: 104px; bottom: 56px; font-family: 'Texto'; font-weight: 600; font-size: 24px; opacity: 0.6; }
</style>
</head>
<body>
  <div class="marca">${simbolo}<span class="nome">MetaNutri</span></div>
  <p class="frase">Software de nutrição que diz o que comer.</p>
  <p class="endereco">metanutri.com.br</p>
</body>
</html>`

const navegador = await chromium.launch()
try {
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await pagina.setContent(html)
  await pagina.evaluate('document.fonts.ready')
  const saida = arquivo('public/imagem-compartilhar.png')
  await pagina.screenshot({ path: saida, type: 'png' })
  console.log(`public/imagem-compartilhar.png: ${Math.round(statSync(saida).size / 1024)} KB`)
} finally {
  await navegador.close()
}

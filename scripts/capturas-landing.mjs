// Gera as capturas do "O diferencial" da landing a partir do próprio app (spec estilo-spora, CA-115):
// a gaveta do Cobrir e a tela de missões do paciente, nos temas claro e escuro, em 2x.
//
// Uso: com o app servido sem servidor de conta (modo local), por exemplo
//   npx vite build && VITE_SUPABASE_URL=desligado VITE_SUPABASE_ANON_KEY=desligado npx vite preview --port 4173
// rode:  node scripts/capturas-landing.mjs [http://localhost:4173]
// As imagens saem em public/imagens/ (cobrir-claro.png, cobrir-escuro.png, missoes-claro.png, missoes-escuro.png).
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const SAIDA = new URL('../public/imagens/', import.meta.url)
const CHAVE_TEMA = 'metanutri:tema'

/** Abre o app limpo, no tema pedido, e fecha o aviso de boas-vindas. */
async function abrirLimpo(pagina, tema) {
  await pagina.goto(`${BASE}/`)
  await pagina.evaluate(([chave, valor]) => {
    localStorage.clear()
    localStorage.setItem(chave, valor)
  }, [CHAVE_TEMA, tema])
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

/** Plano da Ana com café da manhã, almoço e jantar (as missões saem das refeições com alimento), com os alimentos do exemplo. */
const ALIMENTOS = [
  ['Café da manhã', '70 pao frances'],
  ['Café da manhã', '120 mamao formosa'],
  ['Almoço', '150 arroz tipo 1 cozido'],
  ['Almoço', '100 feijao carioca cozido'],
  ['Jantar', '150 arroz tipo 1 cozido'],
]

async function montarPlano(pagina) {
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await pagina.getByLabel('Nome do plano', { exact: true }).fill('Ana, 30 anos')
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('30')
  await pagina.getByLabel('Peso', { exact: true }).fill('60')
  await pagina.getByLabel('Estatura', { exact: true }).fill('165')
  await pagina.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  for (const [refeicao, entrada] of ALIMENTOS) {
    const campo = pagina.getByRole('combobox', { name: `Adicionar alimento em Principal de ${refeicao}` })
    await campo.fill(entrada)
    await pagina.getByRole('listbox').getByRole('option').first().waitFor()
    await campo.press('Enter')
  }
}

/** Recorte de uma área da página, com margem, sem passar da borda. Diz o tamanho em px de CSS (TelaInicio reserva ele). */
async function recortar(pagina, caixa, arquivo) {
  const inteira = { x: Math.round(caixa.x), y: Math.round(caixa.y), width: Math.round(caixa.width), height: Math.round(caixa.height) }
  await pagina.screenshot({ path: fileURLToPath(new URL(arquivo, SAIDA)), clip: inteira, animations: 'disabled', caret: 'hide' })
  console.log(`escrevi public/imagens/${arquivo} (${inteira.width} × ${inteira.height})`)
}

async function capturar(navegador, tema, sufixo) {
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    colorScheme: tema === 'escuro' ? 'dark' : 'light',
  })
  const pagina = await contexto.newPage()
  await abrirLimpo(pagina, tema)
  await montarPlano(pagina)

  // O link das missões sai da etapa 2; guardo o endereço antes de ir para a adequação.
  const cartao = pagina.getByRole('region', { name: 'Link do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const link = await cartao.getByLabel('Endereço do link').inputValue()

  // Gaveta do Cobrir para o cálcio: do topo até o fim da segunda sugestão.
  await pagina.getByRole('button', { name: /Próxima etapa: Adequação/ }).click()
  await pagina.getByRole('row').filter({ hasText: 'Cálcio' }).first().getByRole('button', { name: 'Cobrir' }).click()
  const gaveta = pagina.getByRole('dialog')
  const sugestoes = gaveta.getByRole('list', { name: 'Sugestões para cobrir' }).getByRole('listitem')
  await sugestoes.nth(1).waitFor()
  // Correção C (D-487): a vitrine não mostra alimento cru que se come cozido. O quiabo cru (só existe cru na base, C.1
  // da parceira) sai pelo "Nunca sugerir" da própria gaveta, como a nutricionista faria; entra a próxima sugestão.
  for (const nome of ['Quiabo, cru']) {
    const botao = gaveta.getByRole('button', { name: `Nunca sugerir ${nome}` })
    if (await botao.isVisible().catch(() => false)) await botao.click()
  }
  // Sem foco nem cursor por cima de nenhum botão na foto.
  await pagina.evaluate(() => globalThis.document.activeElement?.blur?.())
  await pagina.mouse.move(1, 1)
  // A gaveta termina de deslizar e a lista para de mudar (o "Nunca sugerir" refaz a lista): espera duas leituras iguais.
  let caixaGaveta = null
  let segunda = null
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    await pagina.waitForTimeout(250)
    const [g, s] = [await gaveta.boundingBox(), await sugestoes.nth(1).boundingBox()]
    if (g && s && caixaGaveta && segunda && g.x === caixaGaveta.x && g.y === caixaGaveta.y && s.y === segunda.y && s.height === segunda.height) break
    caixaGaveta = g
    segunda = s
  }
  await recortar(
    pagina,
    { x: caixaGaveta.x, y: caixaGaveta.y, width: caixaGaveta.width, height: Math.round(segunda.y + segunda.height + 4 - caixaGaveta.y) },
    `cobrir-${sufixo}.png`,
  )

  // Missões do paciente no celular: duas marcadas, do topo até a última missão, inteira (I10 da revisão de 22/10: o
  // recorte de antes cortava a lista embaixo).
  await pagina.setViewportSize({ width: 390, height: 844 })
  await pagina.goto(link)
  await pagina.getByRole('heading', { name: /Suas missões de hoje, Ana/ }).waitFor()
  await pagina.getByRole('button', { pressed: false }).nth(0).click()
  await pagina.getByRole('button', { pressed: false }).nth(1).click()
  await pagina.waitForTimeout(300)
  const missoes = pagina.locator('button[aria-pressed]')
  const ultima = await missoes.nth((await missoes.count()) - 1).boundingBox()
  await pagina.setViewportSize({ width: 390, height: Math.max(844, Math.round(ultima.y + ultima.height + 40)) })
  await recortar(pagina, { x: 0, y: 0, width: 390, height: Math.round(ultima.y + ultima.height + 20) }, `missoes-${sufixo}.png`)

  await contexto.close()
}

const navegador = await chromium.launch()
try {
  await capturar(navegador, 'claro', 'claro')
  await capturar(navegador, 'escuro', 'escuro')
} finally {
  await navegador.close()
}

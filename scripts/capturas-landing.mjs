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

/** Plano da Ana com desjejum, almoço e jantar (as missões saem das refeições com alimento), com os alimentos do exemplo. */
const ALIMENTOS = [
  ['Desjejum', '70 pao frances'],
  ['Desjejum', '120 mamao formosa'],
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
  await pagina.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  for (const [refeicao, entrada] of ALIMENTOS) {
    const campo = pagina.getByRole('combobox', { name: `Adicionar alimento em Principal de ${refeicao}` })
    await campo.fill(entrada)
    await pagina.getByRole('option').first().waitFor()
    await campo.press('Enter')
  }
}

/** Recorte de uma área da página, com margem, sem passar da borda. */
async function recortar(pagina, caixa, arquivo) {
  await pagina.screenshot({ path: fileURLToPath(new URL(arquivo, SAIDA)), clip: caixa, animations: 'disabled', caret: 'hide' })
  console.log(`escrevi public/imagens/${arquivo}`)
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
  const cartao = pagina.getByRole('region', { name: 'Missões do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link das missões' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const link = await cartao.getByLabel('Link do paciente').inputValue()

  // Gaveta do Cobrir para o cálcio: do topo até o fim da segunda sugestão.
  await pagina.getByRole('button', { name: /Próxima etapa: Adequação/ }).click()
  await pagina.getByRole('row').filter({ hasText: 'Cálcio' }).first().getByRole('button', { name: 'Cobrir' }).click()
  const gaveta = pagina.getByRole('dialog')
  const sugestoes = gaveta.getByRole('list', { name: 'Sugestões para cobrir' }).getByRole('listitem')
  await sugestoes.nth(1).waitFor()
  await pagina.waitForTimeout(400) // a gaveta termina de deslizar
  const caixaGaveta = await gaveta.boundingBox()
  const segunda = await sugestoes.nth(1).boundingBox()
  await recortar(
    pagina,
    { x: caixaGaveta.x, y: caixaGaveta.y, width: caixaGaveta.width, height: Math.round(segunda.y + segunda.height + 4 - caixaGaveta.y) },
    `cobrir-${sufixo}.png`,
  )

  // Missões do paciente no celular: duas de cinco marcadas, do topo até a terceira missão.
  await pagina.setViewportSize({ width: 390, height: 844 })
  await pagina.goto(link)
  const missoes = pagina.getByRole('button', { pressed: false })
  await pagina.getByRole('heading', { name: /Suas missões de hoje, Ana/ }).waitFor()
  await missoes.nth(0).click()
  await pagina.getByRole('button', { pressed: false }).nth(1).click()
  await pagina.waitForTimeout(300)
  const terceira = await pagina.getByRole('button', { name: /Jantar/ }).boundingBox()
  await recortar(pagina, { x: 0, y: 0, width: 390, height: Math.round(terceira.y + terceira.height + 20) }, `missoes-${sufixo}.png`)

  await contexto.close()
}

const navegador = await chromium.launch()
try {
  await capturar(navegador, 'claro', 'claro')
  await capturar(navegador, 'escuro', 'escuro')
} finally {
  await navegador.close()
}

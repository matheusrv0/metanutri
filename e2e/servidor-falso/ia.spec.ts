// O assistente de IA de ponta a ponta, com a conta e a função sugerir-plano de mentira (spec assistente-ia, CA-2380 e
// CA-2381). A API da Anthropic nunca é chamada: o servidor falso responde pelo endereço do Supabase de teste.
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'
import { CASO_IA, CASO_IA_CHEIO, copiaDaContaComIa, PACIENTE_IA } from '../apoio/respostasIa.ts'
import { ENDERECO_FALSO, ligarServidorFalso, PERFIL_NUTRICIONISTA, type Cenario, type ServidorFalso } from '../apoio/servidorFalso.ts'

test.use({ reducedMotion: 'reduce' })

/** O CRN conferido: com ele a IA abre (D-1305). */
const PERFIL = { ...PERFIL_NUTRICIONISTA, crn_status: 'conferido' }

/** Abre a etapa Refeições do plano, com a conta falsa, e fecha os avisos de primeiro acesso. */
async function abrirPlano(pagina: Page, cenario: Cenario = {}, casoId = CASO_IA): Promise<ServidorFalso> {
  const servidor = await ligarServidorFalso(pagina, { sessao: true, perfil: PERFIL, copia: copiaDaContaComIa(), ia: 'sugestao', ...cenario })
  // A cópia da nuvem chega à cópia de trabalho depois da primeira tela; com ela guardada, a página abre de novo no plano.
  await pagina.goto('/#/casos')
  await expect.poll(() => pagina.evaluate((id) => Object.keys(localStorage).some((k) => k.endsWith(`:caso:${id}`)), casoId), { timeout: 20_000 }).toBe(true)
  await pagina.goto(`/#/caso/${casoId}/plano`)
  await pagina.reload()
  const aviso = pagina.getByRole('dialog')
  const botao = pagina.getByRole('button', { name: 'Modelos de plano' })
  await expect(botao.or(aviso).first()).toBeVisible({ timeout: 20_000 })
  for (let vez = 0; vez < 3; vez++) {
    await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
    if (!(await aviso.isVisible())) break
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(aviso).toBeHidden()
  }
  await expect(botao).toBeVisible()
  return servidor
}

const gaveta = (pagina: Page, nome = 'Sugerir plano com IA') => pagina.getByRole('complementary', { name: nome }).or(pagina.getByRole('dialog', { name: nome }))

test('CA-2380: a sugestão chega conferida; a alergia e o id fora da base saem com o motivo, e o pedido não leva nome nem contato', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const servidor = await abrirPlano(page)
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await expect(g.getByText('7 de 20 sugestões em', { exact: false })).toBeVisible()
  await g.getByLabel('Alimentos de que gosta').fill('cuscuz, frango, frutas')
  await g.getByRole('button', { name: 'Sugerir plano' }).click()

  await expect(g.getByRole('group', { name: 'Totais calculados pelo app' })).toBeVisible()
  await expect(g.getByText('Alergia: leite e derivados').first()).toBeVisible()
  await expect(g.getByText('Alimento fora da base')).toBeVisible()
  await expect(g.getByText('8 de 20 sugestões em', { exact: false })).toBeVisible()

  const pedido = JSON.stringify(servidor.pedidosDaIa.find((p) => p['modo'] === 'gerar'))
  for (const segredo of ['Camila', 'Freitas', '99999-1234', 'camila.freitas@exemplo.com', '1997-05-10']) expect(pedido, segredo).not.toContain(segredo)
  expect(pedido).toContain('"pacienteId":"pac-camila"')

  await g.getByRole('button', { name: 'Usar como rascunho' }).click()
  await expect(g.getByText('O plano atual será substituído.')).toBeVisible()
  await g.getByRole('button', { name: 'Substituir' }).click()
  await expect(page.getByText('Sugestão da IA no plano, como rascunho.')).toBeVisible()
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(page.getByText('Sugestão da IA no plano, como rascunho.')).toBeHidden()
})

test('CA-2366 e CA-2401: a espera de 3 s, com o relógio e o aviso do Cancelar; cancelar volta ao pedido', async ({ page }) => {
  await abrirPlano(page, { ia: 'lento' })
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await g.getByRole('button', { name: 'Sugerir plano' }).click()
  await expect(g.getByText('Montando a sugestão. Leva de 1 a 2 minutos.')).toBeVisible()
  await expect(g.getByText('Cancelar só fecha a espera; se a IA terminar, conta no limite.')).toBeVisible()
  await g.getByRole('button', { name: 'Cancelar' }).click()
  await expect(g.getByRole('button', { name: 'Sugerir plano' })).toBeVisible()
})

test('CA-2374: o limite do mês, a recusa, o erro e a falta de rede, uma frase cada', async ({ page }) => {
  await abrirPlano(page, { ia: 'limite' })
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await expect(g.getByText(/^As 20 sugestões de .+ foram usadas\. Renovam em 1º de .+\.$/)).toBeVisible()
  await expect(g.getByRole('button', { name: 'Ver planos' })).toBeVisible()
  await expect(g.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
})

for (const [cenario, frase, acao] of [
  ['recusa', 'A IA não respondeu a este pedido. Mude o texto do pedido e tente de novo.', 'Voltar ao pedido'],
  ['erro', 'As sugestões com IA estão indisponíveis agora. Tente mais tarde.', 'Fechar'],
  ['sem-rede', 'Não foi possível falar com o servidor. Confira a internet e tente de novo.', 'Tentar de novo'],
] as const) {
  test(`CA-2374: ${cenario}`, async ({ page }) => {
    await abrirPlano(page, { ia: cenario })
    await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
    const g = gaveta(page)
    await g.getByRole('button', { name: 'Sugerir plano' }).click()
    await expect(g.getByText(frase)).toBeVisible()
    // "Fechar" também é o nome do X do topo da gaveta: vale o do rodapé.
    await expect(g.getByRole('button', { name: acao, exact: true }).last()).toBeVisible()
  })
}

test('CA-2370 a CA-2372: o adequar mostra o efeito, o "Vai para …" no plano, a barrada e aplica as aceitas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await abrirPlano(page, {}, CASO_IA_CHEIO)
  await page.getByRole('button', { name: 'Adequar com IA' }).click()
  const g = gaveta(page, 'Adequar com IA')
  await expect(g.getByRole('heading', { name: 'O que ajustar' })).toBeVisible()
  await g.getByRole('button', { name: 'Sugerir ajustes' }).click()
  await expect(g.getByRole('table', { name: 'Efeito no plano' })).toBeVisible()
  await expect(g.getByText('Barrada', { exact: true })).toBeVisible()
  await expect(page.getByText('Vai para 50 g')).toBeVisible()
  await g.getByRole('button', { name: /^Aplicar \d+ mudanças$/ }).click()
  await expect(page.getByText(/^\d+ mudanças aplicadas\.$/)).toBeVisible()
})

test('CA-2381: em 360 px, a gaveta é a folha de baixo, nada rola para o lado e os botões cabem', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await abrirPlano(page)
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const folha = page.getByRole('dialog', { name: 'Sugerir plano com IA' })
  await expect(folha).toBeVisible()
  await semRolagemLateral(page)
  const botao = folha.getByRole('button', { name: 'Sugerir plano' })
  const caixa = await botao.boundingBox()
  expect(caixa).not.toBeNull()
  if (caixa) {
    expect(caixa.x).toBeGreaterThanOrEqual(0)
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(360)
    expect(caixa.height).toBeGreaterThanOrEqual(44)
  }
})

/** A ficha da Camila na cópia da conta que subiu (a que a função lê). */
function fichaDaCamila(gravacao: unknown): { readonly consentimentoIa: unknown } | undefined {
  const dados = (gravacao as { dados?: { dados?: Record<string, string> } } | null)?.dados?.dados?.['metanutri:pacientes'] ?? '[]'
  return (JSON.parse(dados) as { id: string; consentimentoIa: unknown }[]).find((p) => p.id === PACIENTE_IA)
}

test('CA-2403: a autorização ligada agora na gaveta sobe na cópia da conta antes do pedido à função', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const servidor = await abrirPlano(page, { copia: copiaDaContaComIa({ semAutorizacao: true }) })
  let naHoraDoPedido: unknown = null
  await page.route(`${ENDERECO_FALSO}/functions/v1/sugerir-plano`, async (route) => {
    if ((route.request().postDataJSON() as Record<string, unknown>)['modo'] !== 'uso') naHoraDoPedido = servidor.gravacoesDaCopia.at(-1) ?? null
    await route.fallback()
  })
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await expect(g.getByRole('button', { name: 'Sugerir plano' })).toBeDisabled()
  await g.getByRole('switch', { name: 'Paciente autorizou o uso de IA' }).click()
  await g.getByRole('button', { name: 'Sugerir plano' }).click()
  await expect(g.getByRole('group', { name: 'Totais calculados pelo app' })).toBeVisible()
  expect(fichaDaCamila(naHoraDoPedido)?.consentimentoIa).toMatchObject({ versao: 'ia-1' })
})

test('CA-2403: sem conseguir mandar a cópia, a gaveta diz a frase de sem conexão e nada é pedido', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const servidor = await abrirPlano(page, { copia: copiaDaContaComIa({ semAutorizacao: true }) })
  // A nuvem recusa gravar a cópia; a leitura continua.
  await page.route(`${ENDERECO_FALSO}/rest/v1/copias**`, (route) =>
    route.request().method() === 'GET' ? route.fallback() : route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"indisponivel"}' }),
  )
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await g.getByRole('switch', { name: 'Paciente autorizou o uso de IA' }).click()
  await g.getByRole('button', { name: 'Sugerir plano' }).click()
  await expect(g.getByText('Não foi possível falar com o servidor. Confira a internet e tente de novo.')).toBeVisible()
  expect(servidor.pedidosDaIa.filter((p) => p['modo'] !== 'uso')).toEqual([])
})

test('CA-2406: a sugestão usada no plano da Camila não deixa a faixa nem o "Desfazer" no plano da Patrícia', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await abrirPlano(page)
  await page.getByRole('button', { name: 'Sugerir plano com IA' }).click()
  const g = gaveta(page)
  await g.getByRole('button', { name: 'Sugerir plano' }).click()
  await g.getByRole('button', { name: 'Usar como rascunho' }).click()
  await g.getByRole('button', { name: 'Substituir' }).click()
  await expect(page.getByText('Sugestão da IA no plano, como rascunho.')).toBeVisible()
  // Como o histórico do navegador ou o endereço digitado: de um plano direto para o outro, sem passar por outra tela.
  await page.evaluate((id) => (location.hash = `#/caso/${id}/plano`), CASO_IA_CHEIO)
  await expect(page.getByRole('button', { name: 'Adequar com IA' })).toBeVisible()
  await expect(page.getByText('Sugestão da IA no plano, como rascunho.')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Desfazer' })).toBeHidden()
})

test('CA-2407: em 1024 px, a gaveta abre abaixo dos botões e acima das refeições, com o foco no título', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await abrirPlano(page)
  const botao = page.getByRole('button', { name: 'Sugerir plano com IA' })
  await botao.click()
  const g = page.getByRole('complementary', { name: 'Sugerir plano com IA' })
  await expect(g).toBeVisible()
  await expect(g.getByRole('heading', { name: 'Sugerir plano com IA' })).toBeFocused()
  await expect(botao).toBeInViewport()
  const caixaDoBotao = await botao.boundingBox()
  const caixaDaGaveta = await g.boundingBox()
  const caixaDaRefeicao = await page.getByRole('textbox', { name: /^Nome da refeição / }).first().boundingBox()
  expect(caixaDoBotao && caixaDaGaveta && caixaDaRefeicao).toBeTruthy()
  if (caixaDoBotao && caixaDaGaveta && caixaDaRefeicao) {
    expect(caixaDaGaveta.y).toBeGreaterThanOrEqual(caixaDoBotao.y + caixaDoBotao.height)
    expect(caixaDaRefeicao.y).toBeGreaterThanOrEqual(caixaDaGaveta.y + caixaDaGaveta.height)
  }
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('aside'))).toBe(true)
})

test('CA-2408 e CA-2411: em 360 px, a chave acerta o toque em 44 px e o Esc devolve o foco ao botão', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await abrirPlano(page, { copia: copiaDaContaComIa({ semAutorizacao: true }) })
  const botao = page.getByRole('button', { name: 'Sugerir plano com IA' })
  await botao.click()
  const folha = page.getByRole('dialog', { name: 'Sugerir plano com IA' })
  const chave = folha.getByRole('switch', { name: 'Paciente autorizou o uso de IA' })
  await chave.scrollIntoViewIfNeeded()
  const caixa = await chave.boundingBox()
  expect(caixa).not.toBeNull()
  if (caixa) {
    // D-802: a área de toque passa da caixa desenhada; 20 px acima do centro (44 px de altura) ainda é a chave.
    const centro = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 }
    const acima = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y - 20)?.getAttribute('role') ?? '', centro)
    expect(acima).toBe('switch')
  }
  await page.keyboard.press('Escape')
  await expect(folha).toBeHidden()
  await expect(botao).toBeFocused()
})

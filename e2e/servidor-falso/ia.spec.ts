// O assistente de IA de ponta a ponta, com a conta e a função sugerir-plano de mentira (spec assistente-ia, CA-2380 e
// CA-2381). A API da Anthropic nunca é chamada: o servidor falso responde pelo endereço do Supabase de teste.
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'
import { CASO_IA, CASO_IA_CHEIO, copiaDaContaComIa } from '../apoio/respostasIa.ts'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA, type Cenario, type ServidorFalso } from '../apoio/servidorFalso.ts'

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

test('CA-2381: em 390 px, a gaveta é a folha de baixo, nada rola para o lado e os botões cabem', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
    expect(caixa.x + caixa.width).toBeLessThanOrEqual(390)
    expect(caixa.height).toBeGreaterThanOrEqual(44)
  }
})

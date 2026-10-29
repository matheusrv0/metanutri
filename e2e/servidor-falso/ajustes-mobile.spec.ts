import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'
import { ligarServidorFalso, PEDIDO_RECUSADO, PERFIL_ESTUDANTE, PERFIL_NUTRICIONISTA, type Cenario } from '../apoio/servidorFalso.ts'

// Spec ajustes-mobile (CA-1800): as falhas do celular das telas com conta (Conta e assinatura, o aviso da estudante no
// Painel e a moldura das telas de conta), com os dados de pior caso da auditoria de 29/10/2026.

test.use({ reducedMotion: 'reduce' })

const ALTURA = 740
const EMAIL_LONGO = 'maria.aparecida.dos.santos.oliveira.nutricao2026@aluno.universidadefederal.edu.br'
const MATRICULA_LONGA = '2023123456789012345678'
const MOTIVO_LONGO =
  'o comprovante enviado não mostra o semestre atual nem o nome completo da estudante; envie a declaração de matrícula emitida pelo SIGAA nos últimos 30 dias, em PDF, com a assinatura digital da coordenação'

/** Abre a tela com a conta e fecha os avisos de primeiro acesso, um de cada vez. */
async function abrirComConta(pagina: Page, endereco: string, titulo: string, cenario: Cenario): Promise<void> {
  await ligarServidorFalso(pagina, cenario)
  await pagina.goto(endereco)
  const h1 = pagina.getByRole('heading', { level: 1, name: titulo })
  const aviso = pagina.getByRole('dialog')
  await expect(h1.or(aviso)).toBeVisible()
  for (let vez = 0; vez < 3; vez++) {
    await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
    if (!(await aviso.isVisible())) break
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(aviso).toBeHidden()
  }
  await expect(h1).toBeVisible()
}

const corte = (alvo: Locator) => alvo.evaluate((el) => ({ largura: el.scrollWidth - el.clientWidth, altura: el.scrollHeight - el.clientHeight }))

async function caixa(alvo: Locator) {
  const c = await alvo.boundingBox()
  if (!c) throw new Error('sem caixa')
  return c
}

for (const largura of [360, 412]) {
  test(`M-011: em ${largura} px, a matrícula longa do cartão Estudante quebra e não invade "Verificada em"`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await abrirComConta(page, '/#/conta', 'Conta e assinatura', {
      sessao: true,
      perfil: PERFIL_ESTUDANTE,
      pedidoEstudante: { ...PEDIDO_RECUSADO, matricula: MATRICULA_LONGA },
    })
    const matricula = page.getByText(MATRICULA_LONGA, { exact: true })
    await expect(matricula).toBeVisible()
    expect((await corte(matricula)).largura, 'a matrícula passa da coluna').toBeLessThanOrEqual(1)
    const vizinho = page.getByText('Verificada em', { exact: true }).locator('xpath=following-sibling::dd')
    const a = await caixa(matricula)
    const b = await caixa(vizinho)
    const sobrepoe = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
    expect(sobrepoe, 'a matrícula fica por cima de "Verificada em"').toBe(false)
    await semRolagemLateral(page)
  })

  test(`M-013: em ${largura} px, o aviso de comprovante recusado usa a largura do cartão, sem virar coluna estreita`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await abrirComConta(page, '/#/painel', 'Painel', {
      sessao: true,
      perfil: PERFIL_ESTUDANTE,
      pedidoEstudante: { ...PEDIDO_RECUSADO, motivo: MOTIVO_LONGO },
    })
    const aviso = page.getByRole('region', { name: 'Plano Estudante' })
    await expect(aviso).toBeVisible()
    const texto = aviso.getByText('Seu comprovante não foi aprovado').locator('xpath=..')
    const larguraDoTexto = (await caixa(texto)).width
    const larguraDoAviso = (await caixa(aviso)).width
    expect(larguraDoTexto / larguraDoAviso, 'o texto ficou numa coluna estreita').toBeGreaterThanOrEqual(0.6)
    // O botão continua inteiro e na tela.
    const botao = aviso.getByRole('button', { name: 'Enviar outro' })
    const c = await caixa(botao)
    expect(c.x + c.width).toBeLessThanOrEqual(largura)
    expect(c.height).toBeGreaterThanOrEqual(44)
    await semRolagemLateral(page)
  })
}

for (const largura of [360, 390, 412, 768]) {
  test(`M-024: em ${largura} px, o e-mail longo da conta aparece inteiro, sem reticências`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await abrirComConta(page, '/#/conta', 'Conta e assinatura', { sessao: true, perfil: PERFIL_NUTRICIONISTA, emailDaSessao: EMAIL_LONGO })
    const email = page.getByRole('main').getByText(EMAIL_LONGO, { exact: true })
    await expect(email).toBeVisible()
    const c = await corte(email)
    expect(c.largura, 'e-mail cortado').toBeLessThanOrEqual(1)
    expect(c.altura, 'e-mail cortado').toBeLessThanOrEqual(1)
    await semRolagemLateral(page)
  })
}

for (const largura of [360, 390, 412]) {
  test(`M-028: em ${largura} px, Entrar mostra o formulário e o plano como dois cartões de canto arredondado`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await ligarServidorFalso(page)
    await page.goto('/#/entrar')
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
    const formulario = page.getByRole('main')
    const lado = page.getByRole('complementary')
    const raios = await formulario.evaluate((el) => {
      const e = getComputedStyle(el)
      return [e.borderTopLeftRadius, e.borderTopRightRadius, e.borderBottomLeftRadius, e.borderBottomRightRadius].map(parseFloat)
    })
    for (const raio of raios) expect(raio, 'canto reto no cartão do formulário').toBeGreaterThanOrEqual(16)
    const f = await caixa(formulario)
    const l = await caixa(lado)
    expect(l.y - (f.y + f.height), 'os dois cartões encostam').toBeGreaterThanOrEqual(8)
    await semRolagemLateral(page)
  })
}

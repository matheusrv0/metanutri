import { expect, test, type Page } from '@playwright/test'

/** Spec vitaminas-usda: as cinco do USDA no navegador (CA-969, CB-309). */

const abrirLimpo = async (pagina: Page, rota: string) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto(rota)
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const abrirFichaDoSalmao = async (pagina: Page) => {
  await abrirLimpo(pagina, '/#/alimentos')
  await pagina.getByRole('searchbox', { name: 'Buscar alimento na tabela' }).fill('salmão sem pele grelhado')
  await pagina.getByRole('list', { name: 'Alimentos da tabela' }).getByRole('button').first().click()
}

test('CA-969: a ficha do salmão mostra a marca USDA e de onde veio o valor', async ({ page }) => {
  await abrirFichaDoSalmao(page)
  const composicao = page.getByRole('list', { name: 'Composição' })
  await expect(composicao.getByRole('listitem').filter({ hasText: 'vitamina D' })).toContainText('13 µgUSDA')
  await expect(page.getByText('Os valores marcados USDA são do alimento equivalente nº 175168 do USDA FoodData Central (SR Legacy, abril de 2018).')).toBeVisible()
})

test('CA-969: a etapa 3 do exemplo tem a vitamina D, e o Cobrir dela sugere alimentos', async ({ page }) => {
  await abrirLimpo(page, '/#/painel')
  await page.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
  await page.getByRole('region', { name: 'Micronutrientes' }).getByRole('button', { name: 'Ver todos' }).click()
  const linha = page.getByRole('row').filter({ hasText: 'Vitamina D' })
  await expect(linha).toContainText(/\d+% da referência · abaixo da meta/)
  await linha.getByRole('button', { name: 'Cobrir Vitamina D' }).click()
  const sugestoes = page.getByRole('dialog').getByRole('list', { name: 'Sugestões para cobrir' }).getByRole('listitem')
  await expect(sugestoes.first()).toBeVisible()
  expect(await sugestoes.count()).toBeGreaterThan(0)
})

test('CB-309: em 360 px, a ficha com as seis do USDA não rola para o lado', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await abrirFichaDoSalmao(page)
  const gaveta = page.getByRole('dialog')
  await expect(gaveta.getByRole('list', { name: 'Composição' }).getByText('gordura trans')).toBeAttached()
  const larguras = await gaveta.evaluate((el) => ({ conteudo: el.scrollWidth, caixa: el.clientWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.caixa)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

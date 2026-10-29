import { expect, test, type Page } from '@playwright/test'

/** Spec base-ampliada no navegador: a tilápia na busca e no plano, a ficha, o Cobrir e o pedaço separado (CA-1712, CA-1716 a CA-1718, CA-1724). */

const abrirLimpo = async (pagina: Page, rota: string) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto(rota)
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const abrirExemplo = async (pagina: Page) => {
  await abrirLimpo(pagina, '/#/painel')
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
}

test('CA-1716: a base ampliada vem num pedaço separado, pedido depois da página, e não no index', async ({ page }) => {
  const pedidos: string[] = []
  page.on('request', (r) => pedidos.push(r.url()))
  await abrirLimpo(page, '/#/alimentos')
  await expect(page.getByText(/^Base MetaNutri · 1\.?235 alimentos/)).toBeVisible()
  expect(pedidos.some((u) => /base-ampliada-[\w-]+\.js$/.test(u))).toBe(true)
  const html = await (await page.request.get('/')).text()
  expect(html).not.toMatch(/base-ampliada/)
})

test('CA-1712 e CA-1717: "150 tilápia" entra no almoço, e o plano reabre com ela depois de recarregar', async ({ page }) => {
  await abrirExemplo(page)
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('150 tilápia')
  const primeiro = page.getByRole('listbox', { name: 'Resultados para Adicionar alimento em Principal de Almoço' }).getByRole('option').first()
  await expect(primeiro).toContainText('Tilápia, filé, grelhada')
  await expect(primeiro).toContainText('150 g')
  await entrada.press('Enter')
  const almoco = page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })
  await expect(almoco).toContainText('Tilápia, filé, grelhada')

  await page.reload()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })).toContainText('Tilápia, filé, grelhada')
  await expect(page.getByText('Alimento removido')).toHaveCount(0)
})

test('CA-1718: a ficha da tilápia tem o filé de 87 g e a origem no rodapé', async ({ page }) => {
  await abrirLimpo(page, '/#/alimentos')
  await page.getByRole('searchbox', { name: 'Buscar alimento na tabela' }).fill('tilápia grelhada')
  await page.getByRole('list', { name: 'Alimentos da tabela' }).getByRole('button', { name: /^Tilápia, filé, grelhada/ }).click()
  await expect(page.getByRole('list', { name: 'Medidas caseiras' }).getByText('filé · 87 g')).toBeVisible()
  await expect(page.getByText('Valores do alimento nº 175177 do USDA FoodData Central (SR Legacy, abril de 2018): “Fish, tilapia, cooked, dry heat”.')).toBeVisible()
})

test('CA-1724: o Cobrir do ferro no exemplo traz o feijão-branco da base ampliada', async ({ page }) => {
  await abrirExemplo(page)
  await page.getByRole('region', { name: 'Micronutrientes' }).getByRole('button', { name: 'Ver todos' }).click()
  await page.getByRole('row').filter({ hasText: 'Ferro' }).getByRole('button', { name: 'Cobrir Ferro' }).click()
  const sugestoes = page.getByRole('dialog').getByRole('list', { name: 'Sugestões para cobrir' })
  await expect(sugestoes).toContainText('Feijão, branco, cozido')
  await expect(sugestoes).not.toContainText(/Tilápia, filé, crua|fígado/i)
})

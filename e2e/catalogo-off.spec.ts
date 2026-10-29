import { expect, test, type Page } from '@playwright/test'

/** Spec base-ampliada, fase 2, no navegador: o catálogo de rótulos na entrada rápida (CA-1755, CA-1756 e CA-1764). */

const abrirExemplo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/painel')
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
}

test('CA-1764: abrir o app e o plano não pede nada do catálogo; a primeira busca com 3 letras pede só o índice', async ({ page }) => {
  const pedidos: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('catalogo-off')) pedidos.push(r.url())
  })
  await abrirExemplo(page)
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('ne')
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })).toBeVisible()
  expect(pedidos).toEqual([])
  await entrada.fill('nescau')
  await expect(page.getByRole('option').filter({ hasText: 'rótulo' }).first()).toBeVisible()
  expect(pedidos.length).toBeGreaterThan(0)
  expect(pedidos.every((u) => /catalogo-off\/\d{4}-\d{2}-\d{2}\/indice\.json$/.test(u))).toBe(true)
})

test('CA-1755 e CA-1756: "40 nescau 2.0" mostra a marca e a porção, entra no almoço como cópia e continua depois de recarregar', async ({ page }) => {
  await abrirExemplo(page)
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('40 nescau 2.0')
  const produto = page.getByRole('listbox', { name: 'Resultados para Adicionar alimento em Principal de Almoço' }).getByRole('option', { name: /Nescau 2\.0/ })
  await expect(produto.first()).toContainText('rótulo')
  await expect(produto.first()).toContainText('Nestlé')
  await produto.first().click()
  const almoco = page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })
  await expect(almoco).toContainText('Nescau 2.0')
  await page.reload()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })).toContainText('Nescau 2.0')
  await expect(page.getByText('Alimento removido')).toHaveCount(0)
})

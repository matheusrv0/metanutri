import { expect, test, type Page } from '@playwright/test'

/**
 * Spec base-ampliada, CB-704 e D-716c (achado 2 da revisão): o primeiro acesso sem o pedaço da base ampliada. Sem
 * service worker, como o aparelho que ainda não guardou a base. A rede volta, e "Tentar de novo" abre o plano.
 */
test.use({ serviceWorkers: 'block' })

const abrirExemplo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/painel')
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
}

test('D-716c: sem o pedaço da base, o plano com tilápia avisa; com a rede de volta, "Tentar de novo" abre o plano', async ({ page }) => {
  await abrirExemplo(page)
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('150 tilápia')
  await expect(page.getByRole('listbox', { name: 'Resultados para Adicionar alimento em Principal de Almoço' }).getByRole('option').first()).toContainText('Tilápia')
  await entrada.press('Enter')
  const almoco = page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })
  await expect(almoco).toContainText('Tilápia, filé, grelhada')
  const endereco = page.url()

  // Sem rede para o pedaço da base: o plano espera e avisa, sem "Alimento removido".
  let bloquear = true
  await page.route(/base-ampliada-[\w-]+\.js$/, async (rota) => {
    if (bloquear) await rota.abort('internetdisconnected')
    else await rota.continue()
  })
  await page.goto(endereco)
  await page.reload()
  await expect(page.getByText('Não foi possível carregar a base de alimentos. Confira a conexão e tente de novo.')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Alimento removido')).toHaveCount(0)

  // A rede volta: um clique em "Tentar de novo" abre o plano, com a tilápia.
  bloquear = false
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })).toContainText('Tilápia, filé, grelhada', { timeout: 20_000 })
  await expect(page.getByText('Não foi possível carregar a base de alimentos')).toHaveCount(0)
})

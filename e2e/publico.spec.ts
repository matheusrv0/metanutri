import { expect, test } from '@playwright/test'

// As telas da vitrine (landing, Preços, Termos, Referências) passaram ao site: e2e/site/publico.spec.ts
// (spec separacao-site-app). Aqui fica o que é do app.

test('CA-367: o checkout não cita o processador e, sem conta na nuvem, não carrega o script dos campos seguros', async ({ page }) => {
  await page.goto('/#/assinar/solo/mensal')
  await expect(page.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeVisible()
  await expect(page.getByText('O servidor da conta não está configurado nesta instalação.')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
  await expect(page.locator('script[src*="mercadopago"]')).toHaveCount(0)
})

test('CA-431 e CA-1420: aberto dentro da moldura de outro site, só aparece o aviso com o link do app', async ({ page, baseURL }) => {
  await page.setContent(`<iframe title="outro site" src="${baseURL ?? ''}/#/entrar" style="width: 800px; height: 600px"></iframe>`)
  const moldura = page.frameLocator('iframe[title="outro site"]')
  await expect(moldura.getByText('Abra o MetaNutri direto no navegador.')).toBeVisible()
  // Nos testes, o endereço do app é o deste servidor (VITE_ENDERECO_DO_APP); no ar, https://app.metanutri.com.br/.
  const link = moldura.getByRole('link', { name: 'localhost:4173' })
  await expect(link).toHaveAttribute('href', 'http://localhost:4173/')
  await expect(link).toHaveAttribute('target', '_top')
  await expect(moldura.getByRole('heading')).toHaveCount(0)
  await expect(moldura.getByRole('button')).toHaveCount(0)
})

test('CA-431: aberto direto, o app abre normalmente', async ({ page }) => {
  await page.goto('/#/entrar')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Abra o MetaNutri direto no navegador.')).toHaveCount(0)
})

import { expect, test } from '@playwright/test'

test.describe('Landing (spec estilo-spora)', () => {
  test('CA-119 e CA-120: no celular de 360 px, sem rolagem para o lado e com o título inteiro na primeira tela', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/#/inicio')
    const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
    expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    const titulo = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(titulo).not.toBeNull()
    expect((titulo?.y ?? 0) + (titulo?.height ?? 0)).toBeLessThanOrEqual(740)
  })

  test('CA-1476 (spec landing-escura): as fotos da página carregam quando chegam à tela', async ({ page }) => {
    await page.goto('/#/inicio')
    for (const alt of [/Tomates e cenouras/, /Dois copos de leite/, /Salada com frango/]) {
      const foto = page.getByAltText(alt)
      // A foto dos legumes deriva sem parar (D-549): rola pelo DOM, sem esperar ela ficar parada.
      await foto.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await expect(foto).toBeVisible()
      // A foto aparece antes de terminar de carregar (decoding="async"): espera a largura real chegar, sem ler cedo demais.
      await expect.poll(() => foto.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
  })

  test('CA-1457 (spec landing-escura): "Como funciona", na barra, leva à seção; não há cartão de alimentos da base', async ({ page }) => {
    await page.goto('/#/inicio')
    await expect(page.getByRole('button', { name: /597/ })).toHaveCount(0)
    await page.getByRole('banner').getByRole('link', { name: 'Como funciona' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Como funciona' })).toBeInViewport()
  })
})

test('CA-322, CA-963 e CA-1483: Referências (antes Fontes da base) abre sem conta e cita as quatro fontes, com o USDA', async ({ page }) => {
  await page.goto('/#/fontes')
  await expect(page.getByRole('heading', { level: 1, name: 'Referências' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(4)
  await expect(page.getByRole('main').getByRole('link', { name: 'Abrir o FoodData Central' })).toBeVisible()
  await expect(page.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\)/)).toBeVisible()
})

test('CA-367: o checkout não cita o processador e, sem conta na nuvem, não carrega o script dos campos seguros', async ({ page }) => {
  await page.goto('/#/assinar/solo/mensal')
  await expect(page.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeVisible()
  await expect(page.getByText('O servidor da conta não está configurado nesta instalação.')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
  await expect(page.locator('script[src*="mercadopago"]')).toHaveCount(0)
})

test('CA-381: Preços e Termos não citam o processador', async ({ page }) => {
  await page.goto('/#/precos')
  await expect(page.getByRole('radiogroup', { name: 'Período de cobrança' }).first()).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)

  await page.goto('/#/termos')
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
})

test('CA-431: aberto dentro da moldura de outro site, só aparece o aviso com o link', async ({ page, baseURL }) => {
  await page.setContent(`<iframe title="outro site" src="${baseURL ?? ''}/#/inicio" style="width: 800px; height: 600px"></iframe>`)
  const moldura = page.frameLocator('iframe[title="outro site"]')
  await expect(moldura.getByText('Abra o MetaNutri direto no navegador.')).toBeVisible()
  const link = moldura.getByRole('link', { name: 'metanutri.com.br' })
  await expect(link).toHaveAttribute('href', 'https://metanutri.com.br/')
  await expect(link).toHaveAttribute('target', '_top')
  await expect(moldura.getByRole('heading')).toHaveCount(0)
  await expect(moldura.getByRole('button')).toHaveCount(0)
})

test('CA-431: aberto direto, o site abre normalmente', async ({ page }) => {
  await page.goto('/#/inicio')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Abra o MetaNutri direto no navegador.')).toHaveCount(0)
})

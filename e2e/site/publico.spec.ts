import { expect, test } from '@playwright/test'

// Spec separacao-site-app: a landing, Preços, Termos e Referências são páginas do site, cada uma no endereço dela.
test.describe('Landing (spec estilo-spora)', () => {
  test('CA-119 e CA-120: no celular de 360 px, sem rolagem para o lado e com o título inteiro na primeira tela', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/')
    const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
    expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    const titulo = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(titulo).not.toBeNull()
    expect((titulo?.y ?? 0) + (titulo?.height ?? 0)).toBeLessThanOrEqual(740)
  })

  test('CA-1476 (spec landing-escura): as fotos da página carregam quando chegam à tela', async ({ page }) => {
    await page.goto('/')
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
    await page.goto('/')
    await expect(page.getByRole('button', { name: /597/ })).toHaveCount(0)
    await page.getByRole('banner').getByRole('link', { name: 'Como funciona' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Como funciona' })).toBeInViewport()
  })
})

test('CA-322, CA-963, CA-1483 e CA-1721: Referências (antes Fontes da base) abre sem conta e cita as cinco fontes, com o USDA', async ({ page }) => {
  await page.goto('/fontes/')
  await expect(page.getByRole('heading', { level: 1, name: 'Referências' })).toBeVisible()
  // Spec base-ampliada, fase 2 (CA-1761): "Produtos de marca" traz também o link para os arquivos e a licença.
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(6)
  await expect(page.getByRole('heading', { name: 'Produtos de marca' })).toBeVisible()
  // O complemento de 20/10 e a base ampliada (spec base-ampliada, CA-1721) levam ao FoodData Central.
  await expect(page.getByRole('main').getByRole('link', { name: 'Abrir o FoodData Central' })).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Alimentos que a TACO não tem' })).toBeVisible()
  await expect(page.getByText(/Tabela Brasileira de Composição de Alimentos \(TACO\)/)).toBeVisible()
})

test('CA-381: Preços e Termos não citam o processador', async ({ page }) => {
  await page.goto('/precos/')
  await expect(page.getByRole('radiogroup', { name: 'Período de cobrança' }).first()).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)

  await page.goto('/termos/')
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
})

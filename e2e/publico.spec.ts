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

  test('CA-119: a foto do topo carrega', async ({ page }) => {
    await page.goto('/#/inicio')
    const foto = page.getByAltText(/Três pratos/)
    await expect(foto).toBeVisible()
    expect(await foto.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  })

  test('CA-116a: o cartão de 597 alimentos rola até as fontes dos dados', async ({ page }) => {
    await page.goto('/#/inicio')
    await page.getByRole('button', { name: /597/ }).click()
    await expect(page.getByRole('heading', { name: 'Fontes dos dados' })).toBeInViewport()
  })
})

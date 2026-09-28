import { expect, test } from '@playwright/test'

// Fundação visual da spec estilo-spora.
test.describe('Fundação visual', () => {
  test('CA-100: títulos em Urbanist, texto em Manrope e o nome em Bricolage', async ({ page }) => {
    await page.goto('/#/inicio')
    const fonte = (seletor: string) => page.locator(seletor).first().evaluate((el) => getComputedStyle(el).fontFamily)
    expect(await fonte('h1')).toContain('Urbanist')
    expect(await fonte('body')).toContain('Manrope')
    expect(await fonte('.font-marca')).toContain('Bricolage')
  })

  test('CA-102: fundo cinza de superfície e cartão com raio de 24 px', async ({ page }) => {
    await page.goto('/#/painel')
    const fundo = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fundo).toBe('rgb(241, 240, 240)')
    const raio = await page.locator('[data-slot="card"]').first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)
    expect(raio).toBe('24px')
  })
})

import { expect, test } from '@playwright/test'

// Fundação visual da spec estilo-spora.
test.describe('Fundação visual', () => {
  test('CA-100 / CA-384: títulos e texto em Manrope, só o nome em Bricolage', async ({ page }) => {
    await page.goto('/#/inicio')
    const fonte = (seletor: string) => page.locator(seletor).first().evaluate((el) => getComputedStyle(el).fontFamily)
    expect(await fonte('h1')).toContain('Manrope')
    expect(await fonte('h1')).not.toContain('Urbanist')
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

  test('CA-385 / CA-386: o fio do menu e o do cabeçalho na mesma altura, sem subtítulo nem tagline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/#/painel')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/#/pacientes')
    const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
    if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()

    const menu = page.getByRole('navigation', { name: 'Menu principal' })
    const marca = menu.locator('div').first()
    const cabecalho = page.getByRole('banner')
    await expect(cabecalho).toBeVisible()
    const baixoMarca = await marca.evaluate((el) => el.getBoundingClientRect().bottom)
    const baixoCabecalho = await cabecalho.evaluate((el) => el.getBoundingClientRect().bottom)
    expect(Math.abs(baixoMarca - baixoCabecalho)).toBeLessThanOrEqual(0.5)

    const cor = (el: Element) => getComputedStyle(el).borderBottomColor
    expect(await marca.evaluate(cor)).toBe(await cabecalho.evaluate(cor))

    await expect(menu.getByText('Planejador alimentar')).toHaveCount(0)
    await expect(cabecalho.getByText('Quem você atende')).toHaveCount(0)
  })
})

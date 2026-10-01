import { expect, test } from '@playwright/test'

test.describe('Caminhos da conta sem servidor (spec conta-e-verificacao)', () => {
  test('CA-259: Começar grátis leva ao cadastro do Free', async ({ page }) => {
    await page.goto('/#/inicio')
    await page.getByRole('banner').getByRole('button', { name: 'Começar grátis' }).click()
    await expect(page).toHaveURL(/#\/criar-conta$/)
    await expect(page.getByText('No Free você já tem')).toBeVisible()
  })

  test('CA-122: Assinar Solo no anual leva ao cadastro com o Solo anual marcado', async ({ page }) => {
    await page.goto('/#/precos')
    await page.getByRole('radio', { name: /Anual/ }).click()
    await page.getByRole('button', { name: 'Assinar Solo' }).first().click()
    await expect(page).toHaveURL(/#\/criar-conta\/solo\/anual$/)
    await expect(page.getByRole('img', { name: 'Passo 1 de 3' })).toBeVisible()
  })

  test('CA-265 e CA-267: o botão do Estudante abre o cadastro já em Estudante', async ({ page }) => {
    await page.goto('/#/precos')
    await page.getByRole('button', { name: 'Usar o e-mail da faculdade' }).first().click()
    await expect(page.getByRole('radio', { name: /Estudante de Nutrição/ })).toBeChecked()
    await expect(page.getByLabel('E-mail da faculdade')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Passo 1 de 2' })).toBeVisible()
  })

  test('CA-260: sem servidor, o cadastro explica e abre o sistema', async ({ page }) => {
    await page.goto('/#/criar-conta')
    await page.getByRole('button', { name: 'Abrir o sistema' }).click()
    // Num navegador novo, o aviso de primeiro acesso (CA-51) abre por cima do Painel.
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  })

  for (const rota of ['/#/criar-conta', '/#/criar-conta/estudante', '/#/criar-conta/solo', '/#/entrar', '/#/termos', '/#/privacidade']) {
    test(`CB-48: ${rota} cabe em 360 px sem rolagem para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(rota)
      const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
      expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    })
  }
})

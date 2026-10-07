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

  test('CA-406 e CB-100: a tela do código pede só números, com teclado numérico, e o código colado conta só os dígitos', async ({ page }) => {
    await page.goto('/#/confirmar-email')
    await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
    const campo = page.getByLabel('Código de 6 dígitos')
    await expect(campo).toHaveAttribute('inputmode', 'numeric')
    await campo.fill('123-456')
    await expect(campo).toHaveValue('123456')
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Já confirmei, quero entrar' })).toHaveCount(0)
  })

  test('CA-412: a troca de senha pede o e-mail, o código e a senha nova duas vezes', async ({ page }) => {
    await page.goto('/#/esqueci-senha/codigo')
    await expect(page.getByRole('heading', { level: 1, name: 'Crie uma senha nova' })).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByLabel('Código de 6 dígitos')).toBeVisible()
    await expect(page.getByLabel('Senha nova')).toBeVisible()
    await expect(page.getByLabel('Repita a senha')).toBeVisible()
  })

  for (const rota of ['/#/criar-conta', '/#/criar-conta/estudante', '/#/criar-conta/solo', '/#/entrar', '/#/termos', '/#/privacidade', '/#/confirmar-email', '/#/esqueci-senha/codigo']) {
    test(`CB-48: ${rota} cabe em 360 px sem rolagem para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(rota)
      const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
      expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    })
  }
})

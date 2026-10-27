// Spec textos-e-promessas: o nome do paciente no plano impresso e no link (CA-1193). O texto da vitrine (CA-1198) é do
// site: e2e/site/textos-e-promessas.spec.ts (spec separacao-site-app).
import { expect, test } from '@playwright/test'

test('CA-1193: o plano impresso e o link saúdam o paciente vinculado, não o nome do plano', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()

  // A paciente, cadastrada pela ficha.
  await page.goto('/#/pacientes')
  await page.getByRole('button', { name: /Cadastrar paciente|Novo paciente/ }).first().click()
  await page.getByLabel('Nome', { exact: true }).fill('Beatriz Lima')

  // O plano, com um nome que é da nutricionista, vinculado à paciente.
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByLabel('Nome do plano').fill('Bia, 28 anos, retorno')
  await page.getByLabel('Paciente', { exact: true }).selectOption({ label: 'Beatriz Lima' })
  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entradaAlmoco = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')

  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: 'Plano alimentar (PDF)' }).click()
  const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
  await expect(janela.locator('header')).toContainText('Beatriz Lima')
  await expect(janela).not.toContainText('28 anos, retorno')
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()

  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const endereco = await cartao.getByLabel('Endereço do link').inputValue()
  await page.goto(endereco)
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Beatriz' })).toBeVisible()
})

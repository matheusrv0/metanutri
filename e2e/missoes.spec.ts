import { expect, test, type Page } from '@playwright/test'

/**
 * Fase 1 do plano de negócio: o nutricionista gera o link, o paciente abre no
 * aparelho dele e marca o que fez, e a tela de adesão passa a mostrar o estado.
 */

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const montarPlanoComAlmoco = async (pagina: Page) => {
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Idade').fill('30')

  await pagina.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const entradaAlmoco = pagina.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(pagina.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')
}

test('do plano ao paciente marcando a missão', async ({ page }) => {
  await abrirLimpo(page)
  await montarPlanoComAlmoco(page)

  // O nutricionista gera o link a partir do plano
  const cartao = page.getByRole('region', { name: 'Missões do paciente' })
  await expect(cartao).toContainText('saem deste plano')
  await cartao.getByRole('button', { name: 'Gerar link das missões' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()

  const endereco = await cartao.getByLabel('Link do paciente').inputValue()
  expect(endereco).toContain('#/missoes/')
  await expect(cartao.getByText('Ainda não começou')).toBeVisible()

  // O paciente abre o link: sem menu, sem conta
  await page.goto(endereco)
  await expect(page.getByRole('heading', { name: /Suas missões de hoje, Ana/ })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)

  const missoes = page.getByRole('button')
  await expect(missoes.first()).toHaveAttribute('aria-pressed', 'false')
  await missoes.first().click()
  await expect(missoes.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '0')

  // O que foi marcado sobrevive a recarregar a página
  await page.reload()
  await expect(page.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')

  // E o nutricionista vê o estado na tela de adesão
  await page.goto('/#/adesao')
  const lista = page.getByRole('listitem').filter({ hasText: 'Ana' })
  await expect(lista).toContainText('Atenção')
  await expect(lista).toContainText('1 de 4 dias na semana')
})

test('link inventado não abre plano de ninguém', async ({ page }) => {
  await abrirLimpo(page)
  await page.goto('/#/missoes/tokeninventado')
  await expect(page.getByRole('heading', { name: /Este link ainda não abre em outro aparelho/ })).toBeVisible()
})

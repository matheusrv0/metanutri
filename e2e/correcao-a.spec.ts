import { expect, test, type Locator, type Page } from '@playwright/test'

// Correção A da rodada "cuidado total" (22/10/2026): o que só o navegador de verdade mostra (larguras e cortes).

const abrirPlanoRapido = async (pagina: Page) => {
  await pagina.setViewportSize({ width: 1280, height: 900 })
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('João, 35 anos')
  await pagina.getByRole('radio', { name: 'Masculino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('35')
  await pagina.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  return pagina.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
}

/** Todo filho visível fica dentro da caixa (com 1 px de folga para o arredondamento). */
const dentroDa = async (caixa: Locator, filhos: Locator) => {
  const limite = await caixa.boundingBox()
  expect(limite).not.toBeNull()
  for (const filho of await filhos.all()) {
    const b = await filho.boundingBox()
    if (!b || !limite) continue
    expect(b.x + b.width, await filho.textContent()).toBeLessThanOrEqual(limite.x + limite.width + 1)
  }
}

test('CA-1243: a janela do substituto cabe a 1280 px, com o resultado escolhido', async ({ page }) => {
  const entrada = await abrirPlanoRapido(page)
  await entrada.fill('1 concha de feijao carioca cozido')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entrada.press('Enter')
  await page.getByRole('button', { name: /^Substituir Feijão, carioca/ }).click()
  const janela = page.getByRole('dialog', { name: 'Substituto equivalente' })
  const busca = janela.getByRole('combobox', { name: 'Escolher alimento substituto' })
  await busca.fill('lentilha')
  await expect(janela.getByRole('option').first()).toBeVisible()
  await dentroDa(janela, janela.getByRole('option'))
  await busca.press('Enter')
  await expect(janela).toContainText('Diferença em relação ao alimento original')
  await dentroDa(janela, janela.locator('dd, button, input'))
  const temRolagem = await janela.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(temRolagem).toBe(false)
})

test('CA-1228: a 1280 px, "meia xícara de aveia" mostra o nome inteiro e o aviso embaixo', async ({ page }) => {
  const entrada = await abrirPlanoRapido(page)
  await entrada.fill('meia xícara de aveia')
  const opcao = page.getByRole('option').first()
  await expect(opcao).toContainText('Aveia, flocos, crua')
  await expect(opcao).toContainText('Sem “xícara de chá”')
  const nome = opcao.getByText('Aveia, flocos, crua', { exact: true })
  const caixa = await nome.boundingBox()
  expect(caixa?.width ?? 0).toBeGreaterThan(100)
  await entrada.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: 'Nada foi adicionado' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })).toHaveCount(0)
})

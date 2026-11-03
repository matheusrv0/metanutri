import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral } from './apoio/fumaca.ts'

// Spec busca-substitutos: a busca de substitutos por nutriente no navegador (D-1100 a D-1117), ao lado das refeições em
// tela larga e em gaveta no celular.

const ARROZ = 'Arroz, tipo 1, cozido'

async function planoComArroz(pagina: Page, largura: number, altura = 900): Promise<void> {
  await pagina.setViewportSize({ width: largura, height: altura })
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('Renata, 34 anos')
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('34')
  await pagina.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entrada = pagina.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('150 arroz tipo 1 cozido')
  await expect(pagina.getByRole('option').first()).toBeVisible()
  await entrada.press('Enter')
  await expect(pagina.getByRole('list', { name: 'Alimentos em Principal de Almoço' }).getByText(ARROZ, { exact: true }).first()).toBeVisible()
}

/** Nada dentro do painel passa da borda dele, nem o próprio painel rola para o lado (D-800). */
async function semVazar(painel: Locator): Promise<void> {
  const vaza = await painel.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  expect(vaza, 'o painel rola para o lado').toBe(false)
}

test.describe('tela larga (1440 px): o painel ao lado das refeições', () => {
  test('CA-2101 a CA-2103, CA-2117 a CA-2120: buscar, comparar, substituir, desfazer e pôr opção', async ({ page }) => {
    await planoComArroz(page, 1440)
    const botao = page.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` })
    await botao.click()
    const painel = page.getByRole('complementary', { name: `Substitutos de ${ARROZ}` })
    await expect(painel).toBeVisible()
    await expect(botao).toHaveAttribute('aria-pressed', 'true')

    // D-1116: ao lado das refeições, à direita do cartão do almoço.
    const cartao = page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })
    const caixaPainel = await painel.boundingBox()
    const caixaCartao = await cartao.boundingBox()
    expect(caixaPainel && caixaCartao && caixaPainel.x >= caixaCartao.x + caixaCartao.width).toBe(true)

    // CA-2102 e CA-2103: o carboidrato já vem marcado, e a polenta vem com a porção e a diferença.
    await expect(painel.getByRole('button', { name: /^Carboidratos/ })).toHaveAttribute('aria-pressed', 'true')
    const polenta = painel.getByRole('listitem').filter({ hasText: 'Polenta, pré-cozida' })
    await expect(polenta).toContainText('3 colheres de servir · 180 g')
    await expect(polenta).toContainText('0,1 g de carboidrato a menos')
    await semVazar(painel)
    await semRolagemLateral(page)

    // CA-2117: Comparar.
    await painel.getByRole('button', { name: 'Comparar Batata, inglesa, cozida' }).click()
    const janela = page.getByRole('dialog', { name: 'Comparar alimentos' })
    await expect(janela.getByRole('rowheader', { name: 'Vitamina C' })).toBeVisible()
    await expect(janela).toContainText('não analisado')
    await page.keyboard.press('Escape')
    await expect(janela).toBeHidden()
    await expect(painel).toBeVisible()

    // CA-2120: a polenta como opção.
    await painel.getByRole('button', { name: 'Adicionar como opção: Polenta, pré-cozida' }).click()
    await expect(page.getByRole('list', { name: `Opções de ${ARROZ}` })).toContainText('Polenta, pré-cozida')
    await expect(polenta.getByRole('button', { name: 'Já é opção' })).toBeDisabled()

    // CA-2118: substituir pela batata; CA-2119: desfazer.
    await painel.getByRole('button', { name: 'Substituir por Batata, inglesa, cozida' }).click()
    await expect(painel).toBeHidden()
    await expect(page.getByText(/trocado por Batata, inglesa, cozida, 2 unidades e meia · 350 g\. Almoço passou a somar \d+ kcal\./)).toBeVisible()
    await expect(cartao.getByText('Batata, inglesa, cozida', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(cartao.getByText(ARROZ, { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('complementary', { name: `Substitutos de ${ARROZ}` })).toBeVisible()
    await expect(page.getByRole('list', { name: `Opções de ${ARROZ}` })).toContainText('Polenta, pré-cozida')
  })

  test('CA-2104 e CA-2115: dois nutrientes e a lista velha', async ({ page }) => {
    await planoComArroz(page, 1440)
    await page.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }).click()
    const painel = page.getByRole('complementary', { name: `Substitutos de ${ARROZ}` })
    await painel.getByRole('button', { name: /^Proteínas/ }).click()
    await expect(painel).toContainText('Os nutrientes mudaram. Busque de novo para atualizar a lista.')
    await painel.getByRole('button', { name: 'Buscar alimentos' }).click()
    await expect(painel).toContainText('Mesma quantidade de carboidrato e proteína que 150 g · mesmo grupo')
    const cuscuz = painel.getByRole('listitem').filter({ hasText: 'Cuscuz, de milho, cozido com sal' })
    await expect(cuscuz).toContainText('0,4 g de carboidrato a mais')
    await expect(cuscuz).toContainText('0,2 g de proteína a menos')
    await expect(painel.getByText('Mandioca, cozida')).toHaveCount(0)
  })
})

test.describe('celular e tablet: a gaveta (D-1116, D-800, D-802)', () => {
  // Toque de verdade: no tablet com dedo, o alvo volta aos 44 px (D-802, M-018).
  test.use({ hasTouch: true })

  for (const largura of [360, 390, 768]) {
    test(`CA-2126: a ${largura} px, a gaveta não rola para o lado e o toque tem 44 px`, async ({ page }) => {
      await planoComArroz(page, largura, largura === 768 ? 1024 : 800)
      await page.getByRole('button', { name: `Buscar substitutos para ${ARROZ}` }).click()
      const gaveta = page.getByRole('dialog', { name: `Substitutos de ${ARROZ}` })
      await expect(gaveta).toBeVisible()
      const caixa = await gaveta.boundingBox()
      expect(caixa && caixa.x <= 1 && caixa.width >= largura - 2).toBe(true)
      await semVazar(gaveta)
      await semRolagemLateral(page)
      for (const alvo of [
        gaveta.getByRole('button', { name: /^Carboidratos/ }),
        gaveta.getByRole('button', { name: 'Buscar alimentos' }),
        gaveta.getByRole('button', { name: 'Substituir por Polenta, pré-cozida' }),
        gaveta.getByRole('button', { name: 'Adicionar como opção: Polenta, pré-cozida' }),
      ]) {
        const b = await alvo.boundingBox()
        expect(b?.height ?? 0, await alvo.textContent()).toBeGreaterThanOrEqual(44)
      }
      await gaveta.getByRole('button', { name: 'Substituir por Polenta, pré-cozida' }).click()
      await expect(gaveta).toBeHidden()
      await expect(page.getByText(/trocado por Polenta, pré-cozida/)).toBeVisible()
      await semRolagemLateral(page)
    })
  }
})

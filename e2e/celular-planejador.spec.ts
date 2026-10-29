import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec ajustes-mobile, grupo C (ficha do caso): M-002, M-003, M-010, M-022, M-023 e M-025 nas larguras da auditoria de
// 29/10/2026 (CA-1800). Os dados entram pela interface, como a nutricionista faria: o plano de exemplo (o conjunto N da
// auditoria) e, para o pior caso (P), gramas de 4 e 5 algarismos e uma refeição de nome comprido.

const CELULARES = [360, 390, 412] as const
const COM_TABLET = [...CELULARES, 768] as const

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
}

const abrirExemplo = async (pagina: Page) => {
  await abrirLimpo(pagina)
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
  await expect(pagina.getByRole('region', { name: 'Micronutrientes' })).toBeVisible()
}

const semRolagemLateral = async (pagina: Page) => {
  const larguras = await pagina.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)
}

// ------------------------------------------------------------------------------------------------------------- M-002

/**
 * D-803: quanto sobra entre o fim do número digitado e o começo do sufixo (ou o recuo da direita, o que vier antes).
 * Negativo quer dizer que o número entra por baixo do sufixo ou é cortado na borda. O texto é medido com a fonte do
 * próprio campo.
 */
const sobraDoValor = (campo: Locator) =>
  campo.evaluate((el: HTMLInputElement) => {
    const estilo = getComputedStyle(el)
    const regua = document.createElement('span')
    regua.textContent = el.value
    Object.assign(regua.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'pre',
      fontFamily: estilo.fontFamily,
      fontSize: estilo.fontSize,
      fontWeight: estilo.fontWeight,
      fontStyle: estilo.fontStyle,
      fontFeatureSettings: estilo.fontFeatureSettings,
      fontVariantNumeric: estilo.fontVariantNumeric,
      letterSpacing: estilo.letterSpacing,
    })
    document.body.append(regua)
    const texto = regua.getBoundingClientRect().width
    regua.remove()
    const caixa = el.getBoundingClientRect()
    const inicio = caixa.left + el.clientLeft + parseFloat(estilo.paddingLeft)
    const fimDoConteudo = caixa.left + el.clientLeft + el.clientWidth - parseFloat(estilo.paddingRight)
    const sufixo = el.parentElement?.querySelector('span')
    const limite = sufixo ? Math.min(fimDoConteudo, sufixo.getBoundingClientRect().left) : fimDoConteudo
    return limite - (inicio + texto)
  })

for (const largura of COM_TABLET) {
  test.describe(`M-002 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-002: o campo de gramas do plano mostra 1250, 9999 e 12345 inteiros, antes do sufixo', async ({ page }) => {
      await abrirExemplo(page)
      const gramas = page.getByRole('tabpanel', { name: 'Principal de Café da manhã' }).getByRole('textbox', { name: /^Gramas de / }).first()
      for (const valor of ['1250', '9999', '12345']) {
        await gramas.fill(valor)
        expect(await sobraDoValor(gramas), `${valor} no campo de gramas`).toBeGreaterThanOrEqual(0)
      }
      await semRolagemLateral(page)
    })

    test('M-002: no editor de receita, o ingrediente de 1234 g e o de 12345 g aparecem inteiros', async ({ page }) => {
      await abrirLimpo(page)
      await page.goto('/#/receitas')
      await page.getByRole('button', { name: 'Nova receita' }).click()
      const busca = page.getByRole('combobox', { name: 'Adicionar ingrediente' })
      await busca.fill('1234 margarina')
      await expect(page.getByRole('option').first()).toBeVisible()
      await busca.press('Enter')
      const gramas = page.getByRole('textbox', { name: /^Gramas de / }).first()
      await expect(gramas).toHaveValue('1234')
      expect(await sobraDoValor(gramas), '1234 no ingrediente').toBeGreaterThanOrEqual(0)
      await gramas.fill('12345')
      expect(await sobraDoValor(gramas), '12345 no ingrediente').toBeGreaterThanOrEqual(0)
      await semRolagemLateral(page)
    })
  })
}

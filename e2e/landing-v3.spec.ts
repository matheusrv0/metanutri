// Spec landing-v3: o tema claro e escuro da landing no navegador de verdade (cores, contraste, barra, primeiro desenho,
// foco e laranja) e os espaços menores.
import { expect, test, type Page } from '@playwright/test'
import { vigiarConsole } from './apoio/fumaca.ts'

const CHAO_ESCURO = 'rgb(16, 26, 29)'
const CHAO_CLARO = 'rgb(246, 242, 234)'
const AFUNDADO_CLARO = 'rgb(239, 232, 220)'
const TINTA_CLARA = 'rgb(19, 40, 45)'
const TEAL = 'rgb(14, 59, 67)'
const MARFIM = 'rgb(246, 242, 234)'
const RODAPE_CLARO = 'rgb(236, 229, 216)'
const LARANJA = 'rgb(242, 106, 46)'

type Tema = 'claro' | 'escuro'

/** Abre a landing com o tema da landing guardado (ou nenhum) e o app no tema claro. */
async function abrir(pagina: Page, temaDaLanding?: Tema) {
  await pagina.addInitScript((l) => {
    localStorage.setItem('metanutri:tema', 'claro')
    if (l) localStorage.setItem('metanutri:tema-da-landing', l)
  }, temaDaLanding ?? null)
  await pagina.goto('/#/inicio')
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
  await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible()
}

const cor = (pagina: Page, seletor: string, propriedade: 'backgroundColor' | 'color') =>
  pagina.locator(seletor).first().evaluate((el, p) => getComputedStyle(el)[p], propriedade)

/** Contraste WCAG entre duas cores `rgb(...)`. */
function contraste(a: string, b: string): number {
  const lum = (c: string) => {
    const [r = 0, g = 0, bl = 0] = (c.match(/\d+(\.\d+)?/g) ?? []).map(Number).map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** A cor do texto e o fundo de verdade atrás dele (o primeiro ancestral com fundo). */
const corEFundo = (pagina: Page, seletor: string) =>
  pagina
    .locator(seletor)
    .first()
    .evaluate((el) => {
      let alvo: Element | null = el
      let fundo = 'rgba(0, 0, 0, 0)'
      while (alvo && fundo === 'rgba(0, 0, 0, 0)') {
        fundo = getComputedStyle(alvo).backgroundColor
        alvo = alvo.parentElement
      }
      return [getComputedStyle(el).color, fundo] as const
    })

test.describe('com menos movimento', () => {
  test.use({ reducedMotion: 'reduce' })

  test('CA-1611, CA-1612, CA-1613 e CA-1615: abre escura, o botão troca para o claro, a escolha fica e volta', async ({ page }) => {
    const erros = await vigiarConsole(page)
    await abrir(page)
    expect(await cor(page, '.landing', 'backgroundColor')).toBe(CHAO_ESCURO)
    const botao = page.getByRole('banner').getByRole('button', { name: 'Usar o tema claro' })
    await expect(botao.locator('.lucide-moon')).toBeVisible()
    await expect(botao.locator('.lucide-sun')).toBeHidden()
    await botao.click()

    const claro = page.getByRole('banner').getByRole('button', { name: 'Usar o tema escuro' })
    await expect(claro).toBeFocused()
    await expect(claro.locator('.lucide-sun')).toBeVisible()
    expect(await cor(page, '.landing', 'backgroundColor')).toBe(CHAO_CLARO)
    expect(await cor(page, '.landing', 'color')).toBe(TINTA_CLARA)
    // O topo e as perguntas são teal nos dois temas; a faixa final inverte; o rodapé clareia (D-610).
    expect(await cor(page, '[aria-labelledby="titulo-inicio"]', 'backgroundColor')).toBe(TEAL)
    expect(await cor(page, '[aria-labelledby="titulo-perguntas"]', 'backgroundColor')).toBe(TEAL)
    expect(await cor(page, 'a[href="#/criar-conta"][data-capitulo]', 'backgroundColor')).toBe(TEAL)
    expect(await cor(page, 'a[href="#/criar-conta"][data-capitulo]', 'color')).toBe(MARFIM)
    expect(await cor(page, 'footer', 'backgroundColor')).toBe(RODAPE_CLARO)
    expect(await cor(page, 'footer', 'color')).toBe(TEAL)
    expect(await page.evaluate(() => localStorage.getItem('metanutri:tema-da-landing'))).toBe('claro')
    expect(await page.evaluate(() => localStorage.getItem('metanutri:tema'))).toBe('claro')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await cor(page, '.landing', 'backgroundColor')).toBe(CHAO_CLARO)
    await page.getByRole('banner').getByRole('button', { name: 'Usar o tema escuro' }).click()
    expect(await cor(page, '.landing', 'backgroundColor')).toBe(CHAO_ESCURO)
    expect(erros).toEqual([])
  })

  for (const tema of ['escuro', 'claro'] as const) {
    test(`CA-1616 e CA-1630: landing ${tema}, cada título e o número do Solo se leem sobre a própria seção`, async ({ page }) => {
      await abrir(page, tema)
      // O h1 se lê pelas duas linhas dele (cada uma com a cor própria); os títulos de seção, pelo próprio h2.
      const titulos = page.locator('main h1 > span:not(.sr-only):not([aria-hidden]), main h2')
      expect(await titulos.count()).toBe(8)
      for (let i = 0; i < 8; i++) {
        const [texto, fundo] = await corEFundo(page, `main h1 > span:not(.sr-only):not([aria-hidden]), main h2 >> nth=${i}`)
        expect(contraste(texto, fundo), `${await titulos.nth(i).innerText()} (${texto} sobre ${fundo})`).toBeGreaterThanOrEqual(4.5)
      }
      const [numero, fundoDoNumero] = await corEFundo(page, '#quanto-custa p:has(> span[aria-hidden="true"])')
      expect(contraste(numero, fundoDoNumero)).toBeGreaterThanOrEqual(4.5)
      // As frases apagadas das chaves desligadas, letra de 22 px ou mais: 3:1 é o mínimo; o token passa de 4,5.
      const [apagada, chao] = await corEFundo(page, '[aria-labelledby="titulo-chaves"] [role="switch"][aria-checked="false"] >> xpath=.. >> p')
      expect(contraste(apagada, chao)).toBeGreaterThanOrEqual(4.5)
    })
  }

  test('CA-1617 e CB-603: a barra clareia sobre o chão no tema claro, com a logo para fundo claro, e repinta na troca', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrir(page, 'claro')
    const barra = page.getByRole('banner')
    const logo = () => barra.locator('img').first().getAttribute('src')
    await expect(barra).toHaveAttribute('data-tinta', 'teal')
    expect(await logo()).toBe('marca/simbolo-fundo-escuro.svg')
    // O campo vivo no alto, rolando para cima um pouco para a barra voltar (ela sai ao descer).
    await page.locator('#plano-de-exemplo').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 300))
    await page.mouse.wheel(0, -100)
    await expect(barra).toHaveAttribute('data-tinta', 'afundado')
    await expect.poll(() => barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(AFUNDADO_CLARO)
    expect(await barra.evaluate((el) => getComputedStyle(el).color)).toBe(TINTA_CLARA)
    expect(await logo()).toBe('marca/simbolo.svg')
    const [entrar, fundo] = await corEFundo(page, 'header a[href="#/entrar"]')
    expect(contraste(entrar, fundo)).toBeGreaterThanOrEqual(4.5)
    const [acao, fundoDaAcao] = await page
      .getByRole('banner')
      .getByRole('link', { name: 'Criar conta grátis' })
      .evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor] as const)
    expect(contraste(acao, fundoDaAcao)).toBeGreaterThanOrEqual(4.5)
    // Trocou o tema com a página rolada: a barra repinta na hora, sem transição (D-614). O clique vai pelo evento: o
    // clique do Playwright rola a página antes, por causa da barra presa, e tiraria a barra de cima do campo vivo.
    await barra.getByRole('button', { name: 'Usar o tema escuro' }).dispatchEvent('click')
    expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(20, 34, 38)')
    expect(await logo()).toBe('marca/simbolo-fundo-escuro.svg')
  })

  test('CA-1621: no tema claro, nenhum texto em laranja e o foco é visível em todo controle', async ({ page }) => {
    await abrir(page, 'claro')
    const laranjas = await page.locator('.landing *').evaluateAll(
      (els, c) =>
        els
          .filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''))
          .filter((el) => getComputedStyle(el).color === c || getComputedStyle(el).backgroundColor === c)
          .map((el) => el.textContent),
      LARANJA,
    )
    expect(laranjas).toEqual([])
    const vistos: string[] = []
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        return { texto: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30), contorno: getComputedStyle(el).outlineStyle }
      })
      if (!foco) continue
      expect(foco.contorno, foco.texto).not.toBe('none')
      vistos.push(foco.texto)
    }
    expect(vistos.slice(0, 4)).toEqual(['MetaNutri, início', 'Como funciona', 'Preços', 'Usar o tema escuro'])
  })

  test('CA-1610: em 390 px, o botão de tema continua na barra, com 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrir(page)
    const caixa = await page.getByRole('banner').getByRole('button', { name: 'Usar o tema claro' }).boundingBox()
    expect(caixa?.width).toBe(44)
    expect(caixa?.height).toBe(44)
  })

  test('CA-1625: em 1440 px, seções com 104/96 px, o topo de 640 px com a barra e a foto de 420 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    for (const seletor of ['#plano-de-exemplo', '#como-funciona', '[aria-labelledby="titulo-gramas"]', '#quanto-custa', '[aria-labelledby="titulo-perguntas"]']) {
      const espacos = await page.locator(seletor).evaluate((el) => [getComputedStyle(el).paddingTop, getComputedStyle(el).paddingBottom])
      expect(espacos, seletor).toEqual(['104px', '96px'])
    }
    const barra = (await page.getByRole('banner').boundingBox())?.height ?? 0
    const topo = (await page.locator('[aria-labelledby="titulo-inicio"]').boundingBox())?.height ?? 0
    expect(barra + topo).toBe(640)
    const titulo = await page.getByRole('heading', { level: 1 }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(el).paddingTop))
    expect(titulo).toBe(150)
    expect((await page.getByAltText(/Tomates e cenouras/).locator('..').boundingBox())?.height).toBe(420)
  })
})

for (const tema of ['claro', 'escuro'] as const) {
  test(`CA-1620: com o ${tema} guardado, a landing pré-desenhada já nasce no tema, antes de o app montar`, async ({ page }) => {
    // Só o script do <head> roda: o pacote do app não chega, e a página fica a pré-desenhada.
    await page.route('**/assets/*.js', (rota) => rota.abort())
    await page.addInitScript((l) => localStorage.setItem('metanutri:tema-da-landing', l), tema)
    await page.goto('/')
    await expect(page.locator('[data-vitrine]')).toBeVisible()
    expect(await cor(page, '.landing', 'backgroundColor')).toBe(tema === 'claro' ? CHAO_CLARO : CHAO_ESCURO)
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-tema-da-landing'))).toBe(tema === 'claro' ? 'claro' : null)
    const botao = page.getByRole('banner').getByRole('button', { name: /^Usar o tema/ })
    await expect(botao.locator(tema === 'claro' ? '.lucide-sun' : '.lucide-moon')).toBeVisible()
    await expect(botao.locator(tema === 'claro' ? '.lucide-moon' : '.lucide-sun')).toBeHidden()
    // O topo continua teal nos dois.
    expect(await cor(page, '[aria-labelledby="titulo-inicio"]', 'backgroundColor')).toBe(TEAL)
  })
}

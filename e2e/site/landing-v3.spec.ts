// Spec landing-v3: o tema claro e escuro da landing no navegador de verdade (cores, contraste, barra, primeiro desenho,
// foco e laranja). Seção v9: a barra de vidro, o topo em foto e as medidas da v9 (D-651, D-652 e D-677).
import { expect, test, type Page } from '@playwright/test'
import { vigiarConsole } from '../apoio/fumaca.ts'

const CHAO_ESCURO = 'rgb(16, 26, 29)'
const CHAO_CLARO = 'rgb(246, 242, 234)'
/** A barra de vidro no claro: o marfim com 82% (D-651). */
const VIDRO_CLARO = 'color(srgb 0.964706 0.94902 0.917647 / 0.82)'
const VIDRO_ESCURO = 'color(srgb 0.0627451 0.101961 0.113725 / 0.78)'
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
  await pagina.goto('/')
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
    // As perguntas são teal nos dois temas; a faixa final inverte; o rodapé clareia (D-610); a barra é o vidro claro.
    expect(await cor(page, '[aria-labelledby="titulo-perguntas"]', 'backgroundColor')).toBe(TEAL)
    expect(await cor(page, '[data-faixa-final]', 'backgroundColor')).toBe(TEAL)
    expect(await cor(page, '[data-faixa-final]', 'color')).toBe(MARFIM)
    expect(await cor(page, 'header', 'backgroundColor')).toBe(VIDRO_CLARO)
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
    test(`CA-1616 e CA-1689: landing ${tema}, cada título de seção e o preço do indicado se leem sobre a própria seção`, async ({ page }) => {
      await abrir(page, tema)
      const titulos = page.locator('main h2')
      expect(await titulos.count()).toBe(7)
      for (let i = 0; i < 7; i++) {
        const [texto, fundo] = await corEFundo(page, `main h2 >> nth=${i}`)
        expect(contraste(texto, fundo), `${await titulos.nth(i).innerText()} (${texto} sobre ${fundo})`).toBeGreaterThanOrEqual(4.5)
      }
      // O preço do plano indicado sobre o cartão (o fundo dele é o gradiente: confere contra as duas pontas).
      const [numero] = await corEFundo(page, '#planos [data-indicado] p:has(> span[aria-hidden="true"])')
      const pontas = await page
        .locator('#planos [data-indicado]')
        .evaluate((el) => getComputedStyle(el).backgroundImage.match(/(rgb|color)\([^)]*\)/g) ?? [])
      expect(pontas.length).toBeGreaterThanOrEqual(2)
      for (const ponta of pontas) expect(contraste(numero, ponta.replace(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+).*$/, (_t, r, g, b) => `rgb(${Math.round(Number(r) * 255)}, ${Math.round(Number(g) * 255)}, ${Math.round(Number(b) * 255)})`))).toBeGreaterThanOrEqual(4.5)
      // O texto do topo sobre o véu: a tinta do topo contra a cor de cima do véu, onde fica o título.
      const [tintaDoTopo] = await corEFundo(page, 'h1')
      expect(tintaDoTopo).toBe(tema === 'claro' ? TEAL : MARFIM)
    })
  }

  test('CA-1617, CA-1651 e CB-603: a barra de vidro do tema fica no alto ao rolar, com a logo do tema, e repinta na troca', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrir(page, 'claro')
    const barra = page.getByRole('banner')
    const logoVisivel = () => barra.locator('img').filter({ visible: true }).first().getAttribute('src')
    expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(VIDRO_CLARO)
    expect(await logoVisivel()).toBe('marca/simbolo.svg')
    await page.locator('#planos').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 300))
    await page.mouse.wheel(0, 400)
    await expect.poll(async () => (await barra.boundingBox())?.y).toBe(0)
    expect(await barra.evaluate((el) => getComputedStyle(el).color)).toBe(TINTA_CLARA)
    // Spec separacao-site-app (D-501): o "Entrar" da barra é o endereço do app.
    const [entrar, fundo] = await corEFundo(page, 'header a[href="http://localhost:4176/"]')
    expect(contraste(entrar, fundo.startsWith('color(') ? CHAO_CLARO : fundo)).toBeGreaterThanOrEqual(4.5)
    const [acao, fundoDaAcao] = await barra
      .getByRole('link', { name: 'Criar conta grátis' })
      .evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor] as const)
    expect(contraste(acao, fundoDaAcao)).toBeGreaterThanOrEqual(4.5)
    // Trocou o tema com a página rolada: a barra repinta na hora, sem transição (D-614). O clique vai pelo evento: o
    // clique do Playwright rola a página antes, por causa da barra presa.
    await barra.getByRole('button', { name: 'Usar o tema escuro' }).dispatchEvent('click')
    expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(VIDRO_ESCURO)
    expect(await logoVisivel()).toBe('marca/simbolo-fundo-escuro.svg')
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
    expect(vistos.slice(0, 5)).toEqual(['MetaNutri, início', 'Funcionalidades', 'Como funciona', 'Planos', 'Usar o tema escuro'])
  })

  test('CA-1610: em 390 px, o botão de tema continua na barra, com 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrir(page)
    const caixa = await page.getByRole('banner').getByRole('button', { name: 'Usar o tema claro' }).boundingBox()
    expect(caixa?.width).toBe(44)
    expect(caixa?.height).toBe(44)
  })

  test('CA-1625 e D-677: em 1440 px, seções com 88/80 px, o topo com 720 px e a foto dos legumes com 420 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    for (const seletor of ['#adequacao', '[aria-labelledby="titulo-adesao"]', '#funcionalidades', '#como-funciona', '[aria-labelledby="titulo-gramas"]', '#planos', '[aria-labelledby="titulo-perguntas"]']) {
      const espacos = await page.locator(seletor).evaluate((el) => [getComputedStyle(el).paddingTop, getComputedStyle(el).paddingBottom])
      expect(espacos, seletor).toEqual(['88px', '80px'])
    }
    expect((await page.locator('[aria-labelledby="titulo-inicio"]').boundingBox())?.height).toBe(720)
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
    // A barra e a logo nascem no tema guardado (as duas versões da logo estão no HTML; o CSS mostra a do tema).
    expect(await cor(page, 'header', 'backgroundColor')).toBe(tema === 'claro' ? VIDRO_CLARO : VIDRO_ESCURO)
    await expect(page.getByRole('banner').locator(`[data-logo="${tema}"] img`).first()).toBeVisible()
    await expect(page.getByRole('banner').locator(`[data-logo="${tema === 'claro' ? 'escuro' : 'claro'}"] img`).first()).toBeHidden()
  })
}

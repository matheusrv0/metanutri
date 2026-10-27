// Spec landing-escura: a landing escura no navegador de verdade (tema, fontes, laranja, barra, celular, teclado,
// movimento e a página pré-desenhada sem JavaScript). Spec landing-v3: o celular nos dois temas da landing (o tema claro
// tem o e2e dele, landing-v3.spec.ts). Seção v9: a Adequação e o celular das missões no lugar do campo vivo e das chaves,
// e a barra de vidro presa no alto (o e2e da v9 é landing-v9.spec.ts).
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'

const CHAO = 'rgb(16, 26, 29)'
const TINTA = 'rgb(238, 242, 241)'
const LARANJA = 'rgb(242, 106, 46)'
const BRANCO = 'rgb(255, 255, 255)'
/** A barra de vidro no escuro: o chão com 78% (D-651). */
const VIDRO_ESCURO = 'color(srgb 0.0627451 0.101961 0.113725 / 0.78)'

async function abrirLanding(pagina: Page, tema: 'claro' | 'escuro' = 'claro', temaDaLanding: 'claro' | 'escuro' = 'escuro') {
  await pagina.addInitScript(
    ([t, l]) => {
      localStorage.setItem('metanutri:tema', t)
      localStorage.setItem('metanutri:tema-da-landing', l)
    },
    [tema, temaDaLanding] as const,
  )
  await pagina.goto('/')
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
  await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Contraste WCAG entre duas cores `rgb(...)`. */
function contraste(a: string, b: string): number {
  const lum = (cor: string) => {
    const [r = 0, g = 0, bl = 0] = (cor.match(/\d+(\.\d+)?/g) ?? []).map(Number).map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

test.describe('com menos movimento (o padrão desta máquina)', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const tema of ['claro', 'escuro'] as const) {
    test(`CA-1450 e CA-1651: com o app no tema ${tema}, a landing é escura, a barra é de vidro e os títulos se leem`, async ({ page }) => {
      const erros = await vigiarConsole(page)
      await abrirLanding(page, tema)
      const raiz = page.locator('.landing')
      expect(await raiz.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(CHAO)
      expect(await raiz.evaluate((el) => getComputedStyle(el).color)).toBe(TINTA)
      expect(await page.getByRole('banner').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(VIDRO_ESCURO)
      // Cada título de seção contra o fundo da própria seção (a ponte do sistema calculada no <html> claro os apagava).
      for (const titulo of await page.getByRole('heading', { level: 2 }).all()) {
        const [cor, fundo] = await titulo.evaluate((el) => {
          let alvo: Element | null = el
          let bg = 'rgba(0, 0, 0, 0)'
          while (alvo && bg === 'rgba(0, 0, 0, 0)') {
            bg = getComputedStyle(alvo).backgroundColor
            alvo = alvo.parentElement
          }
          return [getComputedStyle(el).color, bg]
        })
        expect(contraste(cor, fundo), await titulo.innerText()).toBeGreaterThanOrEqual(4.5)
      }
      expect(erros).toEqual([])
    })
  }

  test('CA-1452: Manrope em tudo, a Bricolage só no nome da marca, nada do Google Fonts', async ({ page }) => {
    const pedidos: string[] = []
    page.on('request', (pedido) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(pedido.url())) pedidos.push(pedido.url())
    })
    await abrirLanding(page)
    await page.evaluate(() => document.fonts.ready)
    const familias = await page.locator('main h1, main h2, main h3, main p, main button, main td').evaluateAll((els) => [
      ...new Set(els.map((el) => getComputedStyle(el).fontFamily.split(',')[0]?.trim())),
    ])
    expect(familias).toEqual(['"Manrope Variable"'])
    const nome = page.getByRole('banner').getByText('MetaNutri', { exact: true }).filter({ visible: true })
    expect(await nome.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"Bricolage Grotesque Variable"/)
    expect(pedidos).toEqual([])
  })

  test('CA-1453: nenhum texto em laranja, e a faixa final vai a branco no hover, com a seta laranja', async ({ page }) => {
    await abrirLanding(page)
    const laranjas = await page.locator('.landing *').evaluateAll(
      (els, cor) =>
        els
          .filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''))
          .filter((el) => getComputedStyle(el).color === cor || getComputedStyle(el).backgroundColor === cor)
          .map((el) => el.textContent),
      LARANJA,
    )
    expect(laranjas).toEqual([])
    const faixa = page.getByRole('link', { name: /Crie sua conta e monte o primeiro plano hoje/ })
    await faixa.hover()
    await expect.poll(() => faixa.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BRANCO)
    await expect.poll(() => faixa.locator('svg').evaluate((el) => getComputedStyle(el).color)).toBe(LARANJA)
  })

  test('CA-1662 e CA-1663: a Adequação troca de nutriente e de sugestão, e o centro do anel acompanha', async ({ page }) => {
    await abrirLanding(page)
    const painel = page.locator('[data-painel-adequacao]')
    await expect(painel).toContainText('ainda faltam24,3 mgde 260 mg')
    await page.getByRole('button', { name: /^Sardinha assada/ }).click()
    await expect(painel).toContainText('com 60 gMetaatingida')
    await page.getByRole('button', { name: /^Vitamina E/ }).click()
    await expect(page.getByRole('button', { name: /^Amêndoa torrada salgada/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(painel).toContainText('ainda faltam1,0 mgde 8,1 mg')
    await page.getByRole('button', { name: /^Vitamina D/ }).click()
    await expect(painel).toContainText('Filé de salmão fresco grelhado com pele')
    await semRolagemLateral(page)
  })

  test('CA-1668 e CA-1669: marcar a missão pelo teclado conta no celular e acende a bolinha da Maria', async ({ page }) => {
    await abrirLanding(page)
    const almoco = page.getByRole('button', { name: /^Almoço por volta das 12h/ })
    await almoco.focus()
    await page.keyboard.press('Space')
    await expect(almoco).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-contagem]')).toHaveText('3 de 9')
    await expect(page.getByText('Em dia · 3 de 9 hoje')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(almoco).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-contagem]')).toHaveText('2 de 9')
  })

  test('CA-1486: com menos movimento, nada se move e nada fica escondido', async ({ page }) => {
    await abrirLanding(page)
    const altura = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < altura; y += 600) await page.evaluate((v) => window.scrollTo(0, v), y)
    expect(await page.locator('.landing').getAttribute('data-entrada')).toBeNull()
    const escondidos = await page
      .locator('main *')
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === '0' && !el.closest('[aria-hidden="true"]')).length)
    expect(escondidos).toBe(0)
    const animando = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)
    expect(animando).toBe(0)
  })

  for (const [largura, temaDaLanding] of [
    [390, 'escuro'],
    [320, 'escuro'],
    [390, 'claro'],
    [360, 'claro'],
    [320, 'claro'],
  ] as const) {
    test(`CA-1488, CA-1489, CA-1626, CA-1690 e CB-531: em ${largura} px, landing ${temaDaLanding}, sem rolar para o lado e com alvos de 44 px`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 844 })
      await abrirLanding(page, 'claro', temaDaLanding)
      await semRolagemLateral(page)
      await expect(page.getByRole('banner').getByRole('link', { name: 'Criar conta' })).toBeVisible()
      // CB-608 (spec landing-v3): a raiz corta o que passa da largura (overflow-x: clip); a barra inteira cabe na tela, com
      // a margem de 16 px, também com o botão de tema.
      const foraDaBarra = await page
        .getByRole('banner')
        .locator('a, button')
        .evaluateAll((els) =>
          els
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth - 16 + 0.5)
            .map((el) => el.getAttribute('aria-label') ?? el.textContent),
        )
      expect(foraDaBarra).toEqual([])
      // Nenhuma peça visível passa da largura da tela (o celular das missões rola por dentro).
      const fora = await page.locator('.landing a, .landing button, .landing input, .landing p, .landing h2, .landing h3, .landing li').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'))
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => (el.textContent ?? '').trim().slice(0, 40)),
      )
      expect(fora).toEqual([])
      const pequenos = await page.locator('.landing a, .landing button, .landing summary, .landing input').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0)
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map((el) => `${el.tagName} ${el.textContent?.trim() ?? ''} ${Math.round(el.getBoundingClientRect().height)}`),
      )
      expect(pequenos).toEqual([])
      // Quantidades em gramas (D-665): cada linha é o alimento, os gramas e as calorias, lado a lado.
      const linha = page.getByRole('row', { name: /Patinho grelhado sem gordura/ })
      const celulas = await Promise.all([0, 1, 2].map((i) => linha.getByRole('cell').nth(i).boundingBox()))
      const [alimento, gramas, kcal] = celulas
      if (!alimento || !gramas || !kcal) throw new Error('linha sem medida')
      expect(gramas.x).toBeGreaterThan(alimento.x + alimento.width - 1)
      expect(kcal.x + kcal.width).toBeLessThanOrEqual(largura)
    })
  }

  test('CA-1490 e CA-1694: pelo teclado, o foco é visível e segue a página: a barra, o topo, as abas e as sugestões', async ({ page }) => {
    await abrirLanding(page)
    const vistos: string[] = []
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const estilo = getComputedStyle(el)
        const texto = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)
        return { texto, contorno: estilo.outlineStyle, escondido: el.closest('[aria-hidden="true"]') !== null }
      })
      if (!foco) continue
      expect(foco.contorno, foco.texto).not.toBe('none')
      expect(foco.escondido, foco.texto).toBe(false)
      vistos.push(foco.texto)
    }
    expect(vistos.slice(0, 9)).toEqual([
      'MetaNutri, início',
      'Funcionalidades',
      'Como funciona',
      'Planos',
      'Usar o tema claro',
      'Entrar',
      'Criar conta grátis',
      'Criar conta grátis',
      'Ver o plano de exemplo',
    ])
    expect(vistos.some((v) => v.startsWith('Cálcio 640 de 1.000 mg'))).toBe(true)
    expect(vistos.some((v) => v.startsWith('Iogurte natural desnatado'))).toBe(true)
  })
})

test.describe('com movimento', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('CA-1487: as partes entram ao rolar, uma vez, e a foto deriva; o que já estava na tela não pisca', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrirLanding(page)
    await expect(page.locator('.landing')).toHaveAttribute('data-entrada', '')
    // O título do topo estava na tela quando o app montou: visível.
    expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    const titulo = page.getByRole('heading', { name: 'Quantidades em gramas e calorias' })
    expect(await titulo.evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
    await titulo.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect.poll(() => titulo.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    await expect(titulo).toHaveAttribute('data-dentro', '')
    // A foto deriva sem parar: o Playwright nunca a acharia "parada" para rolar até ela.
    const foto = page.getByAltText(/Tomates e cenouras/)
    await foto.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    expect(await foto.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0)
  })
})

test('CA-1484, CB-535, CA-1692 e CB-652: sem JavaScript, a landing pré-desenhada mostra tudo, escura, com as respostas no HTML', async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })
  const pagina = await contexto.newPage()
  await pagina.goto('/')
  await expect(pagina.locator('[data-vitrine]')).toBeVisible()
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText('Planos alimentares completos em vitaminas e minerais')
  for (const titulo of [
    'Adequação de micronutrientes com sugestão do que comer',
    'Acompanhamento da adesão pelo celular',
    'Funcionalidades',
    'Como funciona',
    'Quantidades em gramas e calorias',
    'Planos e preços',
    'Perguntas frequentes',
  ]) {
    await expect(pagina.getByRole('heading', { level: 2, name: titulo })).toBeAttached()
  }
  await expect(pagina.locator('#planos input[type="range"]')).toHaveValue('12')
  await expect(pagina.getByText('Para 12 pacientes ativos, o plano indicado é o Solo.')).toBeAttached()
  await expect(pagina.locator('details p').first()).toHaveText(/Base MetaNutri/)
  expect(await pagina.locator('.landing').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(CHAO)
  // Sem JavaScript, o movimento do CSS corre até o fim (a etiqueta surge em 1,8 s) e nada fica transparente.
  // Sem JavaScript na página, a espera pergunta daqui (o waitForFunction precisa de script na página).
  await expect
    .poll(() =>
      pagina.evaluate(() =>
        document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Number.POSITIVE_INFINITY),
      ),
    )
    .toBe(true)
  const escondidos = await pagina
    .locator('main *')
    .evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === '0' && !el.closest('[aria-hidden="true"]')).length)
  expect(escondidos).toBe(0)
  await contexto.close()
})

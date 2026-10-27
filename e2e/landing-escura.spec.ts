// Spec landing-escura: a landing escura no navegador de verdade (tema, fontes, laranja, campo vivo, chaves, barra,
// celular, teclado, movimento e a página pré-desenhada sem JavaScript). Spec landing-v3: o texto em gramas, e o celular
// nos dois temas da landing (o tema claro tem o e2e dele, landing-v3.spec.ts).
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from './apoio/fumaca.ts'

const CHAO = 'rgb(16, 26, 29)'
const TEAL = 'rgb(14, 59, 67)'
const TINTA = 'rgb(238, 242, 241)'
const LARANJA = 'rgb(242, 106, 46)'
const BRANCO = 'rgb(255, 255, 255)'

async function abrirLanding(pagina: Page, tema: 'claro' | 'escuro' = 'claro', temaDaLanding: 'claro' | 'escuro' = 'escuro') {
  await pagina.addInitScript(
    ([t, l]) => {
      localStorage.setItem('metanutri:tema', t)
      localStorage.setItem('metanutri:tema-da-landing', l)
    },
    [tema, temaDaLanding] as const,
  )
  await pagina.goto('/#/inicio')
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
    test(`CA-1450: com o app no tema ${tema}, a landing é escura e os títulos se leem`, async ({ page }) => {
      const erros = await vigiarConsole(page)
      await abrirLanding(page, tema)
      const raiz = page.locator('.landing')
      expect(await raiz.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(CHAO)
      expect(await raiz.evaluate((el) => getComputedStyle(el).color)).toBe(TINTA)
      expect(await page.getByRole('banner').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(TEAL)
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
    const familias = await page.locator('main h1, main h2, main p, main button, main td').evaluateAll((els) => [
      ...new Set(els.map((el) => getComputedStyle(el).fontFamily.split(',')[0]?.trim())),
    ])
    expect(familias).toEqual(['"Manrope Variable"'])
    expect(await page.getByRole('banner').getByText('MetaNutri', { exact: true }).evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"Bricolage Grotesque Variable"/)
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
    const faixa = page.getByRole('link', { name: /Crie a conta e monte o primeiro plano hoje/ })
    await faixa.hover()
    await expect.poll(() => faixa.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BRANCO)
    await expect.poll(() => faixa.locator('svg').evaluate((el) => getComputedStyle(el).color)).toBe(LARANJA)
  })

  test('CA-1462 a CA-1465: o campo vivo responde ao que se digita e aos exemplos', async ({ page }) => {
    await abrirLanding(page)
    const campo = page.getByRole('textbox', { name: 'Digite o nutriente que falta' })
    const cartao = page.locator('#plano-de-exemplo [aria-live="polite"]')
    await expect(cartao).toContainText('640 de 1.000 mg no dia')
    await campo.fill('vitamina d')
    await expect(cartao).toContainText('Faltam 11,4 µg para a meta.')
    await campo.fill('ferro')
    await expect(cartao).toContainText('Experimente cálcio, vitamina E ou vitamina D.')
    await page.getByRole('button', { name: 'falta vitamina E' }).click()
    await expect(campo).toHaveValue('falta vitamina E')
    await expect(cartao).toContainText('Faltam 8,1 mg para a meta.')
    await expect(page.getByRole('button', { name: 'falta vitamina E' })).toHaveAttribute('aria-pressed', 'true')
    // CB-537: texto longo rola dentro do campo, a página não.
    await campo.fill(`${'a'.repeat(500)} cálcio`)
    await expect(cartao).toContainText('Faltam 260 mg para a meta.')
    await semRolagemLateral(page)
  })

  test('CA-1471 e CB-532: a chave liga pelo teclado, a faixa troca de cor e o efeito aparece', async ({ page }) => {
    await abrirLanding(page)
    const chave = page.getByRole('switch', { name: 'Respeitar a alergia a leite' })
    const faixa = chave.locator('..')
    const antes = await faixa.evaluate((el) => getComputedStyle(el).backgroundColor)
    await chave.focus()
    await page.keyboard.press('Space')
    await expect(chave).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText(/O iogurte sai das sugestões de cálcio/)).toBeVisible()
    await expect.poll(() => faixa.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(antes)
    await page.keyboard.press('Enter')
    await expect(chave).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByText(/O iogurte sai das sugestões de cálcio/)).toHaveCount(0)
  })

  test('CA-1459, CA-1460 e CB-533: a barra pinta a seção, sai ao descer, volta ao subir e com foco; no rodapé, sai', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrirLanding(page)
    const barra = page.getByRole('banner')
    const topoDaBarra = async () => (await barra.boundingBox())?.y ?? 0
    // O título de Grama por grama no alto e mais 600 px para baixo: a barra fica no meio da seção afundada, a mais longa.
    await page.getByRole('heading', { name: 'Grama por grama' }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
    await page.mouse.wheel(0, 600)
    await expect.poll(topoDaBarra).toBeLessThan(-40)
    await page.mouse.wheel(0, -150)
    await expect.poll(topoDaBarra).toBe(0)
    await expect(barra).toHaveAttribute('data-tinta', 'afundado')
    expect(await barra.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(20, 34, 38)')
    await page.mouse.wheel(0, 300)
    await expect.poll(topoDaBarra).toBeLessThan(-40)
    await barra.getByRole('link', { name: 'Entrar' }).focus()
    await expect.poll(topoDaBarra).toBe(0)
    // Sobre a faixa marfim do fim da página, a barra fica teal (marfim sobre marfim sumiria). O rodapé, mais baixo que a
    // tela, nunca chega embaixo da barra; a regra de sair nele está no teste de unidade (barraDoTopo.test.ts).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.mouse.wheel(0, -1)
    await expect(barra).toHaveAttribute('data-tinta', 'teal')
  })

  test('CA-1486: com menos movimento, nada se move e nada fica escondido', async ({ page }) => {
    await abrirLanding(page)
    const altura = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < altura; y += 600) await page.evaluate((v) => window.scrollTo(0, v), y)
    expect(await page.locator('.landing').getAttribute('data-entrada')).toBeNull()
    const escondidos = await page.locator('main *').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === '0').length)
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
    test(`CA-1488, CA-1489, CA-1626 e CB-531: em ${largura} px, landing ${temaDaLanding}, sem rolar para o lado e com alvos de 44 px`, async ({ page }) => {
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
      // Com o texto do tamanho normal, o "Adicionar" das sugestões fica na linha do alimento; só desce com texto grande.
      const desceram = await page.locator('[data-ui] li').evaluateAll((lis) =>
        lis
          .filter((li) => li.getClientRects().length > 0)
          .filter((li) => {
            const [texto, botao] = [li.firstElementChild, li.lastElementChild].map((el) => el?.getBoundingClientRect())
            return texto && botao && botao.top >= texto.bottom - 1
          })
          .map((li) => li.textContent),
      )
      expect(desceram).toEqual([])
      const pequenos = await page.locator('.landing a, .landing button:not([role="switch"]), .landing summary, .landing input').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0)
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map((el) => `${el.tagName} ${el.textContent?.trim() ?? ''} ${Math.round(el.getBoundingClientRect().height)}`),
      )
      expect(pequenos).toEqual([])
      // A chave: a área de toque passa da bolinha (10 px em volta), conferida pelo que o dedo acerta 20 px acima do centro.
      for (const chave of await page.getByRole('switch').all()) {
        await chave.scrollIntoViewIfNeeded()
        const caixa = await chave.boundingBox()
        if (!caixa) throw new Error('chave sem medida')
        expect(caixa.height + 20).toBeGreaterThanOrEqual(44)
        const acertou = await page.evaluate(
          ([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.getAttribute('role'),
          [caixa.x + caixa.width / 2, caixa.y - 8],
        )
        expect(acertou).toBe('switch')
      }
      // Grama por grama (spec landing-v3, D-603): cada linha é o alimento, os gramas e as calorias, lado a lado.
      const linha = page.getByRole('row', { name: /Patinho grelhado sem gordura/ })
      const celulas = await Promise.all([0, 1, 2].map((i) => linha.getByRole('cell').nth(i).boundingBox()))
      const [alimento, gramas, kcal] = celulas
      if (!alimento || !gramas || !kcal) throw new Error('linha sem medida')
      expect(gramas.x).toBeGreaterThan(alimento.x + alimento.width - 1)
      expect(kcal.x + kcal.width).toBeLessThanOrEqual(largura)
    })
  }

  test('CA-1490: pelo teclado, o foco é visível e nunca cai num botão de fragmento', async ({ page }) => {
    await abrirLanding(page)
    const vistos: string[] = []
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press('Tab')
      const foco = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return null
        const estilo = getComputedStyle(el)
        const texto = el instanceof HTMLInputElement ? `campo: ${el.value}` : (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)
        return { texto, contorno: estilo.outlineStyle, noFragmento: el.closest('[data-ui]') !== null && !(el instanceof HTMLInputElement) }
      })
      if (!foco) continue
      expect(foco.contorno, foco.texto).not.toBe('none')
      expect(foco.noFragmento, foco.texto).toBe(false)
      vistos.push(foco.texto)
    }
    expect(vistos.slice(0, 2)).toEqual(['MetaNutri, início', 'Como funciona'])
    expect(vistos).toContain('campo: falta cálcio')
    expect(vistos).toContain('Respeitar a alergia a leite')
  })
})

test.describe('com movimento', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('CA-1487: as partes entram ao rolar, uma vez, e a foto deriva; o que já estava na tela não pisca', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrirLanding(page)
    await expect(page.locator('.landing')).toHaveAttribute('data-entrada', '')
    // O título do topo estava na tela quando o app montou: entra marcado, visível.
    expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    const tituloDaCozinha = page.getByRole('heading', { name: 'Grama por grama' })
    expect(await tituloDaCozinha.evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
    await tituloDaCozinha.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect.poll(() => tituloDaCozinha.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    await expect(tituloDaCozinha).toHaveAttribute('data-dentro', '')
    // A foto deriva sem parar: o Playwright nunca a acharia "parada" para rolar até ela.
    const foto = page.getByAltText(/Tomates e cenouras/)
    await foto.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    expect(await foto.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0)
  })
})

test('CA-1484 e CB-535: sem JavaScript, a landing pré-desenhada mostra tudo, escura, com as respostas no HTML', async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })
  const pagina = await contexto.newPage()
  await pagina.goto('/')
  await expect(pagina.locator('[data-vitrine]')).toBeVisible()
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText(/Falta cálcio\?\s*150 g de iogurte\./)
  for (const titulo of ['O que falta no plano da Maria, 28 anos?', 'O plano sai do seu jeito', 'Como funciona', 'Grama por grama', 'Quanto custa', 'Perguntas de quem atende']) {
    await expect(pagina.getByRole('heading', { level: 2, name: titulo })).toBeAttached()
  }
  await expect(pagina.locator('#plano-de-exemplo input')).toHaveValue('falta cálcio')
  await expect(pagina.locator('details p').first()).toHaveText(/Base MetaNutri/)
  expect(await pagina.locator('.landing').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(CHAO)
  const escondidos = await pagina.locator('main *').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === '0').length)
  expect(escondidos).toBe(0)
  await contexto.close()
})

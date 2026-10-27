// Spec landing-v3, seção v9: a landing v9 no navegador de verdade (a barra presa, a foto do topo, a linha de "Como
// funciona", a troca dos preços, a faixa "Começar", o botão fixo do celular e o pior caso de texto grande e zoom).
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral } from './apoio/fumaca.ts'

async function abrir(pagina: Page, temaDaLanding: 'claro' | 'escuro' = 'escuro') {
  await pagina.addInitScript((l) => localStorage.setItem('metanutri:tema-da-landing', l), temaDaLanding)
  await pagina.goto('/#/inicio')
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
  await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Contraste WCAG entre duas cores `rgb(...)` (ou `rgba(...)`, sem a transparência). */
function contraste(a: string, b: string): number {
  const lum = (cor: string) => {
    const [r = 0, g = 0, bl = 0] = (cor.match(/\d+(\.\d+)?/g) ?? []).map(Number).map((c) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** A cor do anel desenhado com `box-shadow: inset … cor` e o fundo do botão em volta dele. */
const corDoAnelEFundo = (pagina: Page, anel: string) =>
  pagina
    .locator(anel)
    .first()
    .evaluate((el) => {
      const sombra = getComputedStyle(el).boxShadow
      // O Tailwind compõe a sombra com camadas transparentes (0 0 #0000); o anel é a camada com cor.
      const cor = (sombra.match(/rgba?\([^)]*\)/g) ?? []).find((c) => !/,\s*0\)$/.test(c)) ?? ''
      const botao = el.closest('button')
      return [cor, botao ? getComputedStyle(botao).backgroundColor : ''] as const
    })

/**
 * CA-1689 (revisão da v9): o contraste do título do topo com cada pixel atrás dele. Esconde a letra, fotografa a caixa
 * do título e compara cada pixel com a cor do título; devolve o pior pixel e o 1% pior.
 */
async function contrasteAtrasDoTitulo(pagina: Page): Promise<{ readonly pior: number; readonly p1: number }> {
  await pagina.evaluate(() => window.scrollTo(0, 0))
  const foto = pagina.getByAltText(/Copo de iogurte/)
  await expect.poll(() => foto.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true)
  const titulo = pagina.getByRole('heading', { level: 1 })
  const cor = await titulo.evaluate((el) => getComputedStyle(el).color)
  const caixa = await titulo.boundingBox()
  if (!caixa) throw new Error('sem o título')
  await titulo.evaluate((el) => el.style.setProperty('color', 'transparent'))
  const png = await pagina.screenshot({ clip: caixa })
  await titulo.evaluate((el) => el.style.removeProperty('color'))
  // A decodificação numa página em branco, sem a regra de conteúdo do site.
  const leitor = await pagina.context().newPage()
  const medida = await leitor.evaluate(
    async ({ dados, texto }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${dados}`
      await img.decode()
      const tela = document.createElement('canvas')
      tela.width = img.width
      tela.height = img.height
      const contexto = tela.getContext('2d')
      if (!contexto) throw new Error('sem canvas')
      contexto.drawImage(img, 0, 0)
      const { data } = contexto.getImageData(0, 0, tela.width, tela.height)
      const canal = (v: number) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      const lum = (r: number, g: number, b: number) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
      const [tr = 0, tg = 0, tb = 0] = (texto.match(/\d+/g) ?? []).map(Number)
      const daLetra = lum(tr, tg, tb)
      const razoes: number[] = []
      for (let i = 0; i < data.length; i += 4) {
        const l = lum(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
        razoes.push((Math.max(l, daLetra) + 0.05) / (Math.min(l, daLetra) + 0.05))
      }
      razoes.sort((a, b) => a - b)
      return { pior: razoes[0] ?? 0, p1: razoes[Math.floor(razoes.length * 0.01)] ?? 0 }
    },
    { dados: png.toString('base64'), texto: cor },
  )
  await leitor.close()
  return medida
}

/** A transformação calculada do traço aceso de "Como funciona" (o `::after` da lista). */
const linhaAcesa = (pagina: Page) => pagina.locator('.landing-etapas').evaluate((el) => getComputedStyle(el, '::after').transform)

test.describe('com menos movimento', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const tema of ['escuro', 'claro'] as const) {
    test(`CA-1665 e CA-1668: landing ${tema}, o anel da sugestão não escolhida e o da missão desmarcada têm contraste de 3:1`, async ({ page }) => {
      await abrir(page, tema)
      const [anelDaSugestao, fundoDaSugestao] = await corDoAnelEFundo(page, '#adequacao button[aria-pressed="false"] i')
      expect(contraste(anelDaSugestao, fundoDaSugestao), `${anelDaSugestao} sobre ${fundoDaSugestao}`).toBeGreaterThanOrEqual(3)
      const [anelDaMissao, fundoDaMissao] = await corDoAnelEFundo(page, '[aria-label="Missões do dia (exemplo)"] button[aria-pressed="false"] > span')
      expect(contraste(anelDaMissao, fundoDaMissao), `${anelDaMissao} sobre ${fundoDaMissao}`).toBeGreaterThanOrEqual(3)
    })
  }

  for (const tema of ['escuro', 'claro'] as const) {
    for (const largura of [390, 768, 1024, 1280, 1440, 2000]) {
      test(`CA-1689: landing ${tema} em ${largura} px, o título do topo contrasta 4,5:1 com cada pixel da foto atrás dele`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: largura < 720 ? 844 : 900 })
        await abrir(page, tema)
        const { pior, p1 } = await contrasteAtrasDoTitulo(page)
        expect(pior, `pior pixel ${pior.toFixed(2)}:1, 1% pior ${p1.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  test('CA-1651: a barra fica no alto em qualquer ponto da página, também no rodapé', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrir(page)
    const barra = page.getByRole('banner')
    for (const id of ['adequacao', 'como-funciona', 'planos']) {
      await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.mouse.wheel(0, 200)
      await expect.poll(async () => (await barra.boundingBox())?.y, id).toBe(0)
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(async () => (await barra.boundingBox())?.y).toBe(0)
    expect(await barra.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain('blur(18px)')
  })

  test('CA-1654 e CA-1656: a etiqueta aparece no computador e some no celular; com menos movimento, a foto não anima', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    const etiqueta = page.locator('[data-etiqueta]')
    await expect(etiqueta).toBeVisible()
    await expect(etiqueta).toHaveText('No plano de exemplo, falta cálcio150 g de iogurte natural desnatado cobrem 91%')
    expect(await page.getByAltText(/Copo de iogurte/).evaluate((el) => el.getAnimations().length)).toBe(0)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(etiqueta).toBeHidden()
  })

  test('CA-1674 e CB-650: com menos movimento, a linha de "Como funciona" e os números já nascem acesos', async ({ page }) => {
    await abrir(page)
    expect(await linhaAcesa(page)).toBe('none')
  })

  test('CA-1682 e CB-650: com menos movimento, o feixe não gira, o indicado não sobe e o preço troca só a opacidade', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    const indicado = page.locator('#planos [data-indicado]')
    expect(await indicado.locator('.landing-feixe').evaluate((el) => el.getAnimations().length)).toBe(0)
    expect(['none', '0px']).toContain(await indicado.evaluate((el) => getComputedStyle(el).translate))
    await page.getByRole('button', { name: 'Anual' }).click()
    const mensal = indicado.locator('[aria-hidden="true"]:has(> p)').first()
    await expect.poll(() => mensal.evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
    expect(await mensal.evaluate((el) => getComputedStyle(el).filter)).toBe('none')
    expect(['none', '0px']).toContain(await mensal.evaluate((el) => getComputedStyle(el).translate))
  })

  for (const largura of [2000, 1440, 390]) {
    test(`CA-1684: em ${largura} px, a frase termina acima da palavra "Começar" e o cedilha cabe na faixa`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 900 })
      await abrir(page)
      await page.locator('[data-faixa-final]').scrollIntoViewIfNeeded()
      await page.evaluate(() => document.fonts.ready)
      const medida = await page.evaluate(() => {
        const faixa = document.querySelector<HTMLElement>('[data-faixa-final]')
        const palavra = faixa?.querySelector<HTMLElement>('[data-palavra]')
        const frase = faixa?.querySelector('p')
        if (!faixa || !palavra || !frase) throw new Error('sem a faixa')
        const estilo = getComputedStyle(palavra)
        const contexto = document.createElement('canvas').getContext('2d')
        if (!contexto) throw new Error('sem canvas')
        contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`
        const tinta = contexto.measureText(palavra.textContent ?? '')
        // A linha de base da palavra: o pé de uma marca sem altura alinhada a ela.
        const marca = document.createElement('span')
        marca.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
        palavra.append(marca)
        const base = marca.getBoundingClientRect().bottom
        marca.remove()
        return {
          fraseFim: frase.getBoundingClientRect().bottom,
          tintaTopo: base - tinta.actualBoundingBoxAscent,
          tintaFim: base + tinta.actualBoundingBoxDescent,
          faixaFim: faixa.getBoundingClientRect().bottom,
        }
      })
      expect(medida.fraseFim, 'a frase não fica embaixo da palavra').toBeLessThan(medida.tintaTopo)
      expect(medida.tintaFim, 'o cedilha não é cortado').toBeLessThanOrEqual(medida.faixaFim)
    })
  }

  test('CA-1686: em 390 px, "Criar conta grátis" fica preso no pé da tela, leva ao cadastro e não cobre o rodapé no fim', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrir(page)
    const fixo = page.locator('[data-botao-fixo]').getByRole('link', { name: 'Criar conta grátis' })
    await expect(fixo).toBeVisible()
    const caixa = await fixo.boundingBox()
    if (!caixa) throw new Error('sem o botão fixo')
    expect(caixa.height).toBeGreaterThanOrEqual(44)
    expect(844 - (caixa.y + caixa.height)).toBeGreaterThanOrEqual(12)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const ultimo = await page.getByRole('contentinfo').getByText(/^Brasil, \d{4}$/).boundingBox()
    const fixoNoFim = await fixo.boundingBox()
    expect((ultimo?.y ?? 0) + (ultimo?.height ?? 0)).toBeLessThanOrEqual(fixoNoFim?.y ?? 0)
    await fixo.click()
    await expect(page).toHaveURL(/#\/criar-conta$/)
  })

  test('CA-1686: no computador, o botão fixo não aparece', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    await expect(page.locator('[data-botao-fixo]')).toBeHidden()
  })

  for (const [largura, texto] of [
    [360, 200],
    [390, 150],
    [720, 200],
  ] as const) {
    test(`CA-1691 e CB-660: em ${largura} px com o texto a ${texto}%, nenhuma peça passa da tela`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 844 })
      await abrir(page, 'claro')
      await page.addStyleTag({ content: `html { font-size: ${texto}% !important; }` })
      await semRolagemLateral(page)
      const fora = await page.locator('.landing a, .landing button, .landing input, .landing p, .landing h1, .landing h2, .landing h3, .landing li, .landing td').evaluateAll((els) =>
        els
          .filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]') && !el.closest('[role="group"][aria-label^="Missões"]'))
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5 || el.getBoundingClientRect().left < -0.5)
          .map((el) => (el.textContent ?? '').trim().slice(0, 40)),
      )
      expect(fora).toEqual([])
    })
  }
})

test.describe('com movimento', () => {
  test.use({ reducedMotion: 'no-preference' })

  test('CA-1656: aberta pelo app, a foto do topo assenta', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    // Pelo app: sai da landing e volta, para ela montar sem a página pré-desenhada.
    await page.evaluate(() => {
      location.hash = '#/precos'
    })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
    await page.evaluate(() => {
      location.hash = '#/inicio'
    })
    const foto = page.getByAltText(/Copo de iogurte/)
    await expect(foto).toBeVisible()
    expect(await foto.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual(['landing-assentar'])
  })

  test('CA-1674: a linha de "Como funciona" espera a lista entrar na tela e então acende', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    expect(await linhaAcesa(page)).toBe('matrix(0, 0, 0, 1, 0, 0)')
    await page.locator('.landing-etapas').evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(page.locator('.landing-etapas')).toHaveAttribute('data-dentro', '')
    // Acesa, a linha volta ao desenho de base (sem transformação).
    await expect.poll(() => linhaAcesa(page), { timeout: 5000 }).toBe('none')
  })

  test('CA-1682: na troca para o anual, o preço do mês desfoca e sobe; o feixe do indicado gira', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    await page.locator('#planos').evaluate((el) => el.scrollIntoView({ block: 'start' }))
    const indicado = page.locator('#planos [data-indicado]')
    expect(await indicado.locator('.landing-feixe').evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual(['landing-girar'])
    await page.getByRole('button', { name: 'Anual' }).click()
    const mensal = indicado.locator('[aria-hidden="true"]:has(> p)').first()
    await expect.poll(() => mensal.evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).filter])).toEqual(['0', 'blur(6px)'])
    expect(await mensal.evaluate((el) => getComputedStyle(el).translate)).not.toBe('none')
    await expect(indicado.getByRole('button', { name: 'Assinar o Solo anual' })).toBeVisible()
  })
})

test('CA-1674 e CA-1692: na página pré-desenhada, sem JavaScript, a linha de "Como funciona" já está acesa', async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const pagina = await contexto.newPage()
  await pagina.goto('/')
  await expect(pagina.locator('[data-vitrine]')).toBeVisible()
  expect(await linhaAcesa(pagina)).toBe('none')
  await contexto.close()
})

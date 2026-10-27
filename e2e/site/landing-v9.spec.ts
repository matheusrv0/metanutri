// Spec landing-v3, seção v9: a landing v9 no navegador de verdade (a barra presa, a foto do topo, a linha de "Como
// funciona", a troca dos preços, a faixa "Começar", o botão fixo do celular e o pior caso de texto grande e zoom).
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral } from '../apoio/fumaca.ts'

async function abrir(pagina: Page, temaDaLanding: 'claro' | 'escuro' = 'escuro') {
  await pagina.addInitScript((l) => localStorage.setItem('metanutri:tema-da-landing', l), temaDaLanding)
  await pagina.goto('/')
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

/**
 * D-688: guarda o `behavior` de cada `window.scrollTo` da página daqui em diante. O Chromium sem janela dos testes não
 * anima a rolagem suave (ela chega na hora, com ou sem movimento), então o e2e confere o pedido que a página faz.
 */
async function vigiarRolagem(pagina: Page): Promise<() => Promise<string[]>> {
  await pagina.evaluate(() => {
    const original = window.scrollTo.bind(window)
    const pedidos: string[] = []
    Object.assign(window, { pedidosDeRolagem: pedidos })
    window.scrollTo = ((opcoes?: ScrollToOptions | number, y?: number) => {
      if (typeof opcoes === 'number') return original(opcoes, y ?? 0)
      pedidos.push(opcoes?.behavior ?? 'auto')
      original(opcoes)
    }) as typeof window.scrollTo
  })
  return () => pagina.evaluate(() => (window as Window & { pedidosDeRolagem?: string[] }).pedidosDeRolagem ?? [])
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

  test('CA-1654 e CB-660: a etiqueta some até 1.023 px e, quando aparece, não fica em cima de "Ver o plano de exemplo"', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    const etiqueta = page.locator('[data-etiqueta]')
    const link = page.getByRole('link', { name: 'Ver o plano de exemplo' })
    for (const largura of [721, 760, 790, 900, 1023]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await expect(etiqueta, `${largura} px`).toBeHidden()
    }
    for (const largura of [1024, 1100, 1280, 1440, 2000]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await expect(etiqueta, `${largura} px`).toBeVisible()
      const [a, b] = [await etiqueta.boundingBox(), await link.boundingBox()]
      if (!a || !b) throw new Error('sem medida')
      const cruzam = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      expect(cruzam, `${largura} px`).toBe(false)
      // O clique no meio do link cai no link.
      const noPonto = await page.evaluate(([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.closest('a')?.textContent, [b.x + b.width / 2, b.y + b.height / 2])
      expect(noPonto, `${largura} px`).toBe('Ver o plano de exemplo')
    }
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
    // D-688: o fixo espera o "Criar conta grátis" do topo sair da tela.
    await page.locator('#adequacao').evaluate((el) => el.scrollIntoView())
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

  test('CA-1686 e CA-1694: em 390 px, o foco do teclado nunca fica embaixo do botão fixo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrir(page)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom)).toBe('88px')
    const fixo = page.locator('[data-botao-fixo]')
    const topoDoFixo = (await fixo.boundingBox())?.y ?? 0
    // Do alto da página, o Tab desce pelas perguntas: cada uma, ao ganhar o foco, fica acima do botão.
    const perguntas = page.locator('summary')
    await perguntas.first().focus()
    for (let i = 1; i < (await perguntas.count()); i++) {
      await page.keyboard.press('Tab')
      const caixa = await page.evaluate(() => {
        const el = document.activeElement
        return el ? { fim: el.getBoundingClientRect().bottom, texto: el.textContent } : null
      })
      expect(caixa?.fim ?? 0, caixa?.texto ?? '').toBeLessThanOrEqual(topoDoFixo)
    }
  })

  test('CA-1686: no computador, sem o botão fixo, a página não reserva espaço embaixo', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom)).toBe('auto')
  })

  test('CA-1696 e CA-1697: em 360 × 740 px, o fixo espera o "Criar conta grátis" do topo sair da tela e nunca fica sobre ele', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await abrir(page)
    const fixo = page.locator('[data-botao-fixo]')
    const doTopo = page.getByRole('region', { name: /Planos alimentares completos/ }).getByRole('button', { name: 'Criar conta grátis' })
    // No alto: o do topo e a linha do Free à vista; o fixo transparente, inerte e fora do leitor de tela.
    await expect(doTopo).toBeInViewport({ ratio: 1 })
    await expect(page.getByText('Grátis com 2 pacientes ativos. Sem cartão de crédito.')).toBeInViewport({ ratio: 1 })
    await expect(fixo).toHaveCSS('opacity', '0')
    await expect(fixo).toHaveAttribute('aria-hidden', 'true')
    await expect(fixo).toHaveJSProperty('inert', true)
    await expect(fixo.getByRole('link', { name: 'Criar conta grátis' })).toHaveCount(0)

    // Descendo de 40 em 40 px: o fixo só fica à vista com o do topo fora da tela, e os dois nunca se cruzam.
    for (let y = 0; y <= 1200; y += 40) {
      await page.evaluate((alto) => window.scrollTo(0, alto), y)
      // Dois quadros: o aviso do IntersectionObserver chega depois da rolagem.
      await page.evaluate(() => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))))
      const medida = await page.evaluate(() => {
        const [botaoFixo, botaoDoTopo] = [document.querySelector('[data-botao-fixo]'), document.querySelector('[data-acao-do-topo]')]
        if (!(botaoFixo instanceof HTMLElement) || !botaoDoTopo) return null
        const [a, b] = [botaoFixo.getBoundingClientRect(), botaoDoTopo.getBoundingClientRect()]
        return {
          fixoAVista: !botaoFixo.inert || getComputedStyle(botaoFixo).opacity !== '0',
          topoNaTela: b.bottom > 0 && b.top < window.innerHeight,
          cruzam: a.top < b.bottom && b.top < a.bottom && a.left < b.right && b.left < a.right,
        }
      })
      if (!medida) throw new Error('sem um dos botões')
      if (medida.fixoAVista) {
        expect(medida.topoNaTela, `em ${y} px, o do topo ainda estava na tela`).toBe(false)
        expect(medida.cruzam, `em ${y} px`).toBe(false)
      }
    }
    await expect(doTopo).not.toBeInViewport()
    await expect(fixo).toHaveCSS('opacity', '1')
    await expect(fixo).not.toHaveAttribute('aria-hidden')
    await expect(fixo).toHaveJSProperty('inert', false)

    // De volta ao alto, ele some de novo; descendo outra vez, aparece e leva ao cadastro.
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(fixo).toHaveCSS('opacity', '0')
    await expect(fixo).toHaveJSProperty('inert', true)
    await page.evaluate(() => window.scrollTo(0, 1200))
    await fixo.getByRole('link', { name: 'Criar conta grátis' }).click()
    await expect(page).toHaveURL(/#\/criar-conta$/)
  })

  test('CA-1686: no computador, o botão fixo não aparece', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    await expect(page.locator('[data-botao-fixo]')).toBeHidden()
  })

  test('CA-1695: com menos movimento, "Voltar ao topo" chega ao alto na hora e leva o foco para a logo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrir(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
    const pedidos = await vigiarRolagem(page)
    await page.getByRole('contentinfo').getByRole('link', { name: 'Voltar ao topo' }).click()
    // Sem pedir rolagem suave: com menos movimento, o `auto` da página não anima.
    expect(await pedidos()).toEqual(['auto'])
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.getByRole('banner').getByRole('link', { name: 'MetaNutri, início' })).toBeFocused()
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

  test('CA-1695: com movimento, "Voltar ao topo" rola suave até o alto e leva o foco para a logo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await abrir(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
    const pedidos = await vigiarRolagem(page)
    await page.getByRole('contentinfo').getByRole('link', { name: 'Voltar ao topo' }).click()
    expect(await pedidos()).toEqual(['smooth'])
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.getByRole('banner').getByRole('link', { name: 'MetaNutri, início' })).toBeFocused()
  })

  // DP-SA-56: o app não tem mais a landing, e o site sempre abre sobre a página pré-desenhada; o caso "do zero" fica no
  // teste do componente (src/ui/publico/TelaInicio.test.tsx).
  test('CA-1656 e CA-1657: no site, a foto do topo assenta, continuando o desenho pronto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrir(page)
    const foto = page.getByAltText(/Copo de iogurte/)
    await expect(foto).toBeVisible()
    expect(await foto.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))).toEqual(['landing-assentar'])
    // O movimento que o React monta começa com atraso negativo: o tempo que o da página pré-desenhada já correu.
    expect(Number.parseFloat(await foto.evaluate((el) => getComputedStyle(el).animationDelay))).toBeLessThan(0)
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

// Spec site-publico-profissional: o site público no navegador, o HTML que o build publica e as páginas próprias.
import { expect, test, type Page } from '@playwright/test'
import { diretivasDaPolitica, textoDaPolitica } from '../src/seguranca/csp.ts'
import { metaDaPolitica } from '../src/seguranca/pluginCsp.ts'
import { semRolagemLateral, vigiarConsole } from './apoio/fumaca.ts'

const PROIBIDO = /fundador|200 primeiras|até sem internet|funciona sem internet|offline|não foram conferidos/i
const TEMAS = ['claro', 'escuro'] as const

async function abrir(pagina: Page, endereco: string, tema: (typeof TEMAS)[number]) {
  await pagina.addInitScript((t) => localStorage.setItem('metanutri:tema', t), tema)
  await pagina.goto(endereco)
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
}

const atributo = (html: string, padrao: RegExp) => padrao.exec(html)?.[1] ?? null

test.describe('CA-1022: landing, Preços e rodapé em 390 e 1280 px, claro e escuro', () => {
  for (const largura of [390, 1280]) {
    for (const tema of TEMAS) {
      test(`landing em ${largura} px, tema ${tema}`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        const erros = await vigiarConsole(page)
        await abrir(page, '/#/inicio', tema)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Falta cálcio\?/)
        await semRolagemLateral(page)
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        // Spec landing-escura (D-545): a barra da landing tem o menu "Principal", em caixa normal.
        const menu = page.getByRole('navigation', { name: 'Principal' })
        for (const item of await menu.getByRole('link').all()) {
          expect(await item.evaluate((el) => getComputedStyle(el).textTransform)).toBe('none')
        }
        await expect(menu.getByRole('link').filter({ visible: true })).toHaveText(
          largura < 720 ? ['Entrar', 'Criar conta'] : ['Como funciona', 'Preços', 'Entrar', 'Criar conta grátis'],
          { useInnerText: true },
        )
        const rodape = page.getByRole('contentinfo')
        await rodape.scrollIntoViewIfNeeded()
        await expect(rodape.getByRole('navigation', { name: 'Rodapé' }).getByRole('link')).toHaveText(['Preços', 'Termos de uso', 'Política de privacidade', 'Referências'])
        expect(await rodape.innerText()).not.toMatch(/Fontes dos dados|NASEM|conferidos|8\.234|programa de nutrição/)
        expect(erros).toEqual([])
      })

      test(`Preços em ${largura} px, tema ${tema}: a nota do Estudante não fica espremida`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        await abrir(page, '/#/precos', tema)
        await semRolagemLateral(page)
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        const nota = page.getByRole('note', { name: 'Plano Estudante' }).filter({ visible: true })
        await expect(nota).toHaveCount(1)
        const texto = await nota.locator('p').boundingBox()
        const botao = await nota.getByRole('button', { name: 'Criar conta de estudante' }).boundingBox()
        if (!texto || !botao) throw new Error('sem medida da nota')
        expect(texto.width, 'largura do texto da nota').toBeGreaterThanOrEqual(200)
        if (largura < 640) expect(botao.y).toBeGreaterThanOrEqual(texto.y + texto.height - 1)
        else expect(botao.x).toBeGreaterThan(texto.x + texto.width - 1)
        // CA-998: tudo visível desde o primeiro quadro, sem animação de entrada.
        const invisiveis = await page.locator('main *').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === '0').length)
        expect(invisiveis).toBe(0)
      })
    }
  }
})

test.describe('CA-1002 e CA-1456: título e "Criar conta grátis" na primeira tela', () => {
  for (const [largura, altura] of [
    [1280, 720],
    [390, 844],
  ] as const) {
    test(`em ${largura} × ${altura}`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura })
      await page.goto('/#/inicio')
      await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 })
      const topo = page.getByRole('region', { name: /Falta cálcio/ })
      await expect(topo.getByRole('button', { name: 'Criar conta grátis' })).toBeInViewport({ ratio: 1 })
    })
  }
})

test('CA-1009, CA-1011, CA-1013 e CA-1020: o index.html publicado tem o cabeçalho de busca e a landing escrita', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toMatch(/<html lang="pt-BR">/)
  const titulo = atributo(html, /<title>([^<]+)<\/title>/) ?? ''
  expect(titulo).toBe('MetaNutri: software para nutricionistas que diz o que comer')
  expect(titulo.length).toBeLessThanOrEqual(60)
  const descricao = atributo(html, /<meta name="description" content="([^"]+)" \/>/) ?? ''
  expect(descricao.length).toBeGreaterThan(50)
  expect(descricao.length).toBeLessThanOrEqual(155)
  expect(html).toContain('<link rel="canonical" href="https://metanutri.com.br/" />')
  for (const nome of ['og:title', 'og:description', 'og:url', 'og:image', 'og:locale']) expect(html).toContain(`<meta property="${nome}"`)
  expect(html).toContain('<meta property="og:image" content="https://metanutri.com.br/imagem-compartilhar.png" />')
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  expect(html).toContain('<meta name="theme-color"')
  expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png" />')

  const bloco = atributo(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  const dados = JSON.parse(bloco ?? 'null') as { '@graph': { '@type': string; offers?: { price: string; priceCurrency: string }[] }[] }
  expect(dados['@graph'].map((no) => no['@type'])).toEqual(['Organization', 'SoftwareApplication'])
  const ofertas = dados['@graph'][1]?.offers ?? []
  expect(ofertas.map((o) => o.price)).toEqual(['0', '0', '34.90', '299.00', '64.90', '599.00'])
  expect(ofertas.every((o) => o.priceCurrency === 'BRL')).toBe(true)

  const raiz = html.slice(html.indexOf('<div id="root">'))
  expect(raiz).toMatch(/<h1[^>]*><span[^>]*>Falta cálcio\?/)
  for (const trecho of ['O que falta no plano da Maria, 28 anos?', 'Como funciona', 'Quanto custa', 'Solo: R$ 34,90 por mês', 'Termos de uso', 'Referências']) {
    expect(raiz).toContain(trecho)
  }
  expect(html).toMatch(/<link rel="preload" href="\.\/assets\/manrope-latin-wght-normal-[\w-]+\.woff2" as="font" type="font\/woff2" crossorigin \/>/)
  // Spec landing-escura: sem foto no topo; as três fotos da página são preguiçosas.
  expect(raiz).not.toContain('fetchpriority')
  expect((raiz.match(/-800\.webp 800w/g) ?? []).length).toBe(3)
  expect((raiz.match(/loading="lazy"/g) ?? []).length).toBe(3)
})

test('CA-1014: as páginas próprias saem com cabeçalho, <base>, data-rota, a mesma CSP e a tela escrita', async ({ request }) => {
  const csp = metaDaPolitica(textoDaPolitica(diretivasDaPolitica({ supabase: null })))
  for (const [caminho, h1] of [
    ['precos', 'Planos e preços'],
    ['termos', 'Termos de uso'],
    ['privacidade', 'Política de privacidade'],
    ['fontes', 'Referências'],
  ] as const) {
    const resposta = await request.get(`/${caminho}/`)
    expect(resposta.status()).toBe(200)
    const html = await resposta.text()
    expect(html).toContain(`<link rel="canonical" href="https://metanutri.com.br/${caminho}/" />`)
    expect(html).toContain(`<html lang="pt-BR" data-rota="${caminho}">`)
    expect(html).toContain(`${csp}\n    <base href="../" />`)
    expect(html).toMatch(new RegExp(`<h1[^>]*>${h1}`))
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/)
  }
})

test('CA-1015: a página própria abre o app na tela dela, com o endereço da raiz e sem erro no console', async ({ page }) => {
  const erros = await vigiarConsole(page)
  for (const [caminho, h1] of [
    ['precos', 'Planos e preços'],
    ['termos', 'Termos de uso'],
    ['privacidade', 'Política de privacidade'],
    ['fontes', 'Referências'],
  ] as const) {
    await page.goto(`/${caminho}/`)
    await expect(page).toHaveURL(new RegExp(`/#/${caminho}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1)
    await expect(page.locator('[data-vitrine]')).toHaveCount(0)
  }
  // Daí em diante o app é o de sempre: o menu leva à landing da raiz.
  await page.getByRole('banner').getByRole('button', { name: 'MetaNutri, início' }).click()
  await expect(page).toHaveURL(/\/#\/inicio$/)
  expect(erros).toEqual([])
})

test('CA-1016 e CA-1017: sem o app, o link do paciente não mostra a vitrine e o tema escuro já vale', async ({ page }) => {
  // O pacote do app não carrega: o que aparece é só o HTML publicado e o script do <head>.
  await page.route(/\/assets\/index-[\w-]+\.js$/, (rota) => rota.abort())
  await page.addInitScript(() => localStorage.setItem('metanutri:tema', 'escuro'))
  await page.goto('/#/missoes/qualquer')
  await expect(page.locator('[data-vitrine]')).toBeHidden()
  await page.goto('/#/inicio')
  await page.reload()
  await expect(page.locator('[data-vitrine]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(241, 240, 240)')
})

test('CA-1025: com o service worker ativo, os arquivos de texto abrem como arquivo e /precos sem barra abre Preços', async ({ page }) => {
  await page.goto('/#/inicio')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  for (const arquivo of ['sitemap.xml', 'robots.txt', 'llms.txt']) {
    await page.goto(`/${arquivo}`)
    // Sem a lista de exclusão, o service worker entregava o index.html (a página do app) nesse endereço.
    expect(await page.evaluate(() => document.contentType), arquivo).not.toBe('text/html')
  }
  await page.goto('/precos')
  await expect(page).toHaveURL(/\/#\/precos$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
})

test('CA-1028: menu e rodapé são links para as páginas próprias, e o clique troca de tela sem recarregar', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  for (const destino of ['precos/', 'termos/', 'privacidade/', 'fontes/']) expect(html).toContain(`href="${destino}"`)

  await page.goto('/#/inicio')
  await expect(page.locator('[data-vitrine]')).toHaveCount(0)
  await page.evaluate(() => {
    ;(window as unknown as { mesmaPagina: boolean }).mesmaPagina = true
  })
  // Spec landing-escura: na landing, o link para a página de Preços fica no rodapé (o da barra rola até a seção).
  const precos = page.getByRole('contentinfo').getByRole('navigation', { name: 'Rodapé' }).getByRole('link', { name: 'Preços' })
  await expect(precos).toHaveAttribute('href', 'precos/')
  await precos.click()
  await expect(page).toHaveURL(/\/#\/precos$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
  expect(await page.evaluate(() => (window as unknown as { mesmaPagina?: boolean }).mesmaPagina)).toBe(true)
  await page.getByRole('contentinfo').getByRole('link', { name: 'Termos de uso' }).click()
  await expect(page).toHaveURL(/\/#\/termos$/)
  expect(await page.evaluate(() => (window as unknown as { mesmaPagina?: boolean }).mesmaPagina)).toBe(true)
})

test('CA-1485 (spec landing-escura): a landing não tem foto no topo; o <head> não pré-carrega imagem nenhuma', async ({ page }) => {
  const antigas: string[] = []
  page.on('request', (pedido) => {
    if (/pratos-heroi|cobrir-(claro|escuro)|missoes-(claro|escuro)/.test(pedido.url())) antigas.push(pedido.url())
  })
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/#/inicio')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Falta cálcio\?/)
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0)
  await page.waitForLoadState('networkidle')
  expect(antigas).toEqual([])
  // As três fotos da página são preguiçosas.
  for (const foto of await page.locator('main img[srcset]').all()) await expect(foto).toHaveAttribute('loading', 'lazy')
})

test('CA-1018 e CA-1021: robots, sitemap e llms na raiz; o service worker guarda as páginas próprias', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://metanutri.com.br/sitemap.xml')
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<loc>https://metanutri.com.br/precos/</loc>')
  expect(await (await request.get('/llms.txt')).text()).toContain('# MetaNutri')
  const sw = await (await request.get('/sw.js')).text()
  for (const caminho of ['precos', 'termos', 'privacidade', 'fontes']) expect(sw).toContain(`"${caminho}/index.html"`)
  expect(sw).toContain('"preparar-pagina.js"')
})

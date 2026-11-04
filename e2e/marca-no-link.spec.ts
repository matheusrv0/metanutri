/* eslint-disable no-restricted-syntax -- os códigos de cor aqui são o dado dos critérios da SPEC (CA-1957, CA-1960),
   digitados e conferidos como a nutricionista os vê, não estilo: a regra de hexadecimal é para o código de tela. */
import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral } from './apoio/fumaca.ts'

/**
 * Spec marca-no-link: Conta e assinatura › Sua marca no navegador de verdade, no modo local (sem servidor). Aqui o
 * <canvas> desenha a logo de verdade (CA-1952, CA-1954, CA-1955), e a cor de cada celular da prévia é a pintada pelo
 * CSS (CA-1957, CA-1966). O link lido da nuvem, com a marca, está em e2e/servidor-falso/marca-no-link.spec.ts.
 */

test.use({ reducedMotion: 'reduce' })

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const abrirSuaMarca = async (pagina: Page) => {
  await abrirLimpo(pagina)
  await pagina.goto('/#/conta/marca')
  await expect(pagina.getByRole('heading', { level: 1, name: 'Sua marca' })).toBeVisible()
}

/** Um PNG desenhado no próprio navegador: `tipo` "logo" (formas de cor) ou "ruido" (pixels sorteados, que não comprimem). */
async function pngDesenhado(pagina: Page, largura: number, altura: number, tipo: 'logo' | 'ruido' = 'logo'): Promise<Buffer> {
  const base64 = await pagina.evaluate(
    ([l, a, t]) => {
      const tela = document.createElement('canvas')
      tela.width = l
      tela.height = a
      const pincel = tela.getContext('2d')
      if (!pincel) return ''
      if (t === 'ruido') {
        const imagem = pincel.createImageData(l, a)
        for (let i = 0; i < imagem.data.length; i++) imagem.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256)
        pincel.putImageData(imagem, 0, 0)
      } else {
        pincel.fillStyle = 'rgb(63, 95, 42)'
        pincel.fillRect(0, 0, l / 3, a)
        pincel.fillStyle = 'rgb(140, 198, 63)'
        pincel.beginPath()
        pincel.arc(l * 0.66, a / 2, Math.min(l, a) / 3, 0, Math.PI * 2)
        pincel.fill()
      }
      return tela.toDataURL('image/png').split(',')[1] ?? ''
    },
    [largura, altura, tipo] as const,
  )
  return Buffer.from(base64, 'base64')
}

/** CA-1953: um GIF de 1 × 1 de verdade (o da revisão de 03/11/2026, prova V2). */
const GIF_1X1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

/** CB-967: só o começo de um PNG, com a largura e a altura pedidas no IHDR. O resto do arquivo nunca é lido. */
function cabecalhoDePng(largura: number, altura: number): Buffer {
  const ihdr = Buffer.alloc(25)
  ihdr.writeUInt32BE(13, 0)
  ihdr.write('IHDR', 4, 'ascii')
  ihdr.writeUInt32BE(largura, 8)
  ihdr.writeUInt32BE(altura, 12)
  ihdr[16] = 8
  ihdr[17] = 6
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ihdr, Buffer.alloc(64)])
}

/** O link dentro de um celular da prévia. */
const linkNoCelular = (pagina: Page, tema: 'claro' | 'escuro') =>
  pagina.getByRole('figure', { name: tema === 'claro' ? /Celular claro/ : /Celular escuro/ }).locator('[data-link-do-paciente]')

const cores = (alvo: Locator) => alvo.evaluate((el) => ({ fundo: getComputedStyle(el).backgroundColor, texto: getComputedStyle(el).color }))

/** A aba escolhida ("Missões") dentro de um celular da prévia. */
const abaEscolhida = (pagina: Page, tema: 'claro' | 'escuro') => linkNoCelular(pagina, tema).locator('[role="tab"][data-state="active"]')

test('CA-1950: a Conta tem o cartão "Sua marca", que abre a tela; Configurações não tem mais o cartão "Logotipo"', async ({ page }) => {
  await abrirLimpo(page)
  await page.goto('/#/conta')
  const cartao = page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: 'Sua marca' }) })
  await expect(cartao).toContainText('Padrão do MetaNutri')
  await cartao.getByRole('button', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/#\/conta\/marca$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sua marca' })).toBeVisible()
  await expect(page.getByRole('figure', { name: /Celular claro/ })).toBeVisible()
  await expect(page.getByRole('figure', { name: /Celular escuro/ })).toBeVisible()

  await page.goto('/#/config')
  await expect(page.getByRole('heading', { level: 1, name: 'Configurações' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Logotipo' })).toHaveCount(0)
})

test('CA-1952 e CB-953: a logo grande vira um PNG de até 600 px e 150 KB, nos dois celulares; "Salvar" a guarda', async ({ page }) => {
  await abrirSuaMarca(page)
  await page.getByLabel('Enviar logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await pngDesenhado(page, 2400, 800) })
  const logo = page.getByRole('img', { name: 'Sua logo' })
  await expect(logo).toBeVisible()
  const guardada = await logo.evaluate((el) => {
    const img = el as HTMLImageElement
    return { src: img.src, largura: img.naturalWidth, altura: img.naturalHeight }
  })
  expect(guardada.src).toMatch(/^data:image\/png;base64,iVBORw0KGgo/)
  expect(guardada).toMatchObject({ largura: 600, altura: 200 })
  expect(guardada.src.length).toBeLessThanOrEqual(204822)
  for (const tema of ['claro', 'escuro'] as const) {
    await expect(linkNoCelular(page, tema).locator('img').first()).toHaveAttribute('src', guardada.src)
  }

  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', guardada.src)
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})

test('CA-1955: o SVG com <script> e onload vira PNG, nada executa e o SVG não é guardado; SVG só com viewBox também vale', async ({ page }) => {
  await abrirSuaMarca(page)
  const comScript =
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" onload="window.__svgRodou = 1"><script>window.__svgRodou = 2</script><rect width="300" height="100" fill="#1f4e8c"/></svg>'
  await page.getByLabel('Enviar logo').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(comScript) })
  const logo = page.getByRole('img', { name: 'Sua logo' })
  await expect(logo).toHaveAttribute('src', /^data:image\/png;base64,/)
  expect(await page.evaluate(() => (window as unknown as { __svgRodou?: number }).__svgRodou)).toBeUndefined()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  const guardado = await page.evaluate(() => Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '').join('\n'))
  expect(guardado).not.toMatch(/svg\+xml|<script|onload/)

  const soViewBox = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100" fill="#7a2944"/></svg>'
  await page.getByLabel('Trocar logo').setInputFiles({ name: 'caixa.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(soViewBox) })
  await expect(logo).toHaveAttribute('src', /^data:image\/png;base64,/)
  expect(await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(600)
  expect(await logo.evaluate((el) => (el as HTMLImageElement).naturalHeight)).toBe(150)
})

test('CA-1953 e CA-1954: GIF é recusado; a imagem que nem em 240 px cabe em 150 KB também; nada muda', async ({ page }) => {
  await abrirSuaMarca(page)
  await page.getByLabel('Enviar logo').setInputFiles({ name: 'logo.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
  await expect(page.getByRole('alert')).toHaveText('Use PNG, JPG, WebP ou SVG, até 2 MB.')
  await page.getByLabel('Enviar logo').setInputFiles({ name: 'ruido.png', mimeType: 'image/png', buffer: await pngDesenhado(page, 700, 700, 'ruido') })
  await expect(page.getByRole('alert')).toHaveText('Use uma logo mais simples.', { timeout: 15_000 })
  await expect(page.getByRole('img', { name: 'Sua logo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})

test('CA-1953: o GIF disfarçado (salvo como .png, ou como .jpg sem tipo) é recusado pelo conteúdo', async ({ page }) => {
  for (const arquivo of [
    { name: 'logo.png', mimeType: 'image/png' },
    { name: 'logo.jpg', mimeType: '' },
  ]) {
    await abrirSuaMarca(page)
    await page.getByLabel('Enviar logo').setInputFiles({ ...arquivo, buffer: GIF_1X1 })
    await expect(page.getByRole('alert'), arquivo.name).toHaveText('Use PNG, JPG, WebP ou SVG, até 2 MB.')
    await expect(page.getByRole('img', { name: 'Sua logo' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  }
})

test('CB-967: a imagem de mais de 8.000 px de lado é recusada pelo cabeçalho, antes de abrir', async ({ page }) => {
  await abrirSuaMarca(page)
  await page.getByLabel('Enviar logo').setInputFiles({ name: 'gigante.png', mimeType: 'image/png', buffer: cabecalhoDePng(8001, 40) })
  await expect(page.getByRole('alert')).toHaveText('Use uma logo mais simples.')
  await expect(page.getByRole('img', { name: 'Sua logo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})

test('CA-1957 e CA-1966: a cor pronta pinta a aba e a barra no celular claro; no escuro, a versão do escuro com texto carvão', async ({ page }) => {
  await abrirSuaMarca(page)
  await page.getByTitle('Vinho').click()
  // #7A2944 no claro, com texto branco; #DA90A9 (a mesma cor clareada até 7:1) no escuro, com texto #101A1D.
  expect(await cores(abaEscolhida(page, 'claro'))).toEqual({ fundo: 'rgb(122, 41, 68)', texto: 'rgb(255, 255, 255)' })
  expect(await cores(abaEscolhida(page, 'escuro'))).toEqual({ fundo: 'rgb(218, 144, 169)', texto: 'rgb(16, 26, 29)' })
  const barra = (tema: 'claro' | 'escuro') => linkNoCelular(page, tema).locator('[role="progressbar"] > div')
  expect((await cores(barra('claro'))).fundo).toBe('rgb(122, 41, 68)')
  expect((await cores(barra('escuro'))).fundo).toBe('rgb(218, 144, 169)')
  await expect(page.getByRole('figure', { name: /Celular escuro/ })).toContainText('#DA90A9')

  // DP-ML-9: com o app no escuro, o celular claro continua claro.
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  expect(await cores(abaEscolhida(page, 'claro'))).toEqual({ fundo: 'rgb(122, 41, 68)', texto: 'rgb(255, 255, 255)' })
  expect(await cores(abaEscolhida(page, 'escuro'))).toEqual({ fundo: 'rgb(218, 144, 169)', texto: 'rgb(16, 26, 29)' })
})

test('CA-1960: #8CC63F é recusada e "Usar #587F26" resolve; a padrão volta o link ao de hoje', async ({ page }) => {
  await abrirSuaMarca(page)
  const campo = page.getByRole('textbox', { name: 'Outra cor', exact: true })
  await campo.fill('#8CC63F')
  await expect(page.getByText('Contraste 2,05:1 com o texto branco. O mínimo é 4,5:1.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  await page.getByRole('button', { name: 'Usar #587F26' }).click()
  await expect(campo).toHaveValue('#587F26')
  await expect(page.getByText(/^Contraste 4,69:1$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled()

  await page.getByTitle('Padrão do MetaNutri').click()
  // Sem cor própria: a aba escolhida é a pílula branca de sempre.
  expect((await cores(abaEscolhida(page, 'claro'))).fundo).toBe('rgb(255, 255, 255)')
})

test('CA-1981 e D-800: em 360 e 390 px, a tela é uma coluna (o formulário e depois os celulares) e nada rola de lado', async ({ page }) => {
  for (const largura of [360, 390]) {
    await page.setViewportSize({ width: largura, height: 800 })
    await abrirSuaMarca(page)
    await semRolagemLateral(page)
    const salvar = await page.getByRole('button', { name: 'Salvar' }).boundingBox()
    const claro = await page.getByRole('figure', { name: /Celular claro/ }).boundingBox()
    const escuro = await page.getByRole('figure', { name: /Celular escuro/ }).boundingBox()
    expect(salvar && claro && escuro).toBeTruthy()
    if (!salvar || !claro || !escuro) return
    expect(claro.y).toBeGreaterThan(salvar.y)
    expect(escuro.y).toBeGreaterThanOrEqual(claro.y + claro.height)
    expect(claro.x + claro.width).toBeLessThanOrEqual(largura)
  }
})

test('DP-ML-15: o Tab não entra nos celulares da prévia', async ({ page }) => {
  await abrirSuaMarca(page)
  await page.getByRole('textbox', { name: 'Outra cor', exact: true }).focus()
  for (let vez = 0; vez < 4; vez++) {
    await page.keyboard.press('Tab')
    const dentroDaPrevia = await page.evaluate(() => document.activeElement?.closest('figure') !== null)
    expect(dentroDaPrevia).toBe(false)
  }
})

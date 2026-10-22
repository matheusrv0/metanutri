import { expect, test, type Page } from '@playwright/test'
import { diretivasDaPolitica, textoDaPolitica } from '../src/seguranca/csp.ts'
import { metaDaPolitica } from '../src/seguranca/pluginCsp.ts'

/**
 * A regra de conteúdo (CSP) no build de verdade, servido pelo `vite preview` (spec seguranca-lote-4, D-135).
 * Aqui o site não tem nuvem, pagamento nem verificação contra robôs (playwright.config.ts): os scripts de fora são
 * conferidos no `npm run test:csp`, que baixa os de verdade.
 */

/** Junta toda violação da regra: o evento da página (posto antes de qualquer script) e o aviso do próprio Chromium. */
async function vigiar(pagina: Page): Promise<string[]> {
  const violacoes: string[] = []
  pagina.on('console', (mensagem) => {
    if (/content.security.policy/i.test(mensagem.text())) violacoes.push(mensagem.text())
  })
  await pagina.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evento) => {
      console.error(`Violação da Content-Security-Policy: ${evento.effectiveDirective} bloqueou ${evento.blockedURI} em ${evento.sourceFile}:${evento.lineNumber}`)
    })
  })
  return violacoes
}

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

/** Um PNG de 1 x 1, para a logo do perfil (que o site guarda como `data:`). */
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64')

test('CA-485: o site servido tem a <meta> da regra, logo depois do charset, igual à do csp.ts', async ({ request }) => {
  const html = await (await request.get('/')).text()
  const meta = metaDaPolitica(textoDaPolitica(diretivasDaPolitica({ supabase: null })))
  expect(html).toContain(`<meta charset="UTF-8" />\n    ${meta}`)
  expect(html.indexOf(meta)).toBeLessThan(html.indexOf('<script'))
  // CA-1012 (spec site-publico-profissional, D-330): a única exceção é o bloco de dados estruturados, que o navegador
  // não executa.
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/)
  expect(html.match(/<script type="application\/ld\+json">/g)).toHaveLength(1)
})

test('CA-485: a regra bloqueia script escrito na página, atributo de evento, script de outro domínio e eval', async ({ page }) => {
  const violacoes = await vigiar(page)
  await page.goto('/#/inicio')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const resultado = await page.evaluate(async () => {
    const janela = window as unknown as Record<string, unknown>
    const inline = document.createElement('script')
    inline.textContent = 'window.__ataqueInline = true'
    document.head.append(inline)

    const imagem = document.createElement('img')
    const imagemFalhou = new Promise<void>((resolver) => imagem.addEventListener('error', () => resolver()))
    imagem.setAttribute('onerror', 'window.__ataqueEvento = true')
    imagem.src = 'data:image/png;base64,naoEimagem'
    document.body.append(imagem)
    await imagemFalhou

    const externo = document.createElement('script')
    const externoFalhou = new Promise<boolean>((resolver) => {
      externo.addEventListener('error', () => resolver(true))
      externo.addEventListener('load', () => resolver(false))
    })
    externo.src = 'https://example.com/ataque.js'
    document.head.append(externo)

    let avaliou = 'rodou'
    try {
      // O ataque que a regra tem de barrar: texto virando código.
      globalThis.eval('1 + 1')
    } catch {
      avaliou = 'bloqueado'
    }
    return { inline: janela['__ataqueInline'] === true, evento: janela['__ataqueEvento'] === true, externoFalhou: await externoFalhou, avaliou }
  })

  expect(resultado).toEqual({ inline: false, evento: false, externoFalhou: true, avaliou: 'bloqueado' })
  await expect.poll(() => violacoes.join('\n')).toMatch(/example\.com\/ataque\.js/)
  expect(violacoes.join('\n')).toMatch(/script-src-elem bloqueou inline/)
  expect(violacoes.join('\n')).toMatch(/script-src-attr bloqueou inline/)
  expect(violacoes.join('\n')).toMatch(/bloqueou eval/)
})

test('CA-486: páginas públicas, Entrar, confirmação por código e checkout abrem sem nenhuma violação', async ({ page }) => {
  const violacoes = await vigiar(page)
  for (const rota of ['inicio', 'precos', 'termos', 'privacidade', 'fontes', 'entrar', 'criar-conta', 'confirmar-email', 'esqueci-senha', 'assinar/solo/mensal']) {
    await page.goto(`/#/${rota}`)
    await expect(page.getByRole('heading').first(), rota).toBeVisible()
  }
  await page.waitForLoadState('networkidle')
  expect(violacoes).toEqual([])
})

test('CA-486: logo do perfil, impressão, Word e link do paciente sem nenhuma violação', async ({ page }) => {
  const violacoes = await vigiar(page)
  await abrirLimpo(page)

  // A logo do perfil é `data:` (img-src).
  await page.goto('/#/config')
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 })
  const logo = page.getByRole('img', { name: 'Seu logotipo' })
  await expect(logo).toBeVisible()
  expect(await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

  // Um plano com almoço.
  await page.goto('/#/painel')
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await page.getByLabel('Idade', { exact: true }).fill('30')
  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entradaAlmoco = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')

  // A impressão, com a logo na folha.
  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
  const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(janela.locator('img[src^="data:image/png"]')).toBeVisible()
  await page.pdf({ format: 'A4' })
  await page.emulateMedia({ media: 'screen' })
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()

  // O Word (download por `blob:`).
  await page.getByRole('button', { name: 'Exportar' }).click()
  const baixando = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Aconselhamento em Word' }).click()
  expect((await baixando).suggestedFilename()).toMatch(/\.docx$/)

  // O link do paciente.
  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const endereco = await cartao.getByLabel('Endereço do link').inputValue()
  await page.goto(endereco)
  await expect(page.getByRole('heading', { name: /Suas missões de hoje, Ana/ })).toBeVisible()
  await page.getByRole('button').first().click()

  await page.waitForLoadState('networkidle')
  expect(violacoes).toEqual([])
})

test('CA-486 e CA-603: o aplicativo instala (PWA), com o registro dentro do pacote: o navegador lê o manifest e o service worker liga, sem script escrito na página e sem nenhuma violação', async ({ page }) => {
  const violacoes = await vigiar(page)
  await page.goto('/')
  const estado = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state ?? null)
  expect(['activating', 'activated']).toContain(estado)
  // CA-603 (spec dados-na-nuvem): o registro vem do pacote (virtual:pwa-register); nenhum script escrito na página nem o
  // registerSW.js que o plugin injetava. CA-1012 (spec site-publico-profissional): o bloco de dados estruturados é a
  // única exceção, porque o navegador não o executa.
  expect(await page.locator('script:not([src]):not([type="application/ld+json"])').count()).toBe(0)
  expect(await page.locator('script[src*="registerSW"]').count()).toBe(0)

  const cdp = await page.context().newCDPSession(page)
  const manifesto = await cdp.send('Page.getAppManifest')
  expect(manifesto.errors).toEqual([])
  expect(manifesto.url).toMatch(/manifest\.webmanifest$/)
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])

  await page.waitForLoadState('networkidle')
  expect(violacoes).toEqual([])
})

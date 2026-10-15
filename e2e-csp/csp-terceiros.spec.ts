import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { diretivasDaPolitica, origemDoSupabase, textoDaPolitica } from '../src/seguranca/csp.ts'
import { metaDaPolitica } from '../src/seguranca/pluginCsp.ts'
import { AMBIENTE_DO_TESTE_CSP, DOMINIO_DE_PRODUCAO, ENDERECO_DA_BANCADA, ENDERECO_DO_SITE, PASTA_DA_BANCADA } from './ambiente.ts'

/**
 * CA-486 com os scripts de verdade (`npm run test:csp`): a verificação contra robôs do Cloudflare nas telas de conta
 * do site, e os campos do cartão do Mercado Pago na bancada, sob a mesma regra do site publicado. Precisa de internet.
 */

const META = metaDaPolitica(textoDaPolitica(diretivasDaPolitica({ supabase: origemDoSupabase(AMBIENTE_DO_TESTE_CSP.VITE_SUPABASE_URL) })))

/**
 * Junta as violações da NOSSA regra: o evento da página principal e o aviso do Chromium vindo dela. Os iframes do
 * Mercado Pago e do Cloudflare seguem a regra deles, não a nossa, e ficam de fora.
 */
async function vigiar(pagina: Page, origem: string): Promise<string[]> {
  const violacoes: string[] = []
  pagina.on('console', (mensagem) => {
    const daPagina = mensagem.location().url === '' || mensagem.location().url.startsWith(origem)
    if (daPagina && /content.security.policy/i.test(mensagem.text())) violacoes.push(mensagem.text())
  })
  await pagina.addInitScript(() => {
    if (window !== window.top) return
    document.addEventListener('securitypolicyviolation', (evento) => {
      console.error(`Violação da Content-Security-Policy: ${evento.effectiveDirective} bloqueou ${evento.blockedURI} em ${evento.sourceFile}:${evento.lineNumber}`)
    })
  })
  return violacoes
}

/** O Turnstile segue conversando com o Cloudflare, então a rede nunca fica parada: espera um pouco pelas violações tardias. */
const assentar = (pagina: Page): Promise<void> => pagina.waitForTimeout(3_000)

const respostaDaVerificacao = (pagina: Page): Promise<string> =>
  pagina.evaluate(() => (globalThis as unknown as { readonly turnstile?: { getResponse(): string | undefined } }).turnstile?.getResponse() ?? '')

test('CA-485: o site e a bancada saem com a mesma <meta>, a do site publicado', async ({ request }) => {
  for (const endereco of [ENDERECO_DO_SITE, ENDERECO_DA_BANCADA]) {
    const html = await (await request.get(`${endereco}/`)).text()
    expect(html, endereco).toContain(`<meta charset="UTF-8" />\n    ${META}`)
  }
  expect(META).toContain('https://qmpljfjbdcrdbqutuvmg.supabase.co')
})

test('CA-486: Entrar, Criar conta, confirmação por código e Esqueci a senha com a verificação de verdade, sem nenhuma violação', async ({ page }) => {
  const violacoes = await vigiar(page, ENDERECO_DO_SITE)
  for (const rota of ['entrar', 'criar-conta', 'confirmar-email', 'esqueci-senha']) {
    await page.goto(`${ENDERECO_DO_SITE}/#/${rota}`)
    await expect(page.getByRole('heading').first(), rota).toBeVisible()
    await expect.poll(() => page.frames().some((quadro) => quadro.url().startsWith('https://challenges.cloudflare.com/')), { message: `${rota}: iframe da verificação`, timeout: 30_000 }).toBe(true)
    await expect.poll(() => respostaDaVerificacao(page), { message: `${rota}: token da verificação`, timeout: 30_000 }).not.toBe('')
  }
  await assentar(page)
  expect(violacoes).toEqual([])
})

test('CA-486: checkout com os campos do cartão de verdade no domínio de produção, a busca da bandeira, o código do cartão e o antifraude, sem nenhuma violação', async ({ page, context }) => {
  // DP-CSP-7: a bancada abre como o site no ar, porque o antifraude usa outro host no domínio de produção (.com.br).
  await context.route(`${DOMINIO_DE_PRODUCAO}/**`, async (rota) => {
    const caminho = decodeURIComponent(new URL(rota.request().url()).pathname)
    await rota.fulfill({ path: join(PASTA_DA_BANCADA, caminho === '/' ? 'index.html' : caminho.slice(1)) })
  })
  const violacoes = await vigiar(page, DOMINIO_DE_PRODUCAO)
  const antifraude: string[] = []
  page.on('request', (pedido) => {
    if (pedido.frame() === page.mainFrame() && /^https:\/\/www\.(mercadolibre\.com|mercadolivre\.com|mercadopago\.com\.br)\//.test(pedido.url())) antifraude.push(pedido.url())
  })

  await page.goto(`${DOMINIO_DE_PRODUCAO}/`)
  const corpo = page.locator('body')
  await expect(corpo).toHaveAttribute('data-campos', 'prontos', { timeout: 60_000 })
  expect(page.frames().filter((quadro) => quadro.url().startsWith('https://secure-fields.mercadopago.com/'))).toHaveLength(3)

  // A busca da bandeira pelos primeiros números sai da página principal (connect-src). Com a chave de teste, a operadora
  // responde 200 com a lista vazia para este cartão de teste, e o site segue com "Cartão": aqui vale a resposta chegar.
  const buscaDaBandeira = page.waitForResponse((resposta) => resposta.url().startsWith('https://api.mercadopago.com/v1/payment_methods/search') && resposta.url().includes('bins=503143'), { timeout: 30_000 })
  await page.frameLocator('#cartao-numero iframe').locator('input:visible').first().fill('5031433215406351')
  await page.frameLocator('#cartao-validade iframe').locator('input:visible').first().fill('11/30')
  await page.frameLocator('#cartao-codigo iframe').locator('input:visible').first().fill('123')
  expect((await buscaDaBandeira).status()).toBe(200)
  await expect(corpo).toHaveAttribute('data-bandeira')
  await page.getByRole('button', { name: 'Gerar o código do cartão' }).click()
  await expect(corpo).toHaveAttribute('data-token', 'final 6351', { timeout: 30_000 })

  // DP-CSP-3: o script do antifraude, escrito na página pelo SDK com o nonce, rodou e falou com os hosts dele.
  await expect.poll(() => antifraude.length, { timeout: 30_000 }).toBeGreaterThan(0)

  await expect(corpo).toHaveAttribute('data-verificacao', 'token', { timeout: 30_000 })
  expect(page.frames().some((quadro) => quadro.url().startsWith('https://challenges.cloudflare.com/'))).toBe(true)

  await assentar(page)
  expect(violacoes).toEqual([])
})

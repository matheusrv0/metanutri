// Spec separacao-site-app: o site (aqui em localhost:4178) e os caminhos dele para o app (localhost:4176, com o servidor
// de conta falso), num navegador sem dado que só exista no site. A mudança com dado só aqui está em mudanca.spec.ts.
import { expect, test, type Page } from '@playwright/test'
import { diretivasDoSite, textoDaPolitica } from '../../src/seguranca/csp.ts'
import { metaDaPolitica } from '../../src/seguranca/pluginCsp.ts'
import { ligarServidorFalso, linkFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO } from '../apoio/servidorFalso.ts'

const APP = 'http://localhost:4176/'
const LANDING = 'Planos alimentares completos em vitaminas e minerais'

/** O app de teste fala com o servidor falso: nada sai da máquina quando o site leva a ele. */
const comApp = (pagina: Page) => ligarServidorFalso(pagina, { link: linkFalso() })

test('CA-1400: num navegador sem nada guardado, a raiz do site abre a landing, no próprio endereço', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(LANDING)
  await expect(page).toHaveURL(/:4178\/$/)
})

test('CA-1401: com a sessão do app antigo guardada, abre a landing (nunca o Painel) e a sessão é apagada', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('teste:posto')) return
    sessionStorage.setItem('teste:posto', '1')
    localStorage.setItem('sb-qmpljfjbdcrdbqutuvmg-auth-token', '{"access_token":"x"}')
    localStorage.setItem('sb-qmpljfjbdcrdbqutuvmg-auth-token-code-verifier', 'y')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(LANDING)
  await expect(page.getByText('Ir para o painel')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((chave) => chave.startsWith('sb-')))).toEqual([])
})

test('CA-1402: "Entrar" leva à raiz do app e "Criar conta grátis", a Criar conta; o site não tem "Ir para o painel"', async ({ page }) => {
  await comApp(page)
  await page.goto('/')
  const barra = page.getByRole('banner')
  await expect(barra.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', APP)
  await expect(barra.getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', `${APP}#/criar-conta`)
  await expect(page.getByText('Ir para o painel')).toHaveCount(0)
  await barra.getByRole('link', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(APP)
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()

  await page.goto('/termos/')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Começar grátis' }).click()
  await expect(page).toHaveURL(`${APP}#/criar-conta`)
  await expect(page.getByText('No Free, você já tem')).toBeVisible()
})

test('CA-1403: em Preços, Solo anual, Estudante e Free levam a Criar conta no app, com o plano e o ciclo', async ({ page }) => {
  await comApp(page)
  await page.goto('/precos/')
  await page.getByRole('radio', { name: /Anual/ }).click()
  await page.getByRole('button', { name: 'Assinar Solo' }).first().click()
  await expect(page).toHaveURL(`${APP}#/criar-conta/solo/anual`)
  await expect(page.getByRole('img', { name: 'Passo 1 de 3' })).toBeVisible()

  await page.goto('/precos/')
  await page.getByRole('button', { name: 'Criar conta de estudante' }).first().click()
  await expect(page).toHaveURL(`${APP}#/criar-conta/estudante`)
  await expect(page.getByRole('radio', { name: /Estudante de nutrição/ })).toBeChecked()

  // Na landing, o Free dos planos.
  await page.goto('/')
  await page.getByRole('region', { name: 'Planos e preços' }).getByRole('button', { name: 'Começar grátis' }).click()
  await expect(page).toHaveURL(`${APP}#/criar-conta`)
})

test('CA-1405: as rotas antigas de página abrem a página própria, com o plano de #/precos/<plano> em destaque', async ({ page }) => {
  for (const [rota, caminho, titulo] of [
    ['#/inicio', '/', LANDING],
    ['#/precos', '/precos/', 'Planos e preços'],
    ['#/termos', '/termos/', 'Termos de uso'],
    ['#/privacidade', '/privacidade/', 'Política de privacidade'],
    ['#/fontes', '/fontes/', 'Referências'],
  ] as const) {
    // Quem abre o link antigo chega de fora: a página carrega (sair do site antes; trocar só o # não carrega).
    await page.goto('about:blank')
    await page.goto(`/${rota}`)
    await expect(page.getByRole('heading', { level: 1 }), rota).toHaveText(titulo)
    await expect(page, rota).toHaveURL(new RegExp(`:4178${caminho.replace(/\//g, '\\/')}$`))
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('about:blank')
  await page.goto('/#/precos/pro')
  await expect(page).toHaveURL(/:4178\/precos\/\?destaque=pro$/)
  const doPro = page.getByRole('columnheader').filter({ hasText: 'Pro' })
  await expect(doPro).toContainText('Recomendado')
})

test('CA-1406: o pacote servido não tem o Supabase, o SDK do pagamento nem o Turnstile, e a CSP só deixa o próprio site', async ({ page, request }) => {
  const pacotes: string[] = []
  page.on('response', async (resposta) => {
    if (/\.js$/.test(new URL(resposta.url()).pathname) && resposta.url().startsWith('http://localhost:4178/')) pacotes.push(await resposta.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(LANDING)
  await page.waitForLoadState('networkidle')
  expect(pacotes.length).toBeGreaterThan(0)
  for (const texto of pacotes) {
    // O build do site recebeu as chaves do app no ambiente, de propósito (playwright.config.ts): nenhuma vai junto.
    expect(texto).not.toMatch(/supabase\.co|chave-falsa-do-teste|sdk\.mercadopago\.com|challenges\.cloudflare\.com|1x00000000000000000000AA|APP_USR-/)
  }
  const html = await (await request.get('/')).text()
  expect(html).toContain(metaDaPolitica(textoDaPolitica(diretivasDoSite())))
  expect(html).not.toMatch(/supabase|mercadopago|cloudflare|openfoodfacts/i)
})

test('CA-1407: o site não registra service worker nem tem manifesto; o sw.js publicado é o que se desliga', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(LANDING)
  await page.waitForLoadState('networkidle')
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0)
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0)
  const trabalhador = await (await request.get('/sw.js')).text()
  expect(trabalhador).toContain('self.registration.unregister()')
  expect(trabalhador).not.toMatch(/precache/)
})

test('CA-1423 e CB-511: o link de paciente antigo vai ao app antes de desenhar o site, e abre a tela do paciente', async ({ page }) => {
  await comApp(page)
  // Quem leva é o script do <head>, antes de desenhar (o "antes" está em src/seo/prepararPagina.test.tsx).
  await page.goto('/#/missoes/token-do-teste')
  await expect(page).toHaveURL(`${APP}#/missoes/token-do-teste`)
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Ana' })).toBeVisible()
})

test('CA-1424: tela do app no site vai ao app com o mesmo #, sem mostrar a landing', async ({ page }) => {
  await comApp(page)
  await page.goto('/#/caso/c1/plano')
  await expect(page).toHaveURL(`${APP}#/caso/c1/plano`)
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
})

test('CA-1425 e CB-513: a volta antiga do pagamento vai ao app com a mesma consulta, e o app abre a tela dela', async ({ page }) => {
  await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/?volta=pagamento')
  // O app lê a volta e troca o endereço pela tela certa.
  await expect(page).toHaveURL(/^http:\/\/localhost:4176\/#\/pagamento$/)
})

test('CA-1426 e D-524: aberto pelo ícone instalado do endereço antigo, vai ao app, que avisa uma vez do endereço novo', async ({ page }) => {
  await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  // Os avisos de primeiro acesso da conta já vistos no app, para o do ícone ficar sozinho na tela.
  await page.addInitScript((conta) => {
    if (location.port !== '4176') return
    localStorage.setItem(`metanutri:conta:${conta}:aviso-inicial-visto`, '1')
    localStorage.setItem(`metanutri:conta:${conta}:aviso-nuvem-visto`, '1')
  }, USUARIO_FALSO.id)
  // O ícone instalado abre o site como aplicativo (display-mode: standalone); o Playwright não tem como instalar.
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (consulta: string) => (consulta.includes('display-mode: standalone') ? ({ ...original(consulta), matches: true } as MediaQueryList) : original(consulta))
  })
  await page.goto('/')
  await expect(page).toHaveURL(/^http:\/\/localhost:4176\//)
  const aviso = page.getByRole('dialog').filter({ hasText: 'Novo endereço: app.metanutri.com.br.' })
  await expect(aviso).toBeVisible()
  await expect(aviso).toContainText('Instale o MetaNutri de novo para o ícone abrir direto aqui.')
  await expect(page).not.toHaveURL(/icone-antigo/)
  await aviso.getByRole('button', { name: 'Entendi' }).click()
  await expect(aviso).toBeHidden()
})

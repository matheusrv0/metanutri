// Spec separacao-site-app: o app no endereço dele (aqui, localhost:4176, com o servidor de conta falso), separado do
// site (localhost:4178). O site e os caminhos dele para o app estão em e2e/site/.
import { expect, test, type Page } from '@playwright/test'
import { ligarServidorFalso, linkFalso, PERFIL_NUTRICIONISTA } from '../apoio/servidorFalso.ts'

const SITE = 'http://localhost:4178/'

/** Espera a tela do título, fechando no caminho os avisos de primeiro acesso, um de cada vez. */
async function chegarEm(pagina: Page, titulo: string): Promise<void> {
  const tela = pagina.getByRole('heading', { level: 1, name: titulo })
  // Só os abertos: o que acabou de fechar fica no DOM durante a animação de saída.
  const aviso = pagina.locator('[role="dialog"][data-state="open"]')
  for (let vez = 0; vez < 4; vez += 1) {
    await expect(tela.or(aviso).first()).toBeVisible()
    if (!(await aviso.first().isVisible())) break
    await aviso.first().getByRole('button', { name: 'Entendi' }).click()
  }
  await expect(tela).toBeVisible()
}

/** Entra pelo formulário de Entrar. */
async function entrar(pagina: Page): Promise<void> {
  await pagina.getByLabel('E-mail').fill('maria@exemplo.com')
  await pagina.getByLabel('Senha', { exact: true }).fill('senhaforte1')
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test('CA-1409: a raiz sem sessão abre Entrar, com "Conheça o MetaNutri" levando ao site', async ({ page }) => {
  await ligarServidorFalso(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  await expect(page.getByText('Planos alimentares completos')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Conheça o MetaNutri' })).toHaveAttribute('href', SITE)
})

test('CA-1410: a raiz com sessão abre o Painel', async ({ page }) => {
  await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/')
  await chegarEm(page, 'Painel')
})

test('CA-1411: uma tela de trabalho sem sessão pede Entrar e abre sozinha depois da entrada', async ({ page }) => {
  await ligarServidorFalso(page, { entrar: 'ok', perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/#/pacientes')
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  await entrar(page)
  await chegarEm(page, 'Pacientes')
  await expect(page).toHaveURL(/#\/pacientes$/)
})

test('CA-1412: as rotas de página no app abrem a página do site, com o plano em destaque', async ({ page }) => {
  await ligarServidorFalso(page)
  await page.goto('/#/precos/pro')
  await expect(page).toHaveURL(`${SITE}precos/?destaque=pro`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
  await page.goto('/#/termos')
  await expect(page).toHaveURL(`${SITE}termos/`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Termos de uso')
})

test('CA-1413: com sessão, Criar conta do Solo anual vai direto ao checkout dele', async ({ page }) => {
  await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/#/criar-conta/solo/anual')
  await expect(page).toHaveURL(/#\/assinar\/solo\/anual$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeVisible()
})

test('CA-1414: no cadastro, os Termos e a Política são do site e abrem em aba nova', async ({ page }) => {
  await ligarServidorFalso(page)
  await page.goto('/#/criar-conta')
  for (const [nome, caminho] of [
    ['Termos de uso', 'termos/'],
    ['Política de privacidade', 'privacidade/'],
  ] as const) {
    const link = page.getByRole('link', { name: nome })
    await expect(link).toHaveAttribute('href', `${SITE}${caminho}`)
    await expect(link).toHaveAttribute('target', '_blank')
  }
})

test('CA-1415: "Sair" leva a Entrar do app, e não à landing', async ({ page }) => {
  await ligarServidorFalso(page, { entrar: 'ok', perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/#/entrar')
  await entrar(page)
  await chegarEm(page, 'Painel')
  await page.evaluate(() => {
    window.location.hash = '#/conta'
  })
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  await expect(page).toHaveURL(/:4176\/#\/entrar$/)
})

test('CA-1416: o link do paciente abre no app, sem conta (CB-126)', async ({ page }) => {
  await ligarServidorFalso(page, { link: linkFalso() })
  await page.goto('/#/missoes/token-do-teste')
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Ana' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toHaveCount(0)
})

test('CA-1418: o app fica fora dos buscadores, com título "MetaNutri" e prévia só com o ícone; sem robots, sitemap nem llms', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('<meta name="robots" content="noindex" />')
  expect(html).toMatch(/<title>MetaNutri<\/title>/)
  expect(html).toContain('<meta property="og:image" content="http://localhost:4176/icon-512.png" />')
  expect(html).not.toMatch(/name="description"|og:description|canonical|ld\+json|diz o que comer/)
  for (const arquivo of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    const corpo = await (await request.get(`/${arquivo}`)).text()
    expect(corpo, arquivo).not.toMatch(/User-agent|<urlset|# MetaNutri/)
  }
})

test('CA-1421: o app é instalável no endereço novo, com o manifesto preso à raiz', async ({ request }) => {
  const manifesto = (await (await request.get('/manifest.webmanifest')).json()) as Record<string, unknown>
  expect(manifesto).toMatchObject({ id: '/', start_url: './', scope: './', display: 'standalone', short_name: 'MetaNutri' })
  const trabalhador = await (await request.get('/sw.js')).text()
  expect(trabalhador).toContain('precache')
})

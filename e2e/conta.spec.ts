import { expect, test } from '@playwright/test'

// Spec separacao-site-app: os caminhos da landing e de Preços até o cadastro (CA-259, CA-122, CA-265) começam no site e
// estão em e2e/site/repasses.spec.ts (CA-1402 e CA-1403).
test.describe('Caminhos da conta sem servidor (spec conta-e-verificacao)', () => {
  test('CA-260: sem servidor, o cadastro explica e abre o sistema', async ({ page }) => {
    await page.goto('/#/criar-conta')
    await page.getByRole('button', { name: 'Abrir o sistema' }).click()
    // Num navegador novo, o aviso de primeiro acesso (CA-51) abre por cima do Painel.
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  })

  test('CA-406 e CB-100: a tela do código pede só números, com teclado numérico, e o código colado conta só os dígitos', async ({ page }) => {
    await page.goto('/#/confirmar-email')
    await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
    const campo = page.getByLabel('Código de 8 dígitos')
    await expect(campo).toHaveAttribute('inputmode', 'numeric')
    await campo.fill('1234-5678')
    await expect(campo).toHaveValue('12345678')
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Já confirmei, quero entrar' })).toHaveCount(0)
  })

  test.describe('até confirmar, a pessoa fica na tela do código (D-93)', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem('metanutri:email-pendente')) localStorage.setItem('metanutri:email-pendente', JSON.stringify({ email: 'maria@exemplo.com', em: Date.now() }))
      })
    })

    test('CA-415 e CA-417: ao abrir o app, cai na tela do código, sem logo-link e com "Errei o e-mail"', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
      await expect(page.getByText(/maria@exemplo\.com/)).toBeVisible()
      await expect(page.getByRole('button', { name: 'MetaNutri, início' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Errei o e-mail' })).toBeVisible()
    })

    test('CA-416 e CA-1412: Entrar volta para a tela do código; Termos continua abrindo, agora no site', async ({ page }) => {
      await page.goto('/#/entrar')
      await expect(page.getByRole('heading', { level: 1, name: 'Confira seu e-mail' })).toBeVisible()
      await page.goto('/#/termos')
      await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible()
    })

    test('CA-418: "Errei o e-mail" leva ao cadastro vazio e o site volta ao normal', async ({ page }) => {
      await page.goto('/#/confirmar-email')
      await page.getByRole('button', { name: 'Errei o e-mail' }).click()
      await expect(page).toHaveURL(/#\/criar-conta$/)
      await expect(page.getByLabel('E-mail')).toHaveValue('')
      await expect(page.getByLabel('Nome completo')).toHaveValue('')
    })
  })

  test('CA-412: a troca de senha pede o e-mail, o código e a senha nova duas vezes', async ({ page }) => {
    await page.goto('/#/esqueci-senha/codigo')
    await expect(page.getByRole('heading', { level: 1, name: 'Crie uma senha nova' })).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByLabel('Código de 8 dígitos')).toBeVisible()
    await expect(page.getByLabel('Senha nova')).toBeVisible()
    await expect(page.getByLabel('Repita a senha')).toBeVisible()
  })

  test('CA-463: sem a chave pública, as telas de conta não pedem o script da verificação', async ({ page }) => {
    const doCloudflare: string[] = []
    page.on('request', (pedido) => {
      if (pedido.url().includes('challenges.cloudflare.com')) doCloudflare.push(pedido.url())
    })
    for (const [rota, titulo] of [
      ['/#/entrar', 'Entrar'],
      ['/#/criar-conta', 'Crie sua conta'],
      ['/#/esqueci-senha', 'Esqueci a senha'],
      ['/#/esqueci-senha/codigo', 'Crie uma senha nova'],
      ['/#/confirmar-email', 'Confira seu e-mail'],
    ] as const) {
      await page.goto(rota)
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    }
    expect(doCloudflare).toEqual([])
  })

  // Termos e Privacidade são páginas do site (spec separacao-site-app): a fumaça delas está em e2e/site/telas-publicas.spec.ts.
  for (const rota of ['/#/criar-conta', '/#/criar-conta/estudante', '/#/criar-conta/solo', '/#/entrar', '/#/confirmar-email', '/#/esqueci-senha/codigo']) {
    test(`CB-48: ${rota} cabe em 360 px sem rolagem para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(rota)
      const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
      expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    })
  }
})

// Os critérios da revisão geral das telas públicas que só se conferem no navegador (spec revisao-geral-publica).
import { expect, test, type Locator } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { assinaturaFalsa, DIETA_GUARDADA, ligarServidorFalso, linkFalso, PERFIL_ESTUDANTE, PERFIL_NUTRICIONISTA, type Linha } from '../apoio/servidorFalso.ts'

const EMAIL_LONGO = 'maria.aparecida.dos.santos.oliveira.nutricao2026@aluno.universidadefederal.edu.br'

async function caixa(alvo: Locator) {
  const c = await alvo.boundingBox()
  if (!c) throw new Error('sem caixa')
  return c
}

/** Contraste WCAG entre a cor do texto e a do fundo opaco do aviso, lidas no navegador. */
async function contrasteDoAviso(aviso: Locator): Promise<number> {
  return aviso.evaluate((el) => {
    const tela = document.createElement('canvas')
    tela.width = 1
    tela.height = 1
    const ctx = tela.getContext('2d', { willReadFrequently: true })
    const rgb = (cor: string) => {
      if (!ctx) return [0, 0, 0]
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = cor
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
    }
    const lum = (c: number[]) =>
      c
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((soma, v, i) => soma + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0)
    const estilo = getComputedStyle(el)
    const a = lum(rgb(estilo.color))
    const b = lum(rgb(estilo.backgroundColor))
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
}

test.describe('Rodapé e topo públicos (D-235)', () => {
  for (const largura of [360, 390, 768, 1024, 1280]) {
    test(`CA-740: em ${largura} px, as fontes dos dados não têm "·" solto e o link vai abaixo do nome da base`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await ligarServidorFalso(page)
      await page.goto('/#/inicio')
      const fontes = page.getByRole('contentinfo').locator('section', { has: page.getByRole('heading', { name: 'Fontes dos dados' }) })
      expect(await fontes.innerText()).not.toContain('·')
      const nome = await caixa(fontes.getByText('Base MetaNutri', { exact: true }))
      const link = await caixa(fontes.getByRole('button', { name: 'Fontes da base' }))
      expect(link.y).toBeGreaterThanOrEqual(nome.y + nome.height - 1)
      await semRolagemLateral(page)
    })
  }

  test('CA-741: em 390 px, a logo e os links do rodapé têm 44 px, e o link que quebra fica à esquerda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/inicio')
    expect((await caixa(page.getByRole('banner').getByRole('button', { name: 'MetaNutri, início' }))).height).toBeGreaterThanOrEqual(44)
    const links = page.getByRole('contentinfo').getByRole('button')
    expect(await links.count()).toBe(6)
    for (const link of await links.all()) {
      expect((await caixa(link)).height, await link.innerText()).toBeGreaterThanOrEqual(44)
      expect(await link.evaluate((el) => getComputedStyle(el).textAlign)).toBe('left')
    }
  })
})

test('D-235 (A-23): em 700 px, Entrar e Começar grátis ficam na linha da logo, e o menu na de baixo', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 800 })
  await ligarServidorFalso(page)
  await page.goto('/#/inicio')
  const topo = page.getByRole('banner')
  const logo = await caixa(topo.getByRole('button', { name: 'MetaNutri, início' }))
  const comecar = await caixa(topo.getByRole('button', { name: 'Começar grátis' }))
  const menu = await caixa(topo.getByRole('navigation', { name: 'Seções' }))
  expect(Math.abs(comecar.y + comecar.height / 2 - (logo.y + logo.height / 2))).toBeLessThan(4)
  expect(menu.y).toBeGreaterThan(logo.y + logo.height - 1)
})

test.describe('Preços (D-234)', () => {
  test('D-234 (A-24): em 768 px, os cartões da mesma linha têm a mesma altura', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/precos')
    const free = await caixa(page.getByRole('region', { name: 'Plano Free' }))
    const solo = await caixa(page.getByRole('region', { name: 'Plano Solo' }))
    expect(Math.abs(free.y - solo.y)).toBeLessThan(1)
    expect(Math.abs(free.height - solo.height)).toBeLessThan(1)
  })

  for (const largura of [360, 390, 640, 768, 1023]) {
    test(`CA-742: em ${largura} px, os planos em cartões e sem rolar para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await ligarServidorFalso(page)
      await page.goto('/#/precos')
      await expect(page.getByRole('region', { name: 'Plano Clínica' })).toBeVisible()
      await expect(page.getByRole('table')).toBeHidden()
      await semRolagemLateral(page)
    })
  }

  for (const largura of [1024, 1280]) {
    test(`CA-742: em ${largura} px, a tabela comparativa inteira, sem rolar para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: 800 })
      await ligarServidorFalso(page)
      await page.goto('/#/precos')
      await expect(page.getByRole('table')).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Clínica/ })).toBeInViewport()
      await semRolagemLateral(page)
    })
  }

  test('CA-743: um h1 só e, em 390 px, Mensal e Anual com 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await ligarServidorFalso(page)
    await page.goto('/#/precos')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Grátis na faculdade, barato ao se formar')
    for (const opcao of await page.getByRole('radiogroup', { name: 'Período de cobrança' }).getByRole('radio').all()) {
      expect((await caixa(opcao)).height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('Telas de conta com e-mail longo (D-237)', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test('CA-744: a tela do código quebra o e-mail dentro do cartão, e o campo e os botões cabem inteiros', async ({ page }) => {
    await page.addInitScript((email) => {
      if (!localStorage.getItem('metanutri:email-pendente')) localStorage.setItem('metanutri:email-pendente', JSON.stringify({ email, em: Date.now() }))
    }, EMAIL_LONGO)
    await ligarServidorFalso(page)
    await page.goto('/#/confirmar-email')
    await expect(page.getByText(EMAIL_LONGO, { exact: false })).toBeVisible()
    await semRolagemLateral(page)
    const cartao = await caixa(page.getByRole('main'))
    for (const alvo of [page.getByLabel('Código de 8 dígitos'), page.getByRole('button', { name: 'Confirmar' }), page.getByRole('button', { name: 'Reenviar o código' })]) {
      const c = await caixa(alvo)
      expect(c.x + c.width).toBeLessThanOrEqual(cartao.x + cartao.width + 0.5)
    }
  })

  test('CA-745: Comprovar matrícula e Completar cadastro quebram o e-mail longo', async ({ page }) => {
    await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_ESTUDANTE, emailDaSessao: EMAIL_LONGO })
    await page.goto('/#/comprovar-matricula')
    const aviso = page.getByRole('status').filter({ hasText: 'E-mail da faculdade confirmado' })
    await expect(aviso).toBeVisible()
    const c = await caixa(aviso)
    expect(c.x + c.width).toBeLessThanOrEqual(360)
    await semRolagemLateral(page)
  })

  test('CA-745: Completar cadastro quebra o e-mail longo do subtítulo', async ({ page }) => {
    await ligarServidorFalso(page, { sessao: true, perfil: null, emailDaSessao: EMAIL_LONGO })
    await page.goto('/#/painel')
    await expect(page.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeVisible()
    await semRolagemLateral(page)
    const c = await caixa(page.getByRole('button', { name: 'Continuar' }))
    expect(c.x + c.width).toBeLessThanOrEqual(360)
  })
})

test('CA-759: em 390 px, as caixas de aceite e de declaração do cadastro têm 44 px de toque', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await ligarServidorFalso(page)
  await page.goto('/#/criar-conta')
  await page.getByRole('radio', { name: /Nutricionista/ }).check()
  const caixas = page.getByRole('checkbox')
  expect(await caixas.count()).toBe(2)
  for (const caixa of await caixas.all()) {
    const rotulo = caixa.locator('xpath=ancestor::label[1]')
    expect((await rotulo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await semRolagemLateral(page)
})

test.describe('Avisos do checkout (D-236)', () => {
  for (const tema of ['dark', 'light'] as const) {
    test(`${tema === 'dark' ? 'CA-746' : 'CA-747'}: no tema ${tema === 'dark' ? 'escuro' : 'claro'}, o aviso do resumo tem contraste de 4,5:1 ou mais`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema })
      await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA, assinatura: assinaturaFalsa('ativa') })
      await page.goto('/#/assinar/solo/mensal')
      const aviso = page.getByRole('region', { name: 'Resumo' }).getByRole('status')
      await expect(aviso).toContainText('Você já assina o plano Solo')
      expect(await contrasteDoAviso(aviso)).toBeGreaterThanOrEqual(4.5)
    })
  }
})

test.describe('Link do paciente', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('CA-748 e CA-749: "Meu plano" com o nome e a quantidade da folha impressa, a partir da cópia de hoje', async ({ page }) => {
    await ligarServidorFalso(page, { link: linkFalso({ dieta: DIETA_GUARDADA }) })
    await page.goto('/#/missoes/token-do-teste')
    await page.getByRole('tab', { name: 'Meu plano' }).click()
    const linha = (refeicao: string, nome: string) => page.getByRole('region', { name: refeicao }).getByRole('listitem').filter({ hasText: nome })
    await expect(linha('06:00 Desjejum', 'Pão francês')).toHaveText('1 unidade e meiaPão francês')
    await expect(linha('06:00 Desjejum', 'Margarina com sal')).toHaveText('1 ponta de facaMargarina com sal')
    await expect(linha('06:00 Desjejum', 'Queijo minas frescal')).toHaveText('30 gQueijo minas frescal')
    await expect(linha('09:00 Lanche da manhã', 'Banana prata')).toHaveText('130 gBanana prata')
    await expect(linha('12:00 Almoço', 'Macarrão (peso cru)')).toHaveText('90 gMacarrão (peso cru)')
    await expect(linha('12:00 Almoço', 'Filé de merluza assado')).toHaveText('meia unidade · 100 gFilé de merluza assado')
    await expect(linha('19:00 Jantar', 'Ovo cozido')).toHaveText('2 unidadesOvo cozido')
    await expect(linha('21:00 Ceia', 'Maçã Fuji com casca')).toHaveText('3 fatias e meia · 130 gMaçã Fuji com casca')
    await expect(page.getByText(/Pão, trigo|lipídeos|cozido\/10minutos/)).toHaveCount(0)
    await semRolagemLateral(page)
  })

  test('CA-753: sem internet, "Não consegui abrir suas missões"; com a internet de volta, "Tentar de novo" abre', async ({ page }) => {
    const erros = await vigiarConsole(page)
    const cenario: { link: Linha | 'sem-rede' } = { link: 'sem-rede' }
    await ligarServidorFalso(page, cenario)
    await page.goto('/#/missoes/token-do-teste')
    await expect(page.getByRole('heading', { level: 1, name: 'Não consegui abrir suas missões' })).toBeVisible()
    await expect(page.getByText('Este link não existe mais')).toHaveCount(0)
    cenario.link = linkFalso()
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Ana' })).toBeVisible()
    // Só o pedido que caiu aparece no console, como o navegador sempre mostra.
    expect(erros.filter((e) => !e.includes('ERR_INTERNET_DISCONNECTED'))).toEqual([])
  })

  test('CA-756: a marcação que não chega à nuvem volta e a tela avisa', async ({ page }) => {
    const cenario: { link: Linha; marcar: 'ok' | 'sem-rede' } = { link: linkFalso(), marcar: 'sem-rede' }
    await ligarServidorFalso(page, cenario)
    await page.goto('/#/missoes/token-do-teste')
    const agua = page.getByRole('button', { name: /Beber 2 litros de água/ })
    await agua.click()
    await expect(page.getByRole('alert')).toHaveText('Não consegui salvar. Confira a internet e marque de novo.')
    await expect(agua).toHaveAttribute('aria-pressed', 'false')
    cenario.marcar = 'ok'
    await agua.click()
    await expect(agua).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})

import { expect, test, type Page } from '@playwright/test'

/**
 * Fase 1 do plano de negócio: o nutricionista gera o link, o paciente abre no
 * aparelho dele e marca o que fez, e a tela de adesão passa a mostrar o estado.
 */

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const montarPlanoComAlmoco = async (pagina: Page) => {
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('30')

  await pagina.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entradaAlmoco = pagina.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(pagina.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')
}

test('do plano ao paciente marcando a missão', async ({ page }) => {
  await abrirLimpo(page)
  await montarPlanoComAlmoco(page)

  // O nutricionista gera o link a partir do plano
  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await expect(cartao).toContainText('Este plano gera')
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()

  const endereco = await cartao.getByLabel('Endereço do link').inputValue()
  expect(endereco).toContain('#/missoes/')
  await expect(cartao.getByText('Ainda não começou')).toBeVisible()

  // O paciente abre o link: sem menu, sem conta
  await page.goto(endereco)
  await expect(page.getByRole('heading', { name: /Suas missões de hoje, Ana/ })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)

  const missoes = page.getByRole('button')
  await expect(missoes.first()).toHaveAttribute('aria-pressed', 'false')
  await missoes.first().click()
  await expect(missoes.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', '0')

  // O que foi marcado sobrevive a recarregar a página
  await page.reload()
  await expect(page.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')

  // E o nutricionista vê o estado na tela de adesão
  await page.goto('/#/adesao')
  const lista = page.getByRole('listitem').filter({ hasText: 'Ana' })
  await expect(lista).toContainText('Atenção')
  await expect(lista).toContainText('1 de 4 dias na semana')
})

/** CA-535 e CA-554: um endereço sem espaço, bem maior que a tela do celular. */
const LINK_DO_DRIVE = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEf/view?usp=sharing&resourcekey=0-AbCdEfGhIjKlMnOpQrStUv'

test('a dieta no celular do paciente (spec dieta-no-link)', async ({ page }) => {
  await abrirLimpo(page)
  await montarPlanoComAlmoco(page)
  await page.getByRole('button', { name: /Paciente e medidas/ }).first().click()
  await page.getByLabel('Orientações nutricionais').fill(`Receitas da semana: ${LINK_DO_DRIVE}`)
  await page.getByRole('button', { name: /Refeições/ }).first().click()

  // CA-539 e CA-540: a caixa vem marcada, e o link nasce com a dieta
  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await expect(cartao.getByRole('checkbox', { name: 'Mostrar o plano alimentar no link' })).toBeChecked()
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await expect(cartao.getByText('O link também mostra o plano alimentar a qualquer pessoa que tenha o endereço.')).toBeVisible()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const endereco = await cartao.getByLabel('Endereço do link').inputValue()

  // O paciente abre no celular: 360 px de largura
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto(endereco)
  const seletor = page.getByRole('tablist', { name: 'O que ver' })
  await expect(seletor.getByRole('tab', { name: 'Missões' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: /Suas missões de hoje, Ana/ })).toBeVisible()

  // CA-531: o almoço em medida caseira
  await seletor.getByRole('tab', { name: 'Meu plano' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Seu plano alimentar, Ana' })).toBeVisible()
  const almoco = page.getByRole('region', { name: '12:00 Almoço' })
  await expect(almoco).toContainText('6 colheres de sopa')
  await expect(almoco).toContainText('Arroz branco cozido')
  await expect(page.getByText(/kcal/)).toHaveCount(0)

  // CA-535: cabe em 360 px, mesmo com o link do Drive nas orientações; letra de 16 px nos alimentos, toque de 44 px nas abas,
  // e o trilho das abas tem fio, para aparecer sobre a mesa cinza (D-154)
  await expect(page.getByRole('region', { name: 'Orientações' })).toContainText(LINK_DO_DRIVE)
  const larguras = await page.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)
  const letra = await almoco.getByText('Arroz branco cozido').evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
  expect(letra).toBeGreaterThanOrEqual(16)
  for (const nome of ['Missões', 'Meu plano']) {
    const caixa = await seletor.getByRole('tab', { name: nome }).boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  const fio = await seletor.evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopWidth))
  expect(fio).toBeGreaterThanOrEqual(1)
})

test('link inventado não abre plano de ninguém', async ({ page }) => {
  await abrirLimpo(page)
  await page.goto('/#/missoes/tokeninventado')
  await expect(page.getByRole('heading', { name: /Este link ainda não abre em outro aparelho/ })).toBeVisible()
})

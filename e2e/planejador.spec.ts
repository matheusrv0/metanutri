import { expect, test, type Page } from '@playwright/test'

/** Fluxo completo do MVP: criar caso → preencher → montar plano → cobrir ferro → substituto → exportar Word. */

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
}

const preencher = async (pagina: Page, rotulo: string | RegExp, valor: string) => {
  const campo = pagina.getByLabel(rotulo, typeof rotulo === 'string' ? { exact: true } : {})
  await campo.fill(valor)
}

test('do caso novo ao Word exportado', async ({ page }) => {
  await abrirLimpo(page)

  // CA-51: aviso de primeiro acesso
  const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await expect(boasVindas).toBeVisible()
  await expect(boasVindas).toContainText('prescrição é responsabilidade do nutricionista')
  await boasVindas.getByRole('button', { name: 'Entendi' }).click()

  // Criar caso e preencher a etapa 1
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await expect(page.getByText(/Etapa 1 de 3: Dados e medidas/)).toBeVisible()

  await preencher(page, 'Nome do plano', 'Maria, 28 anos')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await preencher(page, 'Idade', '28')
  await preencher(page, 'Peso', '60')
  await preencher(page, 'Estatura', '165')

  const antropometria = page.getByRole('region', { name: 'Avaliação antropométrica' })
  await expect(antropometria).toContainText('22,0 kg/m²')
  await expect(antropometria).toContainText('Eutrofia')

  const resumo = page.getByRole('region', { name: 'Resumo do dia' })
  await expect(resumo).toContainText('1.330 kcal')

  // CA-13 e CA-16: montar o plano com a entrada rápida
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  await expect(page.getByText('Etapa 2 de 3: Plano alimentar')).toBeVisible()

  const entradaAlmoco = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')

  await entradaAlmoco.fill('100 feijao carioca cozido')
  await entradaAlmoco.press('Enter')

  const itensAlmoco = page.getByRole('list', { name: 'Alimentos em Principal de Almoço' })
  await expect(itensAlmoco.getByRole('listitem')).toHaveCount(2)
  // 150 g de arroz tipo 1 cozido + 100 g de feijão carioca cozido
  await expect(resumo).toContainText('269 kcal')

  // Renomear uma refeição (CA-13)
  const nomeCeia = page.getByRole('textbox', { name: 'Nome da refeição Ceia' })
  await nomeCeia.fill('Lanche da noite')
  await expect(page.getByRole('textbox', { name: 'Nome da refeição Lanche da noite' })).toBeVisible()

  // CA-41: substituto equivalente para o arroz
  await page.getByRole('button', { name: /^Substituir Arroz/ }).click()
  const janelaSubstituto = page.getByRole('dialog', { name: 'Substituto equivalente' })
  const buscaSubstituto = janelaSubstituto.getByRole('combobox', { name: 'Escolher alimento substituto' })
  await buscaSubstituto.fill('batata inglesa cozida')
  await buscaSubstituto.press('Enter')
  await expect(janelaSubstituto).toContainText('Diferença em relação ao alimento original')
  await janelaSubstituto.getByRole('button', { name: 'Pôr em Substituto 1' }).click()
  await expect(page.getByRole('tab', { name: 'Substituto 1 (1)' })).toBeVisible()

  // CA-38: cobrir o ferro pela etapa 3
  await page.getByRole('button', { name: /Próxima etapa: Adequação/ }).click()
  const linhaFerro = page.getByRole('row').filter({ hasText: 'Ferro' }).first()
  const adequacaoAntes = await linhaFerro.textContent()
  await linhaFerro.getByRole('button', { name: 'Cobrir' }).click()

  const gaveta = page.getByRole('dialog')
  await expect(gaveta).toContainText('para a meta')
  const sugestoes = gaveta.getByRole('list', { name: 'Sugestões para cobrir' }).getByRole('listitem')
  await expect(sugestoes.first()).toContainText('cobre')
  await sugestoes.first().getByRole('button', { name: 'Adicionar' }).click()
  await expect(gaveta).toBeHidden()
  await expect(page.getByRole('row').filter({ hasText: 'Ferro' }).first()).not.toHaveText(adequacaoAntes ?? '')

  // CA-44 e CA-46: baixar os dois documentos Word
  for (const [item, sufixo] of [
    ['Aconselhamento em Word', 'aconselhamento'],
    ['Memorial de cálculo em Word', 'memorial-de-calculo'],
  ] as const) {
    await page.getByRole('button', { name: 'Exportar' }).click()
    const baixando = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: item }).click()
    const arquivo = await baixando
    expect(arquivo.suggestedFilename()).toBe(`Maria-28-anos-${sufixo}.docx`)
  }

  // CA-49: o trabalho continua depois de recarregar
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Maria, 28 anos' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Ferro' }).first()).toBeVisible()
})

test('prescrição rápida: meta calculada e sugestões por refeição', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()

  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()

  await page.getByRole('radio', { name: 'Feminino' }).click()
  await preencher(page, 'Idade', '28')
  await preencher(page, 'Peso', '62')
  await preencher(page, 'Estatura', '163')
  await page.getByRole('radio', { name: 'Moderadamente ativo (1,55)' }).click()

  // CA-226: a meta sai pronta, e o Resumo do dia usa ela
  await expect(page.getByLabel('Meta de energia')).toHaveAttribute('placeholder', '2.074')
  const resumo = page.getByRole('region', { name: 'Resumo do dia' })
  await expect(resumo).toContainText('Meta calculada')
  await expect(resumo).toContainText('2.074 kcal')

  // CA-237 e CA-238: a sugestão entra com um clique
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const almoco = page.getByRole('tabpanel', { name: 'Principal de Almoço' })
  await almoco.getByRole('button', { name: 'Adicionar Arroz, tipo 1, cozido, 100 g' }).click()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' }).getByRole('listitem')).toHaveCount(1)

  // CA-241 e CA-243: tirar uma sugestão vale depois de recarregar
  await almoco.getByRole('button', { name: 'Editar sugestões para o almoço' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Sugestões para o almoço' })
  await dialogo.getByRole('button', { name: 'Tirar Tomate, com semente, cru' }).click()
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo).toBeHidden()
  await expect(almoco.getByRole('button', { name: 'Adicionar Tomate, com semente, cru, 80 g' })).toHaveCount(0)

  await page.reload()
  const almocoDepois = page.getByRole('tabpanel', { name: 'Principal de Almoço' })
  await expect(almocoDepois.getByRole('button', { name: 'Adicionar Feijão, carioca, cozido, 140 g' })).toBeVisible()
  await expect(almocoDepois.getByRole('button', { name: 'Adicionar Tomate, com semente, cru, 80 g' })).toHaveCount(0)
})

test('diálogo de sugestões cabe na tela de 400 px', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const almoco = page.getByRole('tabpanel', { name: 'Principal de Almoço' })

  await page.setViewportSize({ width: 400, height: 800 })
  await almoco.getByRole('button', { name: 'Editar sugestões para o almoço' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Sugestões para o almoço' })
  for (const botao of [
    dialogo.getByRole('button', { name: 'Tirar Carne, bovina, patinho, sem gordura, grelhado' }),
    dialogo.getByRole('button', { name: 'Adicionar' }),
  ]) {
    const caixa = await botao.boundingBox()
    expect(caixa).not.toBeNull()
    expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(400)
  }
})

test('no celular, as sugestões ficam numa faixa só que rola para o lado', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()

  await page.setViewportSize({ width: 400, height: 800 })
  const almoco = page.getByRole('tabpanel', { name: 'Principal de Almoço' })
  const sugestoes = almoco.getByRole('region', { name: 'Sugestões para o almoço' }).getByRole('button', { name: /^Adicionar / })
  const primeira = await sugestoes.first().boundingBox()
  const ultima = await sugestoes.last().boundingBox()
  expect(ultima?.y).toBe(primeira?.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400)

  // A última sugestão continua ao alcance: rola a faixa e entra no plano.
  await sugestoes.last().click()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Almoço' }).getByRole('listitem')).toHaveCount(1)
})

test('funciona sem internet depois do primeiro acesso (CB-10)', async ({ page, context }) => {
  await abrirLimpo(page)
  await page.getByRole('button', { name: 'Entendi' }).click()
  // espera o service worker assumir o controle
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined, undefined, {
    timeout: 30_000,
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()

  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await page.getByLabel('Peso').fill('60')
  await page.getByLabel('Estatura').fill('165')
  await page.getByLabel('Idade', { exact: true }).fill('28')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await expect(page.getByRole('region', { name: 'Avaliação antropométrica' })).toContainText('22,0 kg/m²')

  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Desjejum' })
  await entrada.fill('100 banana prata')
  await entrada.press('Enter')
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Desjejum' }).getByRole('listitem')).toHaveCount(1)

  await context.setOffline(false)
})

test('PDF: letra grande e lista de compras e trocas opcionais', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  await page.getByRole('region', { name: 'Sugestões para o almoço' }).getByRole('button', { name: /^Adicionar / }).first().click()

  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
  const janela = page.getByRole('dialog', { name: 'Dieta para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Lista de compras' })).toHaveCount(0)

  // CA-317: marcar muda a prévia na hora.
  await janela.getByRole('switch', { name: 'Trocas' }).click()
  await expect(janela.getByRole('heading', { name: 'Trocas' })).toBeVisible()
  await janela.getByRole('switch', { name: 'Lista de compras' }).click()

  // CA-311: no papel, corpo com 10 pt ou mais e refeição com 14 pt ou mais (1 pt = 4/3 px).
  await page.emulateMedia({ media: 'print' })
  const almoco = janela.getByRole('region', { name: '12:00 Almoço' })
  const tamanho = async (alvo: ReturnType<typeof page.locator>) => Number.parseFloat(await alvo.evaluate((el) => getComputedStyle(el).fontSize))
  expect(await tamanho(almoco.getByRole('heading', { name: 'Almoço' }))).toBeGreaterThanOrEqual(18.66)
  expect(await tamanho(almoco.getByRole('listitem').first())).toBeGreaterThanOrEqual(13.33)
  await expect(almoco).not.toContainText('kcal')

  // Regressão: a janela fixa do Radix cortava a folha numa página só. Com as duas opções, o PDF tem mais de uma.
  // No papel a janela fica no canto da folha, sem o deslocamento de centralização (senão o topo e a esquerda somem).
  const caixa = await janela.evaluate((el) => ({ x: el.getBoundingClientRect().left + window.scrollX, y: el.getBoundingClientRect().top + window.scrollY }))
  expect(caixa.x).toBeGreaterThanOrEqual(0)
  expect(caixa.y).toBeGreaterThanOrEqual(0)
  const pdf = await page.pdf({ format: 'A4' })
  const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
  expect(paginas).toBeGreaterThan(1)
  await expect(janela.getByRole('heading', { name: 'Plano alimentar' })).toBeVisible()
  await expect(janela).toContainText('Composição dos alimentos: Base MetaNutri.')
  await page.emulateMedia({ media: 'screen' })
})

test('Painel: três números e o Novo plano no topo', async ({ page }) => {
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await expect(page.getByRole('region', { name: 'Seus números' })).toBeVisible()
  await expect(page.getByText('Nenhum plano ainda.')).toBeVisible()
  await expect(page.getByText('Começar agora')).toHaveCount(0)
})

test('CA-336: em tela larga as sugestões também ficam numa linha só', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await abrirLimpo(page)
  await page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const sugestoes = page.getByRole('region', { name: 'Sugestões para o almoço' }).getByRole('button', { name: /^Adicionar / })
  const primeira = await sugestoes.first().boundingBox()
  const ultima = await sugestoes.last().boundingBox()
  expect(ultima?.y).toBe(primeira?.y)
})

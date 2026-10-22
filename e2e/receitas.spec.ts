import { expect, test, type Page } from '@playwright/test'

// Spec receitas-com-calculo: a receita da biblioteca até o papel e o celular do paciente, no navegador.

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const adicionarIngrediente = async (pagina: Page, texto: string) => {
  const campo = pagina.getByRole('combobox', { name: 'Adicionar ingrediente' })
  await campo.fill(texto)
  await expect(pagina.getByRole('option').first()).toBeVisible()
  await campo.press('Enter')
}

const criarPanqueca = async (pagina: Page) => {
  await pagina.goto('/#/receitas')
  await pagina.getByRole('button', { name: 'Nova receita' }).click()
  await pagina.getByLabel('Nome', { exact: true }).fill('Panqueca de banana')
  await adicionarIngrediente(pagina, '150 banana prata crua')
  await adicionarIngrediente(pagina, '100 ovo galinha inteiro cru')
  await adicionarIngrediente(pagina, '30 aveia flocos')
  await pagina.getByLabel('Rende').fill('2')
  await pagina.getByRole('combobox', { name: 'Nome da porção' }).click()
  await pagina.getByRole('option', { name: 'unidade' }).click()
  await pagina.getByLabel('Peso da receita pronta').fill('240')
  await pagina.getByLabel('Modo de preparo').fill('Amasse a banana, misture o ovo e a aveia.\nDoure dos dois lados.')
  await expect(pagina.getByRole('region', { name: 'Valor de uma porção' })).toContainText('204 kcal')
  await pagina.getByRole('button', { name: 'Salvar receita' }).click()
  await expect(pagina.getByRole('list', { name: 'Receitas' })).toContainText('Rende 2 unidades (120 g cada) · 204 kcal por unidade')
}

/** Põe 1 unidade da primeira receita da biblioteca no Desjejum do plano aberto, direto nos dados, e recarrega. */
const porPanquecaNoDesjejum = async (pagina: Page) => {
  const casoId = decodeURIComponent(new URL(pagina.url()).hash.split('/')[2] ?? '')
  await pagina.evaluate((id) => {
    const chave = `metanutri:caso:${id}`
    const salvo = JSON.parse(localStorage.getItem(chave) ?? 'null') as {
      versao: number
      plano: { refeicoes: { nome: string; opcoes: { principal: unknown[] } }[] }
    }
    const [r] = JSON.parse(localStorage.getItem('metanutri:receitas') ?? '[]') as Record<string, unknown>[]
    if (!r) throw new Error('sem receita na biblioteca')
    const receita = { origemId: r['id'], nome: r['nome'], ingredientes: r['ingredientes'], porcoes: r['porcoes'], nomeDaPorcao: r['nomeDaPorcao'], pesoProntoG: r['pesoProntoG'], preparo: r['preparo'] }
    salvo.plano.refeicoes.find((refeicao) => refeicao.nome === 'Desjejum')?.opcoes.principal.push({ id: 'item-panqueca', alimentoId: 0, gramas: 120, receita })
    salvo.versao += 1
    localStorage.setItem(chave, JSON.stringify(salvo))
  }, casoId)
  await pagina.reload()
}

/** Nada passa da largura da tela (sem rolagem para o lado). */
const semRolagemLateral = async (pagina: Page) => {
  const larguras = await pagina.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)
}

test('a receita da biblioteca ao plano, à folha e ao link do paciente', async ({ page }) => {
  await abrirLimpo(page)
  // CA-860: o menu leva às receitas.
  await page.getByRole('button', { name: 'Receitas' }).click()
  await expect(page.getByText('Nenhuma receita ainda.')).toBeVisible()
  await criarPanqueca(page)

  // Um plano novo, com a panqueca no Desjejum (CA-871).
  await page.goto('/#/painel')
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await page.getByLabel('Idade', { exact: true }).fill('30')
  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  // D-274a, publicação 2 (spec alimentos-e-gramaturas, D-388): a busca da refeição põe a receita.
  const busca = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Desjejum' })
  await busca.fill('panqueca')
  await expect(page.getByRole('option', { name: /Panqueca de banana/ })).toBeVisible()
  await busca.press('Enter')
  const desjejum = page.getByRole('tabpanel', { name: 'Principal de Desjejum' })
  await expect(desjejum).toContainText('Panqueca de banana')
  await expect(desjejum).toContainText('Receita · 1 unidade')
  await expect(desjejum).toContainText('204 kcal')

  // CA-880: a folha traz a receita na refeição e inteira em Receitas.
  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
  const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
  await expect(janela.getByRole('region', { name: '06:00 Desjejum' })).toContainText('Panqueca de banana')
  const receitas = janela.getByRole('region', { name: 'Receitas' })
  await expect(receitas).toContainText('Rende 2 unidades (120 g cada)')
  await expect(receitas).toContainText('Banana prata — 2 unidades')
  await page.keyboard.press('Escape')

  // CA-883 e CA-884: o link do paciente, no celular, com a receita.
  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const endereco = await cartao.getByLabel('Endereço do link').inputValue()
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto(endereco)
  await page.getByRole('tablist', { name: 'O que ver' }).getByRole('tab', { name: 'Meu plano' }).click()
  await expect(page.getByRole('region', { name: '06:00 Desjejum' })).toContainText('Panqueca de banana')
  // CA-974 (spec integracao-rodada-1910): a porção da receita, a mesma linha da folha impressa. Plano novo em "Medida e
  // gramas" (spec alimentos-e-gramaturas, D-376): a porção com o peso ao lado.
  await expect(page.getByRole('region', { name: '06:00 Desjejum' }).getByRole('listitem').filter({ hasText: 'Panqueca de banana' })).toHaveText('1 unidade (120 g)Panqueca de banana')
  await expect(page.getByRole('region', { name: 'Receitas' })).toContainText('Amasse a banana')
  await semRolagemLateral(page)
})

test('CA-889 (rodada da revisão): a linha da receita no plano cabe em 360 px, com botões de 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await abrirLimpo(page)
  await criarPanqueca(page)
  await page.goto('/#/painel')
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await page.getByLabel('Idade', { exact: true }).fill('30')
  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  await porPanquecaNoDesjejum(page)
  const desjejum = page.getByRole('tabpanel', { name: 'Principal de Desjejum' })
  await expect(desjejum).toContainText('Receita · 1 unidade')
  await semRolagemLateral(page)
  const remover = await desjejum.getByRole('button', { name: 'Remover Panqueca de banana' }).boundingBox()
  expect(remover?.height ?? 0).toBeGreaterThanOrEqual(44)
  const gramas = await desjejum.getByLabel('Gramas de Panqueca de banana').boundingBox()
  expect((gramas?.x ?? 0) + (gramas?.width ?? 0)).toBeLessThanOrEqual(360)
})

test('CA-889: lista e editor de receitas cabem em 360 px, com botões de 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await abrirLimpo(page)
  await criarPanqueca(page)
  await semRolagemLateral(page)
  for (const nome of ['Editar Panqueca de banana', 'Mais ações de Panqueca de banana', 'Nova receita']) {
    const caixa = await page.getByRole('button', { name: nome }).boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await page.getByRole('button', { name: 'Editar Panqueca de banana' }).click()
  await expect(page.getByRole('heading', { name: 'Editar receita' })).toBeVisible()
  await semRolagemLateral(page)
  for (const nome of ['Salvar receita', 'Cancelar', 'Remover Banana, prata, crua']) {
    const caixa = await page.getByRole('button', { name: nome }).boundingBox()
    expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  const porcao = await page.getByRole('combobox', { name: 'Nome da porção' }).boundingBox()
  expect(porcao?.height ?? 0).toBeGreaterThanOrEqual(44)
})

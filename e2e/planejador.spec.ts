import { expect, test, type Page } from '@playwright/test'

/** Fluxo completo do MVP: criar caso → preencher → montar plano → cobrir ferro → substituto → exportar Word. */

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
}

const preencher = async (pagina: Page, rotulo: string | RegExp, valor: string) => {
  const campo = pagina.getByLabel(rotulo)
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
  await page.getByRole('button', { name: 'Novo caso' }).first().click()
  await page.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await expect(page.getByText(/Etapa 1 de 3: Dados do caso/)).toBeVisible()

  await preencher(page, 'Nome do caso', 'Maria, 28 anos')
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

test('funciona sem internet depois do primeiro acesso (CB-10)', async ({ page, context }) => {
  await abrirLimpo(page)
  await page.getByRole('button', { name: 'Entendi' }).click()
  // espera o service worker assumir o controle
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined, undefined, {
    timeout: 30_000,
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Meus casos' })).toBeVisible()

  await page.getByRole('button', { name: 'Novo caso' }).first().click()
  await page.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await page.getByLabel('Peso').fill('60')
  await page.getByLabel('Estatura').fill('165')
  await page.getByLabel('Idade').fill('28')
  await page.getByRole('radio', { name: 'Feminino' }).click()
  await expect(page.getByRole('region', { name: 'Avaliação antropométrica' })).toContainText('22,0 kg/m²')

  await page.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }).click()
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Desjejum' })
  await entrada.fill('100 banana prata')
  await entrada.press('Enter')
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Desjejum' }).getByRole('listitem')).toHaveCount(1)

  await context.setOffline(false)
})

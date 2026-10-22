import { expect, test, type Page } from '@playwright/test'

// Spec ficha-unica: cada pergunta para quem vale (CA-1048 a CA-1051; correção B, CA-1282 e a tabela 10.2), a etapa 1
// com paciente (CA-1066), a restrição na linha do plano (CA-1077) e a meta de água (CA-1092), em 360 px (CA-1086).

interface Pessoa {
  readonly nome: string
  readonly sexo: 'Feminino' | 'Masculino'
  readonly nascimento: string
  readonly gestante?: boolean
  readonly blocos: readonly string[]
  readonly semBlocos: readonly string[]
  /** Correção B (tabela 10.2): perguntas e campos que aparecem e que não aparecem, pelo rótulo. */
  readonly comRotulos: readonly string[]
  readonly semRotulos: readonly string[]
  readonly comSop: boolean
}

/** As idades contam do dia em que o teste roda: as datas ficam longe dos cortes. */
const anosAtras = (anos: number) => {
  const hoje = new Date()
  return `${hoje.getFullYear() - anos}-01-15`
}

const PESSOAS: readonly Pessoa[] = [
  {
    nome: 'João Teste',
    sexo: 'Masculino',
    nascimento: anosAtras(35),
    blocos: ['Álcool e tabagismo', 'Atividade física'],
    semBlocos: ['Gestação', 'Lactação', 'Saúde da mulher', 'Infância', 'Pessoa idosa'],
    comRotulos: ['Ocupação', 'Dietas que já fez', 'Rotina de trabalho ou estudo', 'Tabagismo'],
    semRotulos: ['Escola e ano', 'Responsável', 'Tempo de tela por dia', 'Menstruação'],
    comSop: false,
  },
  {
    nome: 'Ana Teste',
    sexo: 'Feminino',
    nascimento: anosAtras(28),
    gestante: true,
    blocos: ['Gestação'],
    semBlocos: ['Saúde da mulher', 'Infância', 'Pessoa idosa'],
    comRotulos: ['Ocupação', 'Náusea ou vômito', 'Dietas que já fez', 'Rotina de trabalho ou estudo'],
    semRotulos: ['Menstruação', 'Fluxo menstrual intenso', 'Escola e ano', 'Responsável'],
    comSop: true,
  },
  {
    nome: 'Bia Teste',
    sexo: 'Feminino',
    nascimento: anosAtras(6),
    blocos: ['Infância', 'Atividade física'],
    semBlocos: ['Álcool e tabagismo', 'Gestação', 'Saúde da mulher', 'Pessoa idosa'],
    comRotulos: ['Escola e ano', 'Responsável', 'Tempo de tela por dia', 'Rotina da escola ou da creche'],
    semRotulos: ['Ocupação', 'Dietas que já fez', 'Rotina de trabalho ou estudo', 'Tabagismo'],
    comSop: false,
  },
  {
    nome: 'Rosa Teste',
    sexo: 'Feminino',
    nascimento: anosAtras(68),
    blocos: ['Saúde da mulher', 'Pessoa idosa'],
    semBlocos: ['Gestação', 'Lactação', 'Infância'],
    comRotulos: ['Ocupação', 'Menstruação', 'Reposição hormonal', 'Dietas que já fez', 'Perda de peso sem querer'],
    semRotulos: ['Fluxo menstrual intenso', 'Anticoncepcional ou reposição hormonal', 'Com quem mora', 'Escola e ano', 'Responsável'],
    comSop: true,
  },
]

const fichaNova = async (pagina: Page, pessoa: Pick<Pessoa, 'nome' | 'sexo' | 'nascimento'>) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/pacientes')
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Cadastrar paciente' }).click()
  await pagina.getByLabel('Nome', { exact: true }).fill(pessoa.nome)
  await pagina.getByRole('radio', { name: pessoa.sexo }).click()
  await pagina.getByLabel('Data de nascimento').fill(pessoa.nascimento)
}

const semRolarParaOLado = async (pagina: Page) => {
  const larguras = await pagina.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: document.documentElement.clientWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)
}

for (const pessoa of PESSOAS) {
  test(`a ficha de ${pessoa.nome} só pergunta o que vale, em 360 px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await fichaNova(page, pessoa)
    if (pessoa.gestante) {
      await page.getByRole('radio', { name: 'Gestante' }).click()
      await page.getByLabel('Idade gestacional').fill('24')
    }
    const anamnese = page.getByRole('region', { name: 'Anamnese' })
    for (const bloco of pessoa.blocos) await expect(anamnese.getByRole('button', { name: new RegExp(`^${bloco}`) })).toBeVisible()
    for (const bloco of pessoa.semBlocos) await expect(anamnese.getByRole('button', { name: new RegExp(`^${bloco}`) })).toHaveCount(0)
    await anamnese.getByRole('button', { name: 'Abrir tudo' }).click()
    // CA-1282 (correção B): cada pergunta e cada campo, pela tabela 10.2.
    for (const rotulo of pessoa.comRotulos) await expect(page.getByLabel(rotulo, { exact: true }).first(), rotulo).toBeVisible()
    for (const rotulo of pessoa.semRotulos) await expect(page.getByLabel(rotulo, { exact: true }), rotulo).toHaveCount(0)
    await expect(anamnese.getByRole('checkbox', { name: 'Síndrome dos ovários policísticos' })).toHaveCount(pessoa.comSop ? 1 : 0)
    await semRolarParaOLado(page)
  })
}

test('o plano lê a ficha: resumo na etapa 1, alergia na linha do plano e meta de água pelo peso', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await fichaNova(page, { nome: 'João Teste', sexo: 'Masculino', nascimento: anosAtras(35) })
  const anamnese = page.getByRole('region', { name: 'Anamnese' })
  await anamnese.getByRole('button', { name: /^Alimentação/ }).click()
  await anamnese.getByRole('group', { name: 'Alergias' }).getByRole('checkbox', { name: 'Leite e derivados' }).click()

  await page.locator('[data-slot="card"]', { hasText: 'Histórico de planos' }).getByRole('button', { name: 'Novo plano' }).click()
  await page.getByRole('menuitem', { name: /Atendimento completo/ }).click()
  await expect(page).toHaveURL(/#\/caso\/[^/]+\/caso$/)

  const identificacao = page.getByRole('heading', { name: 'Identificação' }).locator('xpath=ancestor::*[@data-slot="card"][1]')
  await expect(identificacao.getByText(/35 anos e \d+ (mês|meses) · Masculino/)).toBeVisible()
  await expect(identificacao.getByText('Restrições: leite e derivados')).toBeVisible()
  await expect(page.getByLabel('Nome do plano')).toHaveCount(0)
  // CA-1033: o plano novo nasce com a data de hoje.
  const hoje = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  await expect(page.getByLabel('Data da consulta')).toHaveValue(hoje)
  await expect(page.getByRole('radiogroup', { name: 'Gestação ou lactação' })).toHaveCount(0)

  await page.getByLabel('Peso', { exact: true }).fill('72')
  await page.getByLabel('Estatura', { exact: true }).fill('175')
  await expect(page.getByLabel('Meta de água', { exact: true })).toHaveValue('2,5')
  await expect(page.getByText('Por peso: 35 ml/kg (18 a 55 anos) · 35 ml × 72 kg = 2,5 L')).toBeVisible()
  await semRolarParaOLado(page)

  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entrada = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entrada.fill('30 queijo minas frescal')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entrada.press('Enter')
  await expect(page.getByText('Alergia: leite e derivados')).toBeVisible()
  await semRolarParaOLado(page)
})

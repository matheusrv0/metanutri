// Spec textos-e-promessas: o texto novo no navegador e no HTML publicado (CA-1198) e o nome do paciente no plano
// impresso e no link (CA-1193).
import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from './apoio/fumaca.ts'

/** Os termos que a revisão de texto tirou (D-416): nenhum aparece na vitrine. */
const PROIBIDO =
  /Não consegui|Não deu para|Conta e plano|Painel do gestor|presos à|Ver planos|Dieta para imprimir|Meus produtos|Grátis na faculdade|Não dá para desfazer|Cinco minutos|597 alimentos|folha do paciente|Comece pelo Free|até 4 nutricionistas|Painel de micros|Relatório de adesão/i
const TEMAS = ['claro', 'escuro'] as const

async function abrir(pagina: Page, endereco: string, tema: (typeof TEMAS)[number]) {
  await pagina.addInitScript((t) => localStorage.setItem('metanutri:tema', t), tema)
  await pagina.goto(endereco)
  await expect(pagina.locator('[data-vitrine]')).toHaveCount(0)
}

test.describe('CA-1198: landing e Preços com o texto novo, em 390 e 1280 px, claro e escuro', () => {
  for (const largura of [390, 1280]) {
    for (const tema of TEMAS) {
      test(`landing em ${largura} px, tema ${tema}`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        const erros = await vigiarConsole(page)
        await abrir(page, '/#/inicio', tema)
        // Spec landing-escura (CA-1477 e CA-1480) e spec landing-v3 (CA-1600): o texto da landing, nos dois temas do app.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Falta cálcio\?\s*150 g de iogurte\./)
        await expect(page.getByText(/^Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral/)).toBeVisible()
        await expect(page.getByRole('textbox', { name: 'Digite o nutriente que falta' })).toHaveValue('falta cálcio')
        const precos = page.getByRole('region', { name: 'Quanto custa' })
        for (const plano of ['Free', 'Pro', 'Estudante', 'Clínica']) await expect(precos.getByText(plano, { exact: true })).toBeVisible()
        await expect(precos.getByRole('button', { name: 'Assinar o Solo' })).toBeVisible()
        await expect(page.getByRole('link', { name: /Crie a conta e monte o primeiro plano hoje\. Sem cartão\./ })).toBeVisible()
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        await semRolagemLateral(page)
        expect(erros).toEqual([])
      })

      test(`Preços em ${largura} px, tema ${tema}`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 844 })
        await abrir(page, '/#/precos', tema)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos e preços')
        await expect(page.getByText('Todas as assinaturas têm as mesmas funções. O que muda é quantos pacientes ativos você acompanha.')).toBeVisible()
        const clinica = page.getByRole('note', { name: 'Plano Clínica' }).filter({ visible: true })
        await expect(clinica).toContainText('Clínica com mais de um nutricionista:')
        expect(await page.locator('body').innerText()).not.toMatch(PROIBIDO)
        expect(await page.locator('body').innerText()).not.toMatch(/R\$\s*149|Suporte/)
        await semRolagemLateral(page)
      })
    }
  }
})

test('CA-1198: o HTML publicado já traz o texto novo, sem o cartão de alimentos nem a Clínica a R$ 149', async ({ request }) => {
  const inicio = await (await request.get('/')).text()
  const raiz = inicio.slice(inicio.indexOf('<div id="root">'))
  // Spec landing-escura (CA-1484): a landing nova, pré-desenhada.
  for (const trecho of ['O que falta no plano da Maria, 28 anos?', 'O plano sai do seu jeito', 'Todas as assinaturas têm as mesmas funções', 'Perguntas de quem atende']) {
    expect(raiz).toContain(trecho)
  }
  expect(raiz).not.toMatch(/597|Comece pelo Free|folha do paciente/)
  const precos = await (await request.get('/precos/')).text()
  expect(precos).toContain('Planos e preços')
  expect(precos).toContain('Clínica com mais de um nutricionista')
  expect(precos).not.toMatch(/R\$ 149|149\.00|Painel do gestor/)
  expect(await (await request.get('/llms.txt')).text()).not.toMatch(/presos|R\$ 149/)
})

test('CA-1193: o plano impresso e o link saúdam o paciente vinculado, não o nome do plano', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()

  // A paciente, cadastrada pela ficha.
  await page.goto('/#/pacientes')
  await page.getByRole('button', { name: /Cadastrar paciente|Novo paciente/ }).first().click()
  await page.getByLabel('Nome', { exact: true }).fill('Beatriz Lima')

  // O plano, com um nome que é da nutricionista, vinculado à paciente.
  await page.getByRole('button', { name: 'Novo plano' }).first().click()
  await page.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await page.getByLabel('Nome do plano').fill('Bia, 28 anos, retorno')
  await page.getByLabel('Paciente', { exact: true }).selectOption({ label: 'Beatriz Lima' })
  await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
  const entradaAlmoco = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
  await entradaAlmoco.fill('150 arroz tipo 1 cozido')
  await expect(page.getByRole('option').first()).toBeVisible()
  await entradaAlmoco.press('Enter')

  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: 'Plano alimentar (PDF)' }).click()
  const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
  await expect(janela.locator('header')).toContainText('Beatriz Lima')
  await expect(janela).not.toContainText('28 anos, retorno')
  await page.keyboard.press('Escape')
  await expect(janela).toBeHidden()

  const cartao = page.getByRole('region', { name: 'Link do paciente' })
  await cartao.getByRole('button', { name: 'Gerar link do paciente' }).click()
  await cartao.getByRole('button', { name: /Já tenho a autorização/ }).click()
  const endereco = await cartao.getByLabel('Endereço do link').inputValue()
  await page.goto(endereco)
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Beatriz' })).toBeVisible()
})

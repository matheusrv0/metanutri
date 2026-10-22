import { expect, test, type Page } from '@playwright/test'
import { conferirCamposNoCelular, medidaDe } from './apoio/campos.ts'

// Spec integracao-rodada-1910 (D-311, CA-976 e CA-979): os campos da área de trabalho no celular, com letra de 16 px e
// 44 px, sem a tela rolar para o lado; no computador, os 40 px e a letra de 14 px de antes.

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
}

const comecarPlano = async (pagina: Page) => {
  await pagina.goto('/#/painel')
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('Ana, 30 anos')
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('30')
}

for (const largura of [360, 390]) {
  test.describe(`CA-979: campos no celular de ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('dados do caso e plano alimentar, com a linha do alimento (CB-312)', async ({ page }) => {
      await abrirLimpo(page)
      await comecarPlano(page)
      await conferirCamposNoCelular(page, 'dados do caso')
      await page.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
      const busca = page.getByRole('combobox', { name: 'Adicionar alimento em Principal de Desjejum' })
      await busca.fill('120 arroz cozido')
      await busca.press('Enter')
      await expect(page.getByRole('tabpanel', { name: 'Principal de Desjejum' }).getByRole('textbox', { name: /^Gramas de / })).toBeVisible()
      await conferirCamposNoCelular(page, 'plano alimentar')
    })

    test('Alimentos', async ({ page }) => {
      await abrirLimpo(page)
      await page.goto('/#/alimentos')
      await expect(page.getByRole('searchbox', { name: 'Buscar alimento na tabela' })).toBeVisible()
      await conferirCamposNoCelular(page, 'Alimentos')
    })

    test('ficha do paciente', async ({ page }) => {
      await abrirLimpo(page)
      await page.goto('/#/pacientes')
      await page.getByRole('button', { name: 'Cadastrar paciente' }).click()
      await page.getByLabel('Nome', { exact: true }).fill('Maria Silva')
      await conferirCamposNoCelular(page, 'ficha do paciente')
    })
  })
}

test.describe('CA-976: no computador, os campos ficam como antes', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('40 px e letra de 14 px nos dados do caso', async ({ page }) => {
    await abrirLimpo(page)
    await comecarPlano(page)
    expect(await medidaDe(page.getByLabel('Nome do plano'))).toEqual({ letra: 14, altura: 40 })
    expect(await medidaDe(page.getByLabel('Idade', { exact: true }))).toEqual({ letra: 14, altura: 40 })
  })
})

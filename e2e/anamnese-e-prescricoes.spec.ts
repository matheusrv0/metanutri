import { expect, test, type Page } from '@playwright/test'

// Spec anamnese-e-prescricoes: a anamnese com roteiro, os suplementos e o pedido de exames na ficha do paciente.

const abrirFichaNova = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/pacientes')
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Cadastrar paciente' }).click()
  await pagina.getByLabel('Nome', { exact: true }).fill('Maria Silva')
}

test('anamnese: responder, editar o roteiro e a resposta continuar depois de recarregar', async ({ page }) => {
  await abrirFichaNova(page)
  const anamnese = page.getByRole('region', { name: 'Anamnese' })
  await anamnese.getByRole('button', { name: /^Água/ }).click()
  await anamnese.getByLabel('Quanta água bebe por dia').fill('Pouca, uns 3 copos')

  await anamnese.getByRole('button', { name: 'Editar roteiro' }).click()
  const janela = page.getByRole('dialog', { name: 'Roteiro da anamnese' })
  await janela.getByRole('button', { name: /^Água/ }).click()
  await janela.getByRole('button', { name: 'Acrescentar pergunta em Água' }).click()
  await janela.getByRole('textbox', { name: 'Pergunta 3 de Água' }).fill('Chá ou café por dia')
  await janela.getByRole('button', { name: 'Salvar roteiro' }).click()
  await expect(janela).toBeHidden()

  await page.reload()
  await expect(anamnese.getByRole('button', { name: /^Água/ })).toHaveAttribute('aria-expanded', 'true')
  await expect(anamnese.getByLabel('Quanta água bebe por dia')).toHaveValue('Pouca, uns 3 copos')
  await expect(anamnese.getByLabel('Chá ou café por dia')).toBeVisible()
})

test('suplemento e pedido de exames saem nas folhas de imprimir', async ({ page }) => {
  await abrirFichaNova(page)
  const suplementos = page.getByRole('region', { name: 'Suplementos' })
  await suplementos.getByRole('button', { name: 'Acrescentar suplemento' }).click()
  await suplementos.getByLabel('Nome').fill('Vitamina D3')
  await suplementos.getByLabel('Dose').fill('1 cápsula de 2.000 UI')
  await suplementos.getByRole('button', { name: 'Imprimir' }).click()
  const folha = page.getByRole('dialog', { name: 'Suplementos para imprimir' })
  await expect(folha.getByRole('article')).toContainText('Vitamina D3')
  await expect(folha.getByRole('article')).toContainText('Dose: 1 cápsula de 2.000 UI')
  await folha.getByRole('button', { name: 'Fechar' }).last().click()

  const exames = page.getByRole('region', { name: 'Pedido de exames' })
  await expect(exames.getByRole('button', { name: 'Imprimir pedido' })).toBeDisabled()
  await exames.getByRole('checkbox', { name: 'Ferritina' }).check()
  await exames.getByRole('button', { name: 'Imprimir pedido' }).click()
  await expect(page.getByRole('dialog', { name: 'Pedido de exames para imprimir' }).getByRole('article')).toContainText('Ferritina')
})

test('CA-587: em 360 px a ficha não rola para o lado e os alvos têm 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await abrirFichaNova(page)
  await page.getByRole('region', { name: 'Suplementos' }).getByRole('button', { name: 'Acrescentar suplemento' }).click()
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Objetivo e queixa/ }).click()

  const larguras = await page.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: document.documentElement.clientWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)

  for (const nome of ['Anamnese', 'Suplementos', 'Pedido de exames']) {
    const regiao = page.getByRole('region', { name: nome })
    for (const alvo of await regiao.locator('button:visible, label:visible:has(input[type="checkbox"])').all()) {
      const caixa = await alvo.boundingBox()
      expect(caixa?.height ?? 0, `${nome}: ${await alvo.textContent()}`).toBeGreaterThanOrEqual(44)
    }
  }
})

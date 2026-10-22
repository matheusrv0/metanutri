import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec anamnese-e-prescricoes: a anamnese com roteiro, os suplementos e o pedido de exames na ficha do paciente.

const abrirFichaNova = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto('/#/pacientes')
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Cadastrar paciente' }).click()
  await pagina.getByLabel('Nome', { exact: true }).fill('Maria Silva')
  // Spec ficha-unica, R13: com sexo e data de nascimento, aparecem os blocos da fase de vida.
  await pagina.getByRole('radio', { name: 'Feminino' }).click()
  await pagina.getByLabel('Data de nascimento').fill('1998-01-10')
}

test('anamnese: responder, editar o roteiro e a resposta continuar depois de recarregar', async ({ page }) => {
  await abrirFichaNova(page)
  const anamnese = page.getByRole('region', { name: 'Anamnese' })
  await anamnese.getByRole('button', { name: /^Hidratação/ }).click()
  await anamnese.getByLabel('Água por dia').fill('Pouca, uns 3 copos')

  await anamnese.getByRole('button', { name: 'Editar roteiro' }).click()
  const janela = page.getByRole('dialog', { name: 'Roteiro da anamnese' })
  await janela.getByRole('button', { name: /^Hidratação/ }).click()
  await janela.getByRole('button', { name: 'Adicionar pergunta em Hidratação' }).click()
  await janela.getByRole('textbox', { name: 'Pergunta 4 de Hidratação' }).fill('Chá ou café por dia')
  await janela.getByRole('button', { name: 'Salvar roteiro' }).click()
  await expect(janela).toBeHidden()

  await page.reload()
  // CA-563: ao voltar, o bloco respondido começa recolhido, com o resumo.
  const agua = anamnese.getByRole('button', { name: /^Hidratação/ })
  await expect(agua).toHaveAttribute('aria-expanded', 'false')
  await expect(agua).toContainText('1 de 4 respondida')
  await agua.click()
  await expect(anamnese.getByLabel('Água por dia')).toHaveValue('Pouca, uns 3 copos')
  await expect(anamnese.getByLabel('Chá ou café por dia')).toBeVisible()
})

test('suplemento e pedido de exames saem nas folhas de imprimir', async ({ page }) => {
  await abrirFichaNova(page)
  const suplementos = page.getByRole('region', { name: 'Suplementação prescrita' })
  await suplementos.getByRole('button', { name: 'Adicionar suplemento' }).click()
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
  await page.getByRole('region', { name: 'Suplementação prescrita' }).getByRole('button', { name: 'Adicionar suplemento' }).click()
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Motivo da consulta/ }).click()
  // Spec conduta-da-nutricionista, CA-938, e ficha-unica, CA-1063: a escala da urina, a de Bristol e as escolhas cabem.
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Hidratação/ }).click()
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Digestão/ }).click()
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Alimentação/ }).click()
  await page.getByRole('region', { name: 'Anamnese' }).getByRole('button', { name: /^Saúde da mulher/ }).click()
  await expect(page.getByRole('radiogroup', { name: 'Cor da urina' }).getByRole('radio')).toHaveCount(8)

  const larguras = await page.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: document.documentElement.clientWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)

  // No celular, o histórico (com Novo plano) e o peso vêm antes dos cartões longos; Excluir paciente é o último.
  const topo = async (alvo: Locator) => (await alvo.boundingBox())?.y ?? Number.NaN
  const historico = await topo(page.getByText('Histórico de planos'))
  const peso = await topo(page.getByText('Evolução do peso'))
  const anamneseTopo = await topo(page.getByRole('heading', { name: 'Anamnese' }))
  const exames = await topo(page.getByRole('heading', { name: 'Pedido de exames' }))
  const apagar = await topo(page.getByRole('heading', { name: 'Excluir paciente' }))
  expect(historico).toBeLessThan(anamneseTopo)
  expect(peso).toBeLessThan(anamneseTopo)
  expect(apagar).toBeGreaterThan(exames)

  for (const nome of ['Anamnese', 'Suplementação prescrita', 'Pedido de exames']) {
    const regiao = page.getByRole('region', { name: nome })
    for (const alvo of await regiao.locator('button:visible, label:visible:has(input[type="checkbox"])').all()) {
      const caixa = await alvo.boundingBox()
      expect(caixa?.height ?? 0, `${nome}: ${await alvo.textContent()}`).toBeGreaterThanOrEqual(44)
    }
  }

  // A janela dos modelos, com um modelo de detalhe longo: Usar e Excluir continuam dentro da tela.
  const suplementos = page.getByRole('region', { name: 'Suplementação prescrita' })
  await suplementos.getByLabel('Nome').fill('Vitamina D3')
  await suplementos.getByLabel('Dose').fill('1 cápsula de 2.000 UI')
  await suplementos.getByLabel('Horário').fill('No almoço, junto da comida')
  await suplementos.getByRole('button', { name: 'Salvar como modelo' }).click()
  await suplementos.getByRole('button', { name: 'Modelos' }).click()
  const janela = page.getByRole('dialog', { name: 'Modelos de suplemento' })
  for (const botao of [janela.getByRole('button', { name: 'Usar Vitamina D3' }), janela.getByRole('button', { name: 'Excluir o modelo Vitamina D3' })]) {
    const caixa = await botao.boundingBox()
    expect((caixa?.x ?? 999) + (caixa?.width ?? 0)).toBeLessThanOrEqual(360)
  }
})

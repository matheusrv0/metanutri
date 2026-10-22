import { expect, test, type Page } from '@playwright/test'

// Correção C da rodada "cuidado total" (22/10/2026): o que só o navegador de verdade mostra (larguras e cortes).

const abrirPlanoRapido = async (pagina: Page, largura: number) => {
  await pagina.setViewportSize({ width: largura, height: 900 })
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Novo plano' }).first().click()
  await pagina.getByRole('menuitem', { name: /Prescrição rápida/ }).click()
  await pagina.getByLabel('Nome do plano').fill('João, 35 anos')
  await pagina.getByRole('radio', { name: 'Masculino' }).click()
  await pagina.getByLabel('Idade', { exact: true }).fill('35')
  await pagina.getByRole('button', { name: /Próxima etapa: Refeições/ }).click()
}

const adicionar = async (pagina: Page, refeicao: string, entrada: string, nome: RegExp) => {
  const campo = pagina.getByRole('combobox', { name: `Adicionar alimento em Principal de ${refeicao}` })
  await campo.fill(entrada)
  await pagina.getByRole('option', { name: nome }).first().click()
}

for (const largura of [390, 360]) {
  test(`CA-1329: a ${largura} px, a linha do plano mostra o nome e a medida inteiros, e as abas cabem`, async ({ page }) => {
    await abrirPlanoRapido(page, largura)
    await adicionar(page, 'Café da manhã', '2 ovos cozidos', /Ovo, de galinha, inteiro, cozido/)
    await adicionar(page, 'Café da manhã', '1 copo americano de leite integral', /Leite, de vaca, integral/)
    const lista = page.getByRole('list', { name: 'Alimentos em Principal de Café da manhã' })
    await expect(lista.getByRole('listitem')).toHaveCount(2)

    // O nome quebra linha: nada é cortado com reticências.
    for (const nome of await lista.locator('li > div:first-child > p:first-child').all()) {
      const cortado = await nome.evaluate((el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === 'ellipsis')
      expect(cortado, await nome.textContent()).toBe(false)
    }
    await expect(lista).toContainText('Ovo, de galinha, inteiro, cozido/10minutos')

    // O texto escolhido no seletor de medida cabe nele (o nome da medida e o peso).
    for (const seletor of await lista.getByRole('combobox', { name: /^Medida de / }).all()) {
      const cabe = await seletor.evaluate((el) => {
        const select = el as HTMLSelectElement
        const texto = select.selectedOptions[0]?.textContent ?? ''
        const estilo = getComputedStyle(select)
        const contexto = document.createElement('canvas').getContext('2d')
        if (!contexto) return false
        contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`
        const largo = contexto.measureText(texto).width + Number.parseFloat(estilo.paddingLeft) + Number.parseFloat(estilo.paddingRight) + 20
        return largo <= select.clientWidth
      })
      expect(cabe, await seletor.inputValue()).toBe(true)
    }

    // As três abas cabem, sem rolagem.
    const abas = page.getByRole('tablist', { name: 'Opções de Café da manhã' })
    const rola = await abas.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
    expect(rola).toBe(false)
    const caixa = await abas.boundingBox()
    for (const aba of await abas.getByRole('tab').all()) {
      const b = await aba.boundingBox()
      expect(b && caixa ? b.x + b.width : 0).toBeLessThanOrEqual((caixa?.x ?? 0) + (caixa?.width ?? 0) + 1)
    }
    const paginaRola = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(paginaRola).toBe(false)
  })
}

import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec ajustes-mobile, acabamento (29/10/2026): o que sobrou das falhas M-018, M-021 e M-025 depois das três rodadas,
// no app em modo local, com o plano de exemplo.

test.use({ reducedMotion: 'reduce' })

const REFEICAO_LONGA = 'Almoço de domingo na casa da sogra (com sobremesa liberada)'

/** Navegador limpo, sem o aviso de primeiro acesso, com o plano de exemplo aberto na etapa 2. Devolve o id do plano. */
async function abrirComExemplo(pagina: Page): Promise<string> {
  await pagina.goto('/#/painel')
  await pagina.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('metanutri:aviso-inicial-visto', '1')
  })
  await pagina.reload()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).click()
  await expect(pagina).toHaveURL(/#\/caso\/[^/]+\/plano$/)
  return decodeURIComponent(pagina.url().split('#/caso/')[1]?.split('/')[0] ?? '')
}

const caixa = async (alvo: Locator) => {
  await alvo.scrollIntoViewIfNeeded()
  const c = await alvo.boundingBox()
  return { largura: c?.width ?? 0, altura: c?.height ?? 0 }
}
const letra = (alvo: Locator) => alvo.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))

test.describe('No tablet de toque (768 px)', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })

  test('M-018: opções em pílula, seletor segmentado, caixa de texto e o "Fechar" da gaveta têm o tamanho do toque', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    expect((await caixa(page.getByRole('radio', { name: 'Medida e gramas' }))).altura, 'opção em pílula').toBeGreaterThanOrEqual(44)
    // A auditoria final achou mais estes, com a densidade de computador só pela largura.
    expect((await caixa(page.getByRole('tab', { name: /^Principal/ }).first())).altura, 'aba da refeição').toBeGreaterThanOrEqual(44)
    expect((await caixa(page.getByRole('combobox', { name: /^Medida de / }).first())).altura, 'medida caseira').toBeGreaterThanOrEqual(44)
    await page.goto('/#/ajuda')
    expect((await caixa(page.getByRole('button', { name: 'Ir', exact: true }).first())).altura, 'Ir da Ajuda').toBeGreaterThanOrEqual(44)
    await page.goto(`/#/caso/${casoId}/caso`)
    expect(await letra(page.getByLabel('Orientações nutricionais')), 'letra da caixa de texto').toBe(16)

    await page.goto(`/#/caso/${casoId}/adequacao`)
    const segmento = page.getByRole('radiogroup', { name: 'Tipo de referência' }).getByRole('radio').first()
    expect((await caixa(segmento)).altura, 'seletor segmentado').toBeGreaterThanOrEqual(44)

    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    const fechar = await caixa(page.getByRole('dialog').getByRole('button', { name: 'Fechar' }))
    expect(fechar.altura, 'altura do Fechar da gaveta').toBeGreaterThanOrEqual(44)
    expect(fechar.largura, 'largura do Fechar da gaveta').toBeGreaterThanOrEqual(44)
  })
})

test.describe('No computador (1280 px, mouse): a densidade de hoje', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('M-018: com mouse, a opção em pílula, o segmento e a letra da caixa de texto não mudam', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    expect((await caixa(page.getByRole('radio', { name: 'Medida e gramas' }))).altura).toBeLessThan(44)
    await page.goto(`/#/caso/${casoId}/caso`)
    expect(await letra(page.getByLabel('Orientações nutricionais'))).toBe(14)
    await page.goto(`/#/caso/${casoId}/adequacao`)
    expect((await caixa(page.getByRole('radiogroup', { name: 'Tipo de referência' }).getByRole('radio').first())).altura).toBeLessThan(44)
  })
})

test.describe('No celular (360 px, toque)', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

  test('Cobrir: "Adicionar em" mostra o nome inteiro da refeição, e a caixa da porção máxima tem o raio do sistema', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    await page.getByRole('textbox', { name: 'Nome da refeição Almoço' }).fill(REFEICAO_LONGA)
    await page.goto(`/#/caso/${casoId}/adequacao`)
    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    const gaveta = page.getByRole('dialog')
    const destino = gaveta.getByLabel('Adicionar em')
    const valor = await destino.locator('option', { hasText: REFEICAO_LONGA }).getAttribute('value')
    await destino.selectOption(valor ?? '')
    // O nome escolhido aparece inteiro na caixa, quebrando a linha, dentro da gaveta.
    const visivel = gaveta.getByText(new RegExp(`${REFEICAO_LONGA.replace(/[()]/g, '\\$&')}$`)).filter({ visible: true }).first()
    const medida = await visivel.evaluate((el) => {
      const gav = el.closest('[role=dialog]')?.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return { corta: el.scrollWidth - el.clientWidth, cortaEmbaixo: el.scrollHeight - el.clientHeight, passa: r.right - (gav?.right ?? 0), tag: el.tagName }
    })
    expect(medida.tag, 'o nome está num texto à vista, não só na lista nativa').not.toBe('OPTION')
    expect(medida.corta, 'o nome é cortado de lado').toBeLessThanOrEqual(1)
    expect(medida.cortaEmbaixo, 'o nome é cortado embaixo').toBeLessThanOrEqual(1)
    expect(medida.passa, 'o nome passa da gaveta').toBeLessThanOrEqual(0.5)
    expect((await caixa(destino)).altura, 'o seletor continua com 44 px de toque').toBeGreaterThanOrEqual(44)

    const raio = await gaveta.getByText('Incluir ingredientes e alimentos crus').evaluate((el) => {
      const caixaDaPorcao = el.closest('label')?.parentElement
      return caixaDaPorcao ? Number.parseFloat(getComputedStyle(caixaDaPorcao).borderTopLeftRadius) : 0
    })
    expect(raio, 'a caixa da porção máxima tem canto reto').toBeGreaterThan(0)
  })

  test('M-021: o contador do menu lateral tem letra de 12 px', async ({ page }) => {
    await abrirComExemplo(page)
    await page.goto('/#/painel')
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const contador = page.getByRole('navigation', { name: 'Menu principal' }).getByText(/^\d+ (caso|casos|plano|planos)$/).first()
    expect(await letra(contador)).toBeGreaterThanOrEqual(12)
  })
})

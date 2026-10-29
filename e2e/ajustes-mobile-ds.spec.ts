import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec ajustes-mobile (auditoria de 29/10/2026): as falhas do design system que aparecem no celular e no tablet. Cada
// teste cita a falha (M-xxx) que ele prende. O app abre no modo local, com o plano de exemplo.

// As medidas de caixa não podem cair no meio da animação de abrir (globals.css, prefers-reduced-motion).
test.use({ reducedMotion: 'reduce' })

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

/** Troca o nome do plano de exemplo e recarrega. */
async function renomearPlano(pagina: Page, casoId: string, nome: string): Promise<void> {
  await pagina.evaluate(
    ({ casoId, nome }) => {
      const chave = `metanutri:caso:${casoId}`
      const registro = JSON.parse(localStorage.getItem(chave) ?? '{}') as { caso: { nome: string } }
      registro.caso.nome = nome
      localStorage.setItem(chave, JSON.stringify(registro))
    },
    { casoId, nome },
  )
  await pagina.reload()
}

/** O texto cabe inteiro na própria caixa: nada cortado de lado nem embaixo. */
const textoInteiro = (alvo: Locator) => alvo.evaluate((el) => ({ deLado: el.scrollWidth <= el.clientWidth + 1, embaixo: el.scrollHeight <= el.clientHeight + 1 }))

/** A caixa inteira dentro da largura da tela. */
const dentroDaTela = async (pagina: Page, alvo: Locator) => {
  const caixa = await alvo.boundingBox()
  const largura = await pagina.evaluate(() => document.documentElement.clientWidth)
  expect(caixa, 'sem caixa').not.toBeNull()
  expect(caixa?.x ?? -1, 'passa da esquerda').toBeGreaterThanOrEqual(0)
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0), 'passa da direita').toBeLessThanOrEqual(largura + 0.5)
}

/**
 * A área que, tocada, cai no elemento: varre a linha e a coluna do centro. Conta a área invisível de um
 * pseudo-elemento, que o dedo também acerta (o mesmo método de revisao-geral-trabalho.spec.ts).
 */
const areaDeToque = async (alvo: Locator) => {
  await alvo.scrollIntoViewIfNeeded()
  return alvo.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const acerta = (x: number, y: number) => {
      const achado = document.elementFromPoint(x, y)
      return achado !== null && (el === achado || el.contains(achado))
    }
    let altura = 0
    for (let y = Math.floor(cy - 40); y <= cy + 40; y += 1) if (acerta(cx, y)) altura += 1
    let largura = 0
    for (let x = Math.floor(cx - 40); x <= cx + 40; x += 1) if (acerta(x, cy)) largura += 1
    return { altura, largura }
  })
}

const altura = async (alvo: Locator) => (await alvo.boundingBox())?.height ?? 0
const letra = (alvo: Locator) => alvo.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))

test.describe('No celular (360 px, toque)', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

  test('M-006: "Planos recentes" mostra o nome do plano e o detalhe inteiros, em até duas linhas', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    const nome = 'Ana Beatriz — retorno de outubro'
    await renomearPlano(page, casoId, nome)
    await page.goto('/#/painel')
    const recentes = page.getByRole('list', { name: 'Planos recentes' })
    const titulo = recentes.getByText(nome, { exact: true })
    await expect(titulo).toBeVisible()
    expect(await textoInteiro(titulo)).toEqual({ deLado: true, embaixo: true })
    expect(await titulo.getAttribute('title')).toBe(nome)
    const detalhe = recentes.getByText(/· (prescrição rápida|atendimento completo)$/)
    expect(await textoInteiro(detalhe)).toEqual({ deLado: true, embaixo: true })
  })

  test('M-009: o menu "Novo plano" cabe na tela e a descrição quebra em vez de ser cortada', async ({ page }) => {
    await abrirComExemplo(page)
    await page.goto('/#/casos')
    await page.getByRole('button', { name: 'Novo plano' }).first().click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await dentroDaTela(page, menu)
    const descricao = menu.getByText('Sem avaliação antropométrica. Peso e estatura são opcionais.')
    await dentroDaTela(page, descricao)
    expect(await textoInteiro(descricao)).toEqual({ deLado: true, embaixo: true })
  })

  test('M-019: o interruptor tem área de toque de 44 × 44 px', async ({ page }) => {
    await abrirComExemplo(page)
    await page.getByRole('button', { name: 'Exportar' }).click()
    await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
    const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
    for (const nome of ['Lista de compras', 'Trocas']) {
      const chave = janela.getByRole('switch', { name: nome })
      const area = await areaDeToque(chave)
      expect(area.altura, `altura de ${nome}`).toBeGreaterThanOrEqual(44)
      expect(area.largura, `largura de ${nome}`).toBeGreaterThanOrEqual(44)
    }
    // O toque na área nova liga a chave, como o toque nela.
    const chave = janela.getByRole('switch', { name: 'Trocas' })
    const antes = await chave.getAttribute('aria-checked')
    const caixa = await chave.boundingBox()
    if (caixa) await page.touchscreen.tap(caixa.x + caixa.width / 2, caixa.y - 8)
    await expect(chave).not.toHaveAttribute('aria-checked', antes ?? '')
  })

  test('M-020: os itens do menu lateral têm 44 px', async ({ page }) => {
    await abrirComExemplo(page)
    await page.goto('/#/painel')
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Menu principal' })
    for (const nome of ['Painel', 'Adesão', 'Tabela de alimentos', 'Meus alimentos', 'Receitas', 'Configurações', 'Ajuda']) {
      expect(await altura(menu.getByRole('button', { name: nome, exact: true })), nome).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('No tablet de toque (768 px)', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })

  test('M-018: botões, campos, itens de menu e o "Fechar" das janelas têm 44 px', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    expect(await altura(page.getByRole('button', { name: 'Exportar' })), 'Exportar').toBeGreaterThanOrEqual(44)
    expect(await altura(page.getByRole('button', { name: 'Modelos de plano' })), 'Modelos de plano').toBeGreaterThanOrEqual(44)
    // O botão de tamanho padrão: o "Próxima etapa" do fim da etapa 1.
    await page.goto(`/#/caso/${casoId}/caso`)
    expect(await altura(page.getByRole('button', { name: /^Próxima etapa/ })), 'Próxima etapa').toBeGreaterThanOrEqual(44)
    await page.goto(`/#/caso/${casoId}/plano`)

    await page.getByRole('button', { name: 'Exportar' }).click()
    for (const item of await page.getByRole('menuitem').all()) expect(await altura(item), await item.textContent() ?? '').toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Modelos de plano' }).click()
    const fechar = page.getByRole('dialog', { name: 'Modelos de plano' }).getByRole('button', { name: 'Fechar' }).last()
    const caixa = await fechar.boundingBox()
    expect(caixa?.height ?? 0, 'altura do Fechar').toBeGreaterThanOrEqual(44)
    expect(caixa?.width ?? 0, 'largura do Fechar').toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/caso`)
    const campo = page.getByLabel('Nome do plano')
    expect(await altura(campo), 'altura do campo').toBeGreaterThanOrEqual(44)
    expect(await letra(campo), 'letra do campo').toBe(16)

    await page.goto('/#/painel')
    const abrir = page.getByRole('list', { name: 'Planos recentes' }).getByRole('button', { name: 'Abrir' }).first()
    expect(await altura(abrir), 'botão pequeno').toBeGreaterThanOrEqual(44)
  })

  test('M-027: as etapas do plano mostram a descrição inteira', async ({ page }) => {
    await abrirComExemplo(page)
    const etapas = page.getByRole('navigation', { name: 'Etapas do plano' })
    for (const descricao of ['Dados, medidas e energia', 'Alimentos, substitutos e orientações', 'Vitaminas, minerais e fibra']) {
      const texto = etapas.getByText(descricao, { exact: true })
      await expect(texto).toBeVisible()
      expect(await textoInteiro(texto), descricao).toEqual({ deLado: true, embaixo: true })
    }
  })
})

test.describe('No computador (1280 px, mouse): a densidade de hoje', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('M-018: botão de 40 px, botão pequeno de 32 px, campo de 40 px com letra de 14 px e o "Fechar" pequeno', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    expect(await altura(page.getByRole('button', { name: 'Exportar' }))).toBe(32)
    await page.getByRole('button', { name: 'Modelos de plano' }).click()
    const fechar = page.getByRole('dialog', { name: 'Modelos de plano' }).getByRole('button', { name: 'Fechar' }).last()
    expect(await altura(fechar)).toBeLessThan(40)
    await page.keyboard.press('Escape')
    await page.goto(`/#/caso/${casoId}/caso`)
    const campo = page.getByLabel('Nome do plano')
    expect(await altura(campo)).toBe(40)
    expect(await letra(campo)).toBe(14)
    expect(await altura(page.getByRole('button', { name: /^Próxima etapa/ }))).toBe(40)
    await page.goto('/#/painel')
    expect(await altura(page.getByRole('list', { name: 'Planos recentes' }).getByRole('button', { name: 'Abrir' }).first())).toBe(32)
  })

  test('M-027: as etapas do plano mostram a descrição inteira também com o menu lateral', async ({ page }) => {
    await abrirComExemplo(page)
    const texto = page.getByRole('navigation', { name: 'Etapas do plano' }).getByText('Alimentos, substitutos e orientações', { exact: true })
    expect(await textoInteiro(texto)).toEqual({ deLado: true, embaixo: true })
  })
})

import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec revisao-geral-trabalho: a área de trabalho no celular e no computador.

const NOME_LONGO = 'Maria Aparecida dos Santos Albuquerque de Oliveira Nascimento Ferreira'

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

/** Um paciente com o nome dado, ligado ao plano de exemplo, que passa a ter o mesmo nome. Recarrega. */
async function semearNome(pagina: Page, casoId: string, nome: string): Promise<void> {
  await pagina.evaluate(
    ({ casoId, nome }) => {
      const agora = new Date().toISOString()
      localStorage.setItem('metanutri:pacientes', JSON.stringify([{ id: 'pac-longo', nome, criadoEm: agora, atualizadoEm: agora }]))
      const chave = `metanutri:caso:${casoId}`
      const registro = JSON.parse(localStorage.getItem(chave) ?? '{}') as { caso: { nome: string; pacienteId: string | null } }
      registro.caso.nome = nome
      registro.caso.pacienteId = 'pac-longo'
      localStorage.setItem(chave, JSON.stringify(registro))
    },
    { casoId, nome },
  )
  await pagina.reload()
}

/** O que passa da largura da tela sem estar dentro de algo que rola de lado de propósito. */
const vazaDaTela = (pagina: Page) =>
  pagina.evaluate(() => {
    const largura = document.documentElement.clientWidth
    const rolaDeLado = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX
        if (ox === 'auto' || ox === 'scroll') return true
      }
      return false
    }
    return [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 2 && r.right > largura + 1 && getComputedStyle(el).position !== 'fixed' && !rolaDeLado(el)
      })
      .map((el) => `${el.tagName.toLowerCase()} ${(el.textContent ?? '').trim().slice(0, 40)}`)
  })

const dentroDaTela = async (pagina: Page, nome: string | RegExp) => {
  const caixa = await pagina.getByRole('button', { name: nome }).first().boundingBox()
  const largura = await pagina.evaluate(() => document.documentElement.clientWidth)
  expect(caixa).not.toBeNull()
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(largura)
}

test.describe('Nome longo não alarga a tela (D-245)', () => {
  for (const largura of [360, 390]) {
    test(`CA-785, CA-786 e CA-787: paciente e plano com 70 letras em ${largura} px`, async ({ page }) => {
      const casoId = await abrirComExemplo(page)
      await semearNome(page, casoId, NOME_LONGO)
      await page.setViewportSize({ width: largura, height: 800 })

      await page.goto('/#/pacientes')
      await expect(page.getByRole('list', { name: 'Pacientes' })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
      await dentroDaTela(page, `Abrir ${NOME_LONGO}`)

      await page.goto('/#/casos')
      await expect(page.getByRole('list', { name: 'Planos salvos' })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
      await dentroDaTela(page, `Abrir ${NOME_LONGO}`)

      await page.goto(`/#/caso/${casoId}/caso`)
      await expect(page.getByLabel('Paciente', { exact: true })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
    })
  }

  test('CB-245: um nome de uma palavra só, com 80 letras, também corta', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    await semearNome(page, casoId, 'A'.repeat(80))
    await page.setViewportSize({ width: 360, height: 800 })
    for (const rota of ['/#/pacientes', '/#/casos', `/#/caso/${casoId}/caso`]) {
      await page.goto(rota)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await vazaDaTela(page)).toEqual([])
    }
  })
})

test.describe('Ctrl+P imprime a tela (D-240)', () => {
  test('CA-770: sem janela de impressão, o papel tem o título e a etapa, sem o menu e sem os botões do cabeçalho', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const casoId = await abrirComExemplo(page)
    for (const aba of ['caso', 'plano', 'adequacao']) {
      await page.goto(`/#/caso/${casoId}/${aba}`)
      await expect(page.getByRole('navigation', { name: 'Etapas do plano' })).toBeVisible()
      await page.emulateMedia({ media: 'print' })
      await expect(page.getByRole('heading', { level: 1, name: 'Exemplo — Maria, 28 anos' })).toBeVisible()
      await expect(page.locator('#conteudo')).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Etapas do plano' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeHidden()
      await expect(page.getByRole('button', { name: 'Exportar' })).toBeHidden()
      await page.emulateMedia({ media: 'screen' })
    }
  })

  test('CA-771: com "Dieta para imprimir" aberta, só a folha vai para o papel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await abrirComExemplo(page)
    await page.getByRole('button', { name: 'Exportar' }).click()
    await page.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
    const janela = page.getByRole('dialog', { name: 'Dieta para imprimir' })
    await expect(janela.getByRole('heading', { name: 'Plano alimentar' })).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(janela.getByRole('heading', { name: 'Plano alimentar' })).toBeVisible()
    await expect(page.locator('#conteudo')).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Exemplo — Maria, 28 anos' })).toBeHidden()
  })

  test('CB-240: Tabela de alimentos e "Plano não encontrado" não saem em branco', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await abrirComExemplo(page)
    for (const [rota, titulo] of [
      ['/#/alimentos', 'Tabela de alimentos'],
      ['/#/caso/nao-existe/caso', 'Plano não encontrado'],
    ] as const) {
      await page.goto(rota)
      await page.emulateMedia({ media: 'print' })
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
      await expect(page.locator('#conteudo')).toBeVisible()
      await page.emulateMedia({ media: 'screen' })
    }
  })
})

test('CA-778: no computador, o Painel tem um "Novo plano" só; no celular, o do cabeçalho continua', async ({ page }) => {
  await abrirComExemplo(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/#/painel')
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo plano' }).locator('visible=true')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 800 })
  await expect(page.getByRole('banner').getByRole('button', { name: 'Novo plano' })).toBeVisible()
})

test('CA-789: produto apagado em Meus produtos não derruba o plano que o usa', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  const casoId = await abrirComExemplo(page)
  // Um produto do rótulo no desjejum do plano de exemplo.
  await page.evaluate((casoId) => {
    const produto = {
      id: 900_001,
      codigoBarras: '',
      nome: 'Granola da casa',
      marca: 'Marca Exemplo',
      porcaoG: 40,
      medidaCaseira: '4 colheres de sopa',
      porPorcao: { energia_kcal: 160, carboidrato_g: 26, proteina_g: 4, lipideos_g: 5, fibra_g: 3, sodio_mg: 20 },
      criadoEm: new Date().toISOString(),
    }
    localStorage.setItem('metanutri:produtos', JSON.stringify([produto]))
    const chave = `metanutri:caso:${casoId}`
    const registro = JSON.parse(localStorage.getItem(chave) ?? '{}') as { plano: { refeicoes: { opcoes: { principal: unknown[] } }[] } }
    registro.plano.refeicoes[0]?.opcoes.principal.push({ id: 'granola', alimentoId: 900_001, gramas: 40 })
    localStorage.setItem(chave, JSON.stringify(registro))
  }, casoId)
  await page.reload()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Desjejum' })).toContainText('Granola da casa (Marca Exemplo)')

  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Excluir Granola da casa' }).click()
  const aviso = page.getByRole('alertdialog', { name: 'Excluir “Granola da casa”?' })
  await expect(aviso).toContainText('passa a mostrar “Produto apagado” nessa linha')
  await aviso.getByRole('button', { name: 'Excluir produto' }).click()

  for (const aba of ['caso', 'plano', 'adequacao']) {
    await page.goto(`/#/caso/${casoId}/${aba}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Exemplo — Maria, 28 anos' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Etapas do plano' })).toBeVisible()
  }
  await page.goto(`/#/caso/${casoId}/plano`)
  await expect(page.getByText('Produto apagado', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Desjejum' })).toContainText('— kcal')
  // O Cobrir e o Exportar continuam funcionando.
  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
  await expect(page.getByRole('dialog', { name: 'Dieta para imprimir' }).getByRole('heading', { name: 'Plano alimentar' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Exportar' }).click()
  const baixando = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Aconselhamento em Word' }).click()
  expect((await baixando).suggestedFilename()).toMatch(/aconselhamento\.docx$/)
  await page.goto(`/#/caso/${casoId}/adequacao`)
  await page.getByRole('button', { name: /^Cobrir / }).first().click()
  await expect(page.getByRole('dialog')).toContainText('para a meta')
  expect(erros).toEqual([])
})

/**
 * A área que, tocada, cai no elemento: varre a linha e a coluna do centro. Conta o rótulo do campo e a área invisível
 * de um pseudo-elemento, que o dedo também acerta.
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

const alvoDe44 = async (alvo: Locator, comLargura = false) => {
  const { altura, largura } = await areaDeToque(alvo)
  expect(altura, `altura de ${await alvo.textContent()}`).toBeGreaterThanOrEqual(44)
  if (comLargura) expect(largura, `largura de ${await alvo.textContent()}`).toBeGreaterThanOrEqual(44)
}

test.describe('Alvo de toque de 44 px no celular (D-246)', () => {
  test('CA-788: o "Fechar" das janelas e da gaveta e as opções em pílula', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    await page.setViewportSize({ width: 390, height: 800 })

    await page.getByRole('button', { name: 'Modelos de plano' }).click()
    // O X do canto (o outro "Fechar" é o botão do rodapé).
    await alvoDe44(page.getByRole('dialog', { name: 'Modelos de plano' }).getByRole('button', { name: 'Fechar' }).last(), true)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Exportar' }).click()
    await page.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
    await alvoDe44(page.getByRole('dialog', { name: 'Dieta para imprimir' }).getByRole('button', { name: 'Fechar' }).last(), true)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/adequacao`)
    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    await alvoDe44(page.getByRole('dialog').getByRole('button', { name: 'Fechar' }), true)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/caso`)
    for (const opcao of ['Feminino', 'Masculino', 'Emagrecer', 'Nenhuma', 'Sedentário (1,2)']) await alvoDe44(page.getByRole('radio', { name: opcao }))
    await page.goto('/#/pacientes')
    await page.getByRole('button', { name: 'Novo paciente' }).click()
    await alvoDe44(page.getByRole('radio', { name: 'Feminino' }))
    await page.goto('/#/config')
    await alvoDe44(page.getByRole('radio', { name: 'Estudante' }))

    // No computador, nada muda de tamanho.
    await page.setViewportSize({ width: 1280, height: 900 })
    const caixa = await page.getByRole('radio', { name: 'Estudante' }).boundingBox()
    expect(caixa?.height ?? 0).toBeLessThan(40)
  })

  test('CA-790: a trilha, o Exportar, a Ajuda, "Ver as fontes" e o interruptor do Cobrir', async ({ page }) => {
    const casoId = await abrirComExemplo(page)
    await page.setViewportSize({ width: 390, height: 800 })

    await alvoDe44(page.getByRole('navigation', { name: 'Você está em' }).getByRole('button', { name: 'Planos' }))

    await page.getByRole('button', { name: 'Exportar' }).click()
    for (const item of await page.getByRole('menuitem').all()) await alvoDe44(item)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/caso`)
    await alvoDe44(page.getByRole('button', { name: /^Ver as \d+ fontes$/ }))

    await page.goto(`/#/caso/${casoId}/adequacao`)
    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    await alvoDe44(page.getByRole('dialog').locator('label').filter({ hasText: 'Incluir ingredientes e alimentos crus' }))
    await page.keyboard.press('Escape')

    await page.goto('/#/ajuda')
    for (const ir of await page.getByRole('button', { name: 'Ir', exact: true }).all()) await alvoDe44(ir, true)
    for (const abrir of await page.getByRole('link', { name: 'Abrir' }).all()) await alvoDe44(abrir)
    await alvoDe44(page.getByRole('button', { name: 'Ir para Configurações' }))
  })
})

test('CA-795: no celular, cada opção do seletor de referência fica numa linha só', async ({ page }) => {
  const casoId = await abrirComExemplo(page)
  for (const largura of [360, 390]) {
    await page.setViewportSize({ width: largura, height: 800 })
    await page.goto(`/#/caso/${casoId}/adequacao`)
    const grupo = page.getByRole('radiogroup', { name: 'Tipo de referência' })
    for (const opcao of ['Individual (RDA, 90%)', 'Coletivo (EAR, 50%)', 'Personalizado']) {
      const caixa = await grupo.getByRole('radio', { name: opcao }).boundingBox()
      expect(caixa?.height ?? 0, opcao).toBeLessThanOrEqual(48)
    }
    expect(await vazaDaTela(page)).toEqual([])
    await grupo.getByRole('radio', { name: 'Personalizado' }).click()
    await expect(page.getByLabel('Mínimo da meta')).toBeVisible()
  }
})

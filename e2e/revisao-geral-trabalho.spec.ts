import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec revisao-geral-trabalho: a área de trabalho no celular e no computador.

const NOME_LONGO = 'Maria Aparecida dos Santos Albuquerque de Oliveira Nascimento Ferreira'

// As medidas de caixa (o "Fechar" da janela, a área de toque) não podem cair no meio da animação de abrir: com a
// animação reduzida, o site a encurta para quase zero (globals.css, prefers-reduced-motion).
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

/** O botão inteiro dentro da largura da tela, medido num só momento. */
const dentroDaTela = async (pagina: Page, nome: string | RegExp) => {
  const medida = await pagina
    .getByRole('button', { name: nome })
    .first()
    .evaluate((el) => ({ direita: el.getBoundingClientRect().right, largura: document.documentElement.clientWidth }))
  expect(medida.direita).toBeLessThanOrEqual(medida.largura)
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

  test('CA-770 (revisão de 20/10/2026): o papel da tela tem 14 mm em cima e embaixo de toda página; a folha continua como era', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await abrirComExemplo(page)
    // O @page zera a margem de cima da 1ª página e a de baixo de todas (é a regra da folha, CA-636 e CA-637): os 14 mm
    // voltam por um espaço no começo e por outro que se repete no pé de cada página (box-decoration-break: clone).
    // A emulação de mídia não pagina; a distância no PDF de verdade foi medida à parte (relatório da frente).
    const espacos = () =>
      page.evaluate(() => {
        const raiz = document.getElementById('root')
        if (!raiz) return null
        const cs = getComputedStyle(raiz)
        return {
          quebra: cs.boxDecorationBreak,
          pe: Number.parseFloat(cs.paddingBottom),
          topo: Number.parseFloat(getComputedStyle(raiz, '::before').height) || 0,
        }
      })
    await page.emulateMedia({ media: 'print' })
    // M-8 (revisão da spec site-publico-profissional): este arquivo usa movimento reduzido, e a regra global põe uma
    // transição de 0,01 ms em tudo; o padding vai de 0 a 14 mm nessa transição, e a leitura logo depois de emular a
    // impressão pegava o 0. A leitura espera o valor assentar. 14 mm = 52,9 px.
    await expect.poll(async () => (await espacos())?.pe).toBeCloseTo(52.9, 0)
    await expect.poll(async () => (await espacos())?.topo).toBeCloseTo(52.9, 0)
    expect((await espacos())?.quebra).toBe('clone')
    await page.emulateMedia({ media: 'screen' })

    await page.getByRole('button', { name: 'Exportar' }).click()
    await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
    await expect(page.getByRole('dialog', { name: 'Plano alimentar para imprimir' }).getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect.poll(async () => (await espacos())?.pe).toBe(0)
    await expect.poll(async () => (await espacos())?.topo).toBe(0)
  })

  test('CA-770 (revisão de 20/10/2026): com a gaveta ou uma janela aberta, o papel tem a tela, sem elas e sem o véu escuro', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const casoId = await abrirComExemplo(page)
    await page.goto(`/#/caso/${casoId}/adequacao`)
    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('[data-slot="sheet-overlay"]')).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('[data-slot="sheet-overlay"]')).toBeHidden()
    await expect(page.locator('#conteudo')).toBeVisible()
    await page.emulateMedia({ media: 'screen' })
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/plano`)
    await page.getByRole('button', { name: 'Modelos de plano' }).click()
    await expect(page.locator('[data-slot="dialog-overlay"]')).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('dialog', { name: 'Modelos de plano' })).toBeHidden()
    await expect(page.locator('[data-slot="dialog-overlay"]')).toBeHidden()
    await expect(page.locator('#conteudo')).toBeVisible()
  })

  test('CA-771: com "Plano alimentar para imprimir" aberta, só a folha vai para o papel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await abrirComExemplo(page)
    await page.getByRole('button', { name: 'Exportar' }).click()
    await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
    const janela = page.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
    await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
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
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Café da manhã' })).toContainText('Granola da casa (Marca Exemplo)')

  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Excluir Granola da casa' }).click()
  const aviso = page.getByRole('alertdialog', { name: 'Excluir “Granola da casa”?' })
  await expect(aviso).toContainText('vão mostrar “Alimento excluído” no lugar dele')
  await aviso.getByRole('button', { name: 'Excluir alimento' }).click()

  for (const aba of ['caso', 'plano', 'adequacao']) {
    await page.goto(`/#/caso/${casoId}/${aba}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Exemplo — Maria, 28 anos' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Etapas do plano' })).toBeVisible()
  }
  await page.goto(`/#/caso/${casoId}/plano`)
  await expect(page.getByText('Alimento excluído', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Alimentos em Principal de Café da manhã' })).toContainText('— kcal')
  // O Cobrir e o Exportar continuam funcionando.
  await page.getByRole('button', { name: 'Exportar' }).click()
  await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
  await expect(page.getByRole('dialog', { name: 'Plano alimentar para imprimir' }).getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
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
    await page.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
    await alvoDe44(page.getByRole('dialog', { name: 'Plano alimentar para imprimir' }).getByRole('button', { name: 'Fechar' }).last(), true)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/adequacao`)
    await page.getByRole('button', { name: /^Cobrir / }).first().click()
    await alvoDe44(page.getByRole('dialog').getByRole('button', { name: 'Fechar' }), true)
    await page.keyboard.press('Escape')

    await page.goto(`/#/caso/${casoId}/caso`)
    // Spec ficha-unica: o Objetivo saiu da etapa 1; a gestação e o cálculo da água são pílulas também.
    for (const opcao of ['Feminino', 'Masculino', 'Gestante', 'Sedentário (1,2)', 'Por peso']) await alvoDe44(page.getByRole('radio', { name: opcao }))
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

  test('CA-788 (revisão de 20/10/2026): na gaveta de alimento, o título não encosta no "Fechar" e "100 g" não quebra', async ({ page }) => {
    await abrirComExemplo(page)
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/#/alimentos')
    await page.getByRole('list', { name: 'Alimentos da tabela' }).getByRole('button').first().click()
    const gaveta = page.getByRole('dialog')
    await expect(gaveta).toBeVisible()
    const medida = await gaveta.evaluate((el) => {
      const titulo = el.querySelector('h2')?.getBoundingClientRect()
      const fechar = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Fechar'))?.getBoundingClientRect()
      return { folga: titulo && fechar ? fechar.left - titulo.right : -1, descricao: el.querySelector('p')?.textContent ?? '' }
    })
    expect(medida.folga).toBeGreaterThanOrEqual(8)
    expect(medida.descricao).toContain('100' + String.fromCharCode(0xa0) + 'g')
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

test('CA-795: no celular, cada opção do seletor de referência fica numa linha só e inteira dentro da tela', async ({ page }) => {
  const casoId = await abrirComExemplo(page)
  for (const largura of [360, 390]) {
    await page.setViewportSize({ width: largura, height: 800 })
    await page.goto(`/#/caso/${casoId}/adequacao`)
    const grupo = page.getByRole('radiogroup', { name: 'Tipo de referência' })
    await expect(grupo).toBeVisible()
    // Revisão de 20/10/2026: abaixo de 640 px as opções empilham; tudo medido de uma vez, sem rolar nada.
    const opcoes = await grupo.evaluate((el) => {
      const largura = document.documentElement.clientWidth
      return {
        rolaDeLado: el.scrollWidth > el.clientWidth + 1,
        caixas: [...el.querySelectorAll('[role="radio"]')].map((r) => {
          const c = r.getBoundingClientRect()
          return { nome: (r.textContent ?? '').trim(), altura: c.height, inteira: c.left >= 0 && c.right <= largura }
        }),
      }
    })
    expect(opcoes.rolaDeLado).toBe(false)
    expect(opcoes.caixas.map((c) => c.nome)).toEqual(['Individual (RDA, 90%)', 'Coletivo (EAR, 50%)', 'Personalizado'])
    for (const caixa of opcoes.caixas) {
      expect(caixa.altura, caixa.nome).toBeLessThanOrEqual(48)
      expect(caixa.inteira, caixa.nome).toBe(true)
    }
    expect(await vazaDaTela(page)).toEqual([])
    await grupo.getByRole('radio', { name: 'Personalizado' }).click()
    await expect(page.getByLabel('Mínimo da meta')).toBeVisible()
  }
})

// ---------- CA-797: cada tela da área de trabalho, no celular e no computador ----------

interface Tela {
  readonly nome: string
  /** Abre a tela e devolve o título que ela tem. */
  readonly abrir: (pagina: Page, casoId: string) => Promise<string | RegExp>
  /** A ação principal da tela, com o resultado conferido. */
  readonly agir: (pagina: Page, casoId: string) => Promise<void>
}

const ficha = async (pagina: Page) => {
  await pagina.goto('/#/pacientes')
  await pagina.getByRole('button', { name: 'Novo paciente' }).click()
  await expect(pagina).toHaveURL(/#\/paciente\//)
}

const PLANO = 'Exemplo — Maria, 28 anos'

const TELAS: readonly Tela[] = [
  {
    nome: 'Painel',
    abrir: async (p) => {
      await p.goto('/#/painel')
      return 'Painel'
    },
    agir: async (p) => {
      await p.getByRole('list', { name: 'Planos recentes' }).getByRole('button', { name: 'Abrir' }).first().click()
      await expect(p).toHaveURL(/#\/caso\//)
    },
  },
  {
    nome: 'Pacientes',
    abrir: async (p) => {
      await p.goto('/#/pacientes')
      return 'Pacientes'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Novo paciente' }).click()
      await expect(p).toHaveURL(/#\/paciente\//)
    },
  },
  {
    nome: 'ficha do paciente',
    abrir: async (p) => {
      await ficha(p)
      return 'Paciente sem nome'
    },
    agir: async (p) => {
      await p.getByLabel('Nome', { exact: true }).fill('Joana Prado')
      await expect(p.getByRole('heading', { level: 1, name: 'Joana Prado' })).toBeVisible()
      for (const cartao of ['Dados do paciente', 'Anamnese', 'Conduta', 'Suplementação prescrita', 'Pedido de exames', 'Próxima consulta']) {
        await expect(p.getByRole('heading', { name: cartao, exact: true })).toBeVisible()
      }
    },
  },
  {
    nome: 'Adesão',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/plano`)
      await p.getByRole('button', { name: 'Gerar link do paciente' }).click()
      await p.getByRole('button', { name: 'Já tenho a autorização, gerar link' }).click()
      await expect(p.getByLabel('Endereço do link')).toBeVisible()
      await p.goto('/#/adesao')
      return 'Adesão'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Abrir plano' }).click()
      await expect(p).toHaveURL(/#\/caso\/[^/]+\/plano$/)
    },
  },
  {
    nome: 'Planos',
    abrir: async (p) => {
      await p.goto('/#/casos')
      return 'Planos'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: `Abrir ${PLANO}` }).click()
      await expect(p).toHaveURL(/#\/caso\//)
    },
  },
  {
    nome: 'etapa 1',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/caso`)
      return PLANO
    },
    agir: async (p) => {
      await p.getByLabel('Nome do plano').fill('Maria, retorno')
      await expect(p.getByRole('heading', { level: 1, name: 'Maria, retorno' })).toBeVisible()
    },
  },
  {
    nome: 'etapa 2',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/plano`)
      return PLANO
    },
    agir: async (p) => {
      const itens = p.getByRole('list', { name: 'Alimentos em Principal de Almoço' }).getByRole('listitem')
      const antes = await itens.count()
      const entrada = p.getByRole('combobox', { name: 'Adicionar alimento em Principal de Almoço' })
      await entrada.fill('100 feijao carioca cozido')
      // A lista da busca, não as opções do seletor de medida das linhas que já existem (spec alimentos-e-gramaturas).
      await expect(p.getByRole('listbox', { name: /^Resultados para/ }).getByRole('option').first()).toBeVisible()
      await entrada.press('Enter')
      await expect(itens).toHaveCount(antes + 1)
    },
  },
  {
    nome: 'etapa 3',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/adequacao`)
      return PLANO
    },
    agir: async (p) => {
      await p.getByRole('radio', { name: /Coletivo/ }).click()
      await expect(p.getByText(/meta de 50% da referência/)).toBeVisible()
    },
  },
  {
    nome: 'gaveta do Cobrir',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/adequacao`)
      await p.getByRole('button', { name: /^Cobrir / }).first().click()
      return PLANO
    },
    agir: async (p) => {
      const gaveta = p.getByRole('dialog')
      await gaveta.getByRole('list', { name: 'Sugestões para cobrir' }).getByRole('button', { name: /^Adicionar em / }).first().click()
      await expect(gaveta).toBeHidden()
    },
  },
  {
    nome: 'Modelos de plano',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/plano`)
      await p.getByRole('button', { name: 'Modelos de plano' }).click()
      return PLANO
    },
    agir: async (p) => {
      const janela = p.getByRole('dialog', { name: 'Modelos de plano' })
      await janela.getByLabel('Nome do modelo').fill('Modelo da revisão')
      await janela.getByRole('button', { name: 'Salvar como modelo' }).click()
      await expect(janela.getByRole('list', { name: 'Modelos salvos' })).toContainText('Modelo da revisão')
    },
  },
  {
    nome: 'Exportar e Plano alimentar para imprimir',
    abrir: async (p, casoId) => {
      await p.goto(`/#/caso/${casoId}/plano`)
      await p.getByRole('button', { name: 'Exportar' }).click()
      await expect(p.getByRole('menuitem', { name: 'Memorial de cálculo em Word' })).toBeVisible()
      await p.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
      return PLANO
    },
    agir: async (p) => {
      const janela = p.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
      await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
      const lista = janela.getByRole('switch', { name: 'Lista de compras' })
      if ((await lista.getAttribute('aria-checked')) !== 'true') await lista.click()
      await expect(janela.getByRole('region', { name: 'Lista de compras' })).toBeVisible()
    },
  },
  {
    nome: 'Pedido de exames para imprimir',
    abrir: async (p) => {
      await ficha(p)
      return 'Paciente sem nome'
    },
    agir: async (p) => {
      await p.getByRole('checkbox', { name: 'Hemograma completo' }).check()
      await p.getByRole('button', { name: 'Imprimir pedido' }).click()
      await expect(p.getByRole('dialog', { name: 'Pedido de exames para imprimir' })).toContainText('Hemograma completo')
    },
  },
  {
    nome: 'Tabela de alimentos',
    abrir: async (p) => {
      await p.goto('/#/alimentos')
      return 'Tabela de alimentos'
    },
    agir: async (p) => {
      await p.getByPlaceholder(/Buscar por nome/).fill('brocolis')
      await expect(p.getByText(/Brócolis/).first()).toBeVisible()
    },
  },
  {
    nome: 'Meus alimentos',
    abrir: async (p) => {
      await p.goto('/#/produtos')
      return 'Meus alimentos'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Cadastrar pelo rótulo' }).first().click()
      await expect(p.getByRole('dialog', { name: 'Cadastrar produto pelo rótulo' })).toBeVisible()
    },
  },
  {
    nome: 'Conta e assinatura',
    abrir: async (p) => {
      await p.goto('/#/conta')
      return 'Conta e assinatura'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Ir para o backup' }).click()
      await expect(p).toHaveURL(/#\/config$/)
    },
  },
  {
    nome: 'Configurações',
    abrir: async (p) => {
      await p.goto('/#/config')
      return 'Configurações'
    },
    agir: async (p) => {
      await p.getByLabel('Seu nome').fill('Ana Teste')
      await expect(p.getByText(/Como aparece no documento/)).toContainText('Ana Teste')
    },
  },
  {
    nome: 'Ajuda',
    abrir: async (p) => {
      await p.goto('/#/ajuda')
      return 'Ajuda'
    },
    agir: async (p) => {
      await p.getByRole('button', { name: 'Ir', exact: true }).first().click()
      await expect(p).toHaveURL(/#\/pacientes$/)
    },
  },
]

const rolaDeLado = (pagina: Page) => pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('Cada tela, de ponta a ponta (CA-797)', () => {
  for (const largura of [390, 1280]) {
    for (const tela of TELAS) {
      test(`CA-797: ${tela.nome} em ${largura} px`, async ({ page }) => {
        const erros: string[] = []
        page.on('console', (m) => {
          if (m.type() === 'error') erros.push(m.text())
        })
        page.on('pageerror', (e) => erros.push(e.message))
        const casoId = await abrirComExemplo(page)
        await page.setViewportSize({ width: largura, height: largura < 640 ? 800 : 900 })
        const titulo = await tela.abrir(page, casoId)
        // Com uma janela aberta, o resto da página fica fora da árvore de acessibilidade, mas continua na tela.
        await expect(page.getByRole('heading', { level: 1, name: titulo, includeHidden: true })).toBeVisible()
        expect(await rolaDeLado(page)).toBeLessThanOrEqual(0)
        expect(await vazaDaTela(page)).toEqual([])
        await tela.agir(page, casoId)
        expect(await rolaDeLado(page)).toBeLessThanOrEqual(0)
        expect(erros).toEqual([])
      })
    }
  }
})

test('CA-799: só com o teclado, o primeiro Tab vai a "Pular para o conteúdo", o foco aparece e Esc fecha janela e gaveta', async ({ page }) => {
  const casoId = await abrirComExemplo(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  const anelVisivel = () =>
    page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return false
      const cs = getComputedStyle(el)
      return (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') || cs.boxShadow !== 'none'
    })
  const rotas = ['/#/painel', '/#/pacientes', '/#/adesao', '/#/casos', `/#/caso/${casoId}/caso`, `/#/caso/${casoId}/plano`, `/#/caso/${casoId}/adequacao`, '/#/alimentos', '/#/produtos', '/#/conta', '/#/config', '/#/ajuda']
  for (const rota of rotas) {
    await page.goto(rota)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('Pular para o conteúdo')
    await page.keyboard.press('Tab')
    expect(await anelVisivel(), rota).toBe(true)
  }

  await page.goto(`/#/caso/${casoId}/plano`)
  await page.getByRole('button', { name: 'Modelos de plano' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Modelos de plano' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Modelos de plano' })).toBeHidden()

  await page.goto(`/#/caso/${casoId}/adequacao`)
  await page.getByRole('button', { name: /^Cobrir / }).first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

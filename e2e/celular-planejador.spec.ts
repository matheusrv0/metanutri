import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec ajustes-mobile, grupo C (ficha do caso): M-002, M-003, M-010, M-022, M-023 e M-025 nas larguras da auditoria de
// 29/10/2026 (CA-1800). Os dados entram pela interface, como a nutricionista faria: o plano de exemplo (o conjunto N da
// auditoria) e, para o pior caso (P), gramas de 4 e 5 algarismos e uma refeição de nome comprido.

const CELULARES = [360, 390, 412] as const
const COM_TABLET = [...CELULARES, 768] as const

const abrirLimpo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
}

const abrirExemplo = async (pagina: Page) => {
  await abrirLimpo(pagina)
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).first().click()
  await expect(pagina.getByRole('region', { name: 'Micronutrientes' })).toBeVisible()
}

const semRolagemLateral = async (pagina: Page) => {
  const larguras = await pagina.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: window.innerWidth }))
  expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela)
}

// ------------------------------------------------------------------------------------------------------------- M-002

/**
 * D-803: quanto sobra entre o fim do número digitado e o começo do sufixo (ou o recuo da direita, o que vier antes).
 * Negativo quer dizer que o número entra por baixo do sufixo ou é cortado na borda. O texto é medido com a fonte do
 * próprio campo.
 */
const sobraDoValor = (campo: Locator) =>
  campo.evaluate((el: HTMLInputElement) => {
    const estilo = getComputedStyle(el)
    const regua = document.createElement('span')
    regua.textContent = el.value
    Object.assign(regua.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'pre',
      fontFamily: estilo.fontFamily,
      fontSize: estilo.fontSize,
      fontWeight: estilo.fontWeight,
      fontStyle: estilo.fontStyle,
      fontFeatureSettings: estilo.fontFeatureSettings,
      fontVariantNumeric: estilo.fontVariantNumeric,
      letterSpacing: estilo.letterSpacing,
    })
    document.body.append(regua)
    const texto = regua.getBoundingClientRect().width
    regua.remove()
    const caixa = el.getBoundingClientRect()
    const inicio = caixa.left + el.clientLeft + parseFloat(estilo.paddingLeft)
    const fimDoConteudo = caixa.left + el.clientLeft + el.clientWidth - parseFloat(estilo.paddingRight)
    const sufixo = el.parentElement?.querySelector('span')
    const limite = sufixo ? Math.min(fimDoConteudo, sufixo.getBoundingClientRect().left) : fimDoConteudo
    return limite - (inicio + texto)
  })

for (const largura of COM_TABLET) {
  test.describe(`M-002 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-002: o campo de gramas do plano mostra 1250, 9999 e 12345 inteiros, antes do sufixo', async ({ page }) => {
      await abrirExemplo(page)
      const gramas = page.getByRole('tabpanel', { name: 'Principal de Café da manhã' }).getByRole('textbox', { name: /^Gramas de / }).first()
      for (const valor of ['1250', '9999', '12345']) {
        await gramas.fill(valor)
        expect(await sobraDoValor(gramas), `${valor} no campo de gramas`).toBeGreaterThanOrEqual(0)
      }
      await semRolagemLateral(page)
    })

    test('M-002: no editor de receita, o ingrediente de 1234 g e o de 12345 g aparecem inteiros', async ({ page }) => {
      await abrirLimpo(page)
      await page.goto('/#/receitas')
      await page.getByRole('button', { name: 'Nova receita' }).click()
      const busca = page.getByRole('combobox', { name: 'Adicionar ingrediente' })
      await busca.fill('1234 margarina')
      await expect(page.getByRole('option').first()).toBeVisible()
      await busca.press('Enter')
      const gramas = page.getByRole('textbox', { name: /^Gramas de / }).first()
      await expect(gramas).toHaveValue('1234')
      expect(await sobraDoValor(gramas), '1234 no ingrediente').toBeGreaterThanOrEqual(0)
      await gramas.fill('12345')
      expect(await sobraDoValor(gramas), '12345 no ingrediente').toBeGreaterThanOrEqual(0)
      await semRolagemLateral(page)
    })
  })
}

// ------------------------------------------------------------------------------------------------------------- M-003

/** Os textos que a linha corta (reticências ou corte seco) ou deixa passar da borda dela. */
const textosCortados = (lista: Locator) =>
  lista.evaluate((ul) =>
    [...ul.querySelectorAll<HTMLElement>('li')].flatMap((li) => {
      const linha = li.getBoundingClientRect()
      return [...li.querySelectorAll<HTMLElement>('*')]
        .filter((el) => getComputedStyle(el).display !== 'inline' && (el.textContent ?? '').trim() !== '')
        .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > linha.right + 0.5)
        .map((el) => (el.textContent ?? '').trim())
    }),
  )

for (const largura of COM_TABLET) {
  test.describe(`M-003 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-003: o cartão Micronutrientes mostra o nome inteiro de cada nutriente (dados normais)', async ({ page }) => {
      await abrirExemplo(page)
      const lista = page.getByRole('region', { name: 'Micronutrientes' }).getByRole('list', { name: 'Fora da meta' })
      await expect(lista.getByRole('listitem').first()).toBeVisible()
      expect(await textosCortados(lista)).toEqual([])
      await semRolagemLateral(page)
    })

    test('M-003: com o plano acima do limite, o nome e o "acima do limite" aparecem inteiros (pior caso)', async ({ page }) => {
      await abrirExemplo(page)
      const cafe = page.getByRole('tabpanel', { name: 'Principal de Café da manhã' })
      for (const indice of [0, 1, 2]) await cafe.getByRole('textbox', { name: /^Gramas de / }).nth(indice).fill('1250')
      const lista = page.getByRole('region', { name: 'Micronutrientes' }).getByRole('list', { name: 'Fora da meta' })
      await expect(lista.getByRole('listitem').filter({ hasText: 'acima do limite' }).first()).toBeVisible()
      expect(await textosCortados(lista)).toEqual([])
      await semRolagemLateral(page)
    })
  })
}

// ------------------------------------------------------------------------------------------------------------- M-010

const REFEICAO_LONGA = 'Almoço de domingo na casa da sogra (com sobremesa liberada)'

for (const largura of COM_TABLET) {
  test.describe(`M-010 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-010: na gaveta Cobrir, "Adicionar em <refeição de nome longo>" fica dentro da gaveta e inteiro', async ({ page }) => {
      await abrirExemplo(page)
      await page.getByRole('textbox', { name: 'Nome da refeição Almoço' }).fill(REFEICAO_LONGA)
      await page.getByRole('region', { name: 'Micronutrientes' }).getByRole('button', { name: /^Cobrir / }).first().click()
      const gaveta = page.getByRole('dialog')
      const destino = gaveta.getByLabel('Adicionar em')
      const valor = await destino.locator('option', { hasText: REFEICAO_LONGA }).getAttribute('value')
      await destino.selectOption(valor ?? '')
      await expect(gaveta.getByRole('button', { name: `Adicionar em ${REFEICAO_LONGA}` }).first()).toBeVisible()
      const medidas = await gaveta.evaluate((g) => {
        const direita = g.getBoundingClientRect().right - parseFloat(getComputedStyle(g).paddingRight)
        return [...g.querySelectorAll('button')]
          .filter((b) => (b.textContent ?? '').startsWith('Adicionar em'))
          .map((b) => ({ passa: b.getBoundingClientRect().right - direita, corta: b.scrollWidth - b.clientWidth, altura: b.getBoundingClientRect().height }))
      })
      expect(medidas.length).toBeGreaterThan(0)
      for (const m of medidas) {
        expect(m.passa, 'o botão passa da gaveta').toBeLessThanOrEqual(0.5)
        expect(m.corta, 'o texto do botão é cortado').toBeLessThanOrEqual(1)
        if (largura < 640) expect(m.altura, 'alvo de toque').toBeGreaterThanOrEqual(44)
      }
    })
  })
}

// ------------------------------------------------------------------------------------------------------------- M-022

for (const largura of CELULARES) {
  test.describe(`M-022 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-022: a faixa de sugestões esmaece a borda direita, encaixa os chips e deixa o último inteiro no fim', async ({ page }) => {
      await abrirExemplo(page)
      const faixa = page.getByRole('region', { name: /^Sugestões para / }).first()
      const rolagem = faixa.getByRole('button', { name: /^Adicionar / }).first().locator('..')
      const antes = await rolagem.evaluate((el) => {
        const e = getComputedStyle(el)
        return { rola: el.scrollWidth > el.clientWidth, mascara: e.maskImage || e.getPropertyValue('-webkit-mask-image'), encaixe: e.scrollSnapType }
      })
      expect(antes.rola, 'a faixa precisa rolar nesta largura').toBe(true)
      expect(antes.mascara, 'sem sinal de que rola').not.toBe('none')
      expect(antes.encaixe).toContain('x')
      const folgaNoFim = await rolagem.evaluate((el) => {
        el.scrollLeft = el.scrollWidth
        const chips = el.querySelectorAll('button')
        const ultimo = chips[chips.length - 1]
        return ultimo ? el.getBoundingClientRect().right - ultimo.getBoundingClientRect().right : -1
      })
      expect(folgaNoFim, 'o último chip fica embaixo do esmaecido').toBeGreaterThanOrEqual(16)
    })
  })
}

// ------------------------------------------------------------------------------------------------------------- M-023

for (const largura of CELULARES) {
  test.describe(`M-023 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-023: o horário da refeição tem um relógio só, o do campo', async ({ page }) => {
      await abrirExemplo(page)
      const horario = page.getByLabel('Horário de Café da manhã')
      await expect(horario).toBeVisible()
      const relogiosDesenhados = await horario.evaluate((el) => el.closest('[data-slot="card"]')?.querySelectorAll('svg.lucide-clock').length ?? -1)
      expect(relogiosDesenhados).toBe(0)
    })
  })
}

// ------------------------------------------------------------------------------------------------------------- M-025

for (const largura of [...COM_TABLET, 1280]) {
  test.describe(`M-025 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } })

    test('M-025: o resumo do dia é um cartão de canto arredondado, sem fio de fora nem fio solto na borda', async ({ page }) => {
      await abrirExemplo(page)
      await page.getByRole('navigation', { name: 'Etapas do plano' }).getByRole('button', { name: /Adequação/ }).click()
      const medida = await page.getByRole('region', { name: 'Resumo do dia' }).evaluate((secao) => {
        const estilo = getComputedStyle(secao)
        const caixa = secao.getBoundingClientRect()
        const celulas = [...(secao.firstElementChild?.children ?? [])]
        const fiosNaBorda = celulas.filter((c) => {
          const r = c.getBoundingClientRect()
          const e = getComputedStyle(c)
          return (
            (Math.abs(r.right - caixa.right) < 1 && parseFloat(e.borderRightWidth) > 0) ||
            (Math.abs(r.left - caixa.left) < 1 && parseFloat(e.borderLeftWidth) > 0) ||
            (Math.abs(r.top - caixa.top) < 1 && parseFloat(e.borderTopWidth) > 0)
          )
        }).length
        return { raio: parseFloat(estilo.borderTopLeftRadius), fio: parseFloat(estilo.borderTopWidth), fiosNaBorda }
      })
      expect(medida.raio, 'canto reto').toBeGreaterThan(0)
      expect(medida.fio, 'fio em volta').toBe(0)
      expect(medida.fiosNaBorda, 'fio de célula encostado na borda do cartão').toBe(0)
    })
  })
}

import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec impressao-do-plano: a folha do paciente é papel claro em qualquer tema, sem nada do sistema por cima.

const abrirExemplo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).click()
  await pagina.getByRole('button', { name: 'Exportar' }).click()
  await pagina.getByRole('menuitem', { name: /Plano alimentar \(PDF\)/ }).click()
  const janela = pagina.getByRole('dialog', { name: 'Plano alimentar para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Plano alimentar', exact: true })).toBeVisible()
  return janela
}

/** As cores calculadas que importam na folha: o fundo de cada elemento dela e da janela, e as letras do almoço. */
const coresDaFolha = (janela: Locator) =>
  janela.evaluate((el) => {
    const luminancia = (cor: string) => {
      const [r = 0, g = 0, b = 0, a = 1] = (cor.match(/[\d.]+/g) ?? []).map(Number)
      if (a === 0) return null
      const canal = (c: number) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
    }
    const folha = el.querySelector('article')
    const fundos = [el, ...(el.querySelector('.area-impressao')?.querySelectorAll('*') ?? [])]
      .filter((n) => getComputedStyle(n).display !== 'none' && !n.closest('.print\\:hidden'))
      .map((n) => luminancia(getComputedStyle(n).backgroundColor))
      .filter((l): l is number => l !== null)
    const almoco = el.querySelector('[aria-label="12:00 Almoço"]')
    const horario = almoco?.querySelector('.numeros')
    const titulo = almoco?.querySelector('h3')
    return {
      escuro: document.documentElement.classList.contains('dark'),
      fundoDaFolha: folha ? getComputedStyle(folha).backgroundColor : '',
      menorFundo: Math.min(...fundos),
      corDoHorario: horario ? getComputedStyle(horario).color : '',
      corDoTitulo: titulo ? getComputedStyle(titulo).color : '',
      luzDoHorario: horario ? luminancia(getComputedStyle(horario).color) : null,
    }
  })

test('CA-636 e CA-637: a primeira página não tem margem em cima nem embaixo; o espaço de 14 mm vem da folha, em toda página', async ({ page }) => {
  const janela = await abrirExemplo(page)
  await page.emulateMedia({ media: 'print' })
  const regras = await page.evaluate(() => {
    const paginas: { seletor: string; topo: string; base: string; comClone: boolean }[] = []
    const fontesDaMargem: string[] = []
    const percorrer = (lista: CSSRuleList, comClone: boolean) => {
      for (const regra of Array.from(lista)) {
        if (regra instanceof CSSPageRule) {
          paginas.push({ seletor: regra.selectorText, topo: regra.style.marginTop, base: regra.style.marginBottom, comClone })
          for (const margem of Array.from(regra.cssRules)) if (margem instanceof CSSMarginRule) fontesDaMargem.push(`${margem.name} ${margem.style.fontFamily}`)
        }
        else if (regra instanceof CSSSupportsRule) percorrer(regra.cssRules, comClone || regra.conditionText.includes('box-decoration-break'))
        else if (regra instanceof CSSGroupingRule) percorrer(regra.cssRules, comClone)
      }
    }
    for (const folha of Array.from(document.styleSheets)) percorrer(folha.cssRules, false)
    const area = document.querySelector('.area-impressao')
    const artigo = area?.querySelector('article')
    return {
      suporta: CSS.supports('box-decoration-break', 'clone'),
      primeiraSemTopo: paginas.some((p) => p.comClone && p.seletor === ':first' && p.topo === '0px'),
      todasSemBase: paginas.some((p) => p.comClone && p.seletor === '' && p.base === '0px'),
      fontesDaMargem,
      quebra: area ? getComputedStyle(area).boxDecorationBreak : '',
      espacoNoPe: area ? Number.parseFloat(getComputedStyle(area).paddingBottom) : 0,
      espacoNoTopo: artigo ? Number.parseFloat(getComputedStyle(artigo).paddingTop) : 0,
    }
  })
  // 14 mm = 52,9 px.
  expect(regras).toMatchObject({ suporta: true, primeiraSemTopo: true, todasSemBase: true, quebra: 'clone' })
  // A linha fina (CA-316) na fonte da folha.
  expect(regras.fontesDaMargem).toEqual(expect.arrayContaining(['top-left var(--font-corpo)', 'top-right var(--font-corpo)']))
  expect(regras.espacoNoPe).toBeCloseTo(52.9, 0)
  expect(regras.espacoNoTopo).toBeCloseTo(52.9, 0)

  // CA-638: com lista de compras e trocas, a folha continua correndo por mais de uma página.
  await page.emulateMedia({ media: 'screen' })
  await janela.getByRole('switch', { name: 'Trocas' }).click()
  await janela.getByRole('switch', { name: 'Lista de compras' }).click()
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true })
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBeGreaterThan(1)
  await page.emulateMedia({ media: 'screen' })
})

test.describe('no tema escuro', () => {
  test.use({ colorScheme: 'dark' })

  test('CA-620: a prévia é papel claro, com o horário na cor do nome da refeição', async ({ page }) => {
    const janela = await abrirExemplo(page)
    const cores = await coresDaFolha(janela)
    expect(cores.escuro).toBe(true)
    expect(cores.fundoDaFolha).toBe('rgb(255, 255, 255)')
    expect(cores.corDoHorario).toBe(cores.corDoTitulo)
    expect(cores.luzDoHorario).toBeLessThan(0.05)
    // D-180: a folha usa o tema claro inteiro (o mesmo escopo de tokens.css), não uma cópia de parte dele.
    // Cada semântico na folha tem o valor da primitiva que o tema claro usa (as primitivas não mudam de tema).
    const tokens = await janela.locator('article').evaluate((el) => {
      const folha = getComputedStyle(el)
      const raiz = getComputedStyle(document.documentElement)
      const pares = [
        ['--surface-row', '--mesa'],
        ['--ring', '--teal-500'],
        ['--primary-foreground', '--ivory'],
        ['--state-ok-bg', '--green-100'],
      ]
      return pares.map(([semantico = '', primitiva = '']) => folha.getPropertyValue(semantico).trim() === raiz.getPropertyValue(primitiva).trim())
    })
    expect(tokens).toEqual([true, true, true, true])
  })

  test('CA-621 e CA-622: no papel, letra preta e nenhum fundo escuro na folha nem em volta dela', async ({ page }) => {
    const janela = await abrirExemplo(page)
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    const cores = await coresDaFolha(janela)
    expect(cores.escuro).toBe(true)
    expect(cores.corDoHorario).toBe('rgb(0, 0, 0)')
    expect(cores.corDoTitulo).toBe('rgb(0, 0, 0)')
    expect(cores.menorFundo).toBeGreaterThan(0.85)
    // Com "Gráficos de fundo" ligado, o esquema escuro da página pintava as margens de preto (revisão de 15/10).
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
    await page.emulateMedia({ media: 'screen' })
  })

  test('CA-639: a folha de suplementação também é papel claro, sem a régua de cor', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/#/pacientes')
    const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
    if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
    await page.getByRole('button', { name: 'Cadastrar paciente' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Maria Silva')
    const suplementos = page.getByRole('region', { name: 'Suplementos' })
    await suplementos.getByRole('button', { name: 'Acrescentar suplemento' }).click()
    await suplementos.getByLabel('Nome').fill('Vitamina D3')
    await suplementos.getByRole('button', { name: 'Imprimir' }).click()
    const folha = page.getByRole('dialog', { name: 'Suplementos para imprimir' })
    await expect(folha.getByRole('article')).toContainText('Vitamina D3')
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    const cores = await folha.evaluate((el) => {
      const artigo = el.querySelector('article')
      const titulo = artigo?.querySelector('h2')
      return {
        fundo: artigo ? getComputedStyle(artigo).backgroundColor : '',
        titulo: titulo ? getComputedStyle(titulo).color : '',
        regua: artigo?.querySelector('.border-laranja') !== null && artigo?.querySelector('.border-laranja') !== undefined,
      }
    })
    expect(cores).toEqual({ fundo: 'rgb(255, 255, 255)', titulo: 'rgb(0, 0, 0)', regua: false })
    await page.emulateMedia({ media: 'screen' })
  })

  test('CA-639: a solicitação de exames também é papel claro, sem a régua de cor e sem moldura escura', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/#/pacientes')
    const boasVindas = page.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
    if (await boasVindas.isVisible().catch(() => false)) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
    await page.getByRole('button', { name: 'Cadastrar paciente' }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Maria Silva')
    const exames = page.getByRole('region', { name: 'Pedido de exames' })
    await exames.getByRole('checkbox', { name: 'Ferritina' }).check()
    await exames.getByRole('button', { name: 'Imprimir pedido' }).click()
    const folha = page.getByRole('dialog', { name: 'Pedido de exames para imprimir' })
    await expect(folha.getByRole('article')).toContainText('Ferritina')
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    const cores = await folha.evaluate((el) => {
      const artigo = el.querySelector('article')
      const titulo = artigo?.querySelector('h2')
      return {
        fundo: artigo ? getComputedStyle(artigo).backgroundColor : '',
        titulo: titulo ? getComputedStyle(titulo).color : '',
        regua: Boolean(artigo?.querySelector('.border-laranja')),
        esquema: getComputedStyle(document.documentElement).colorScheme,
      }
    })
    expect(cores).toEqual({ fundo: 'rgb(255, 255, 255)', titulo: 'rgb(0, 0, 0)', regua: false, esquema: 'light' })
    await page.emulateMedia({ media: 'screen' })
  })
})

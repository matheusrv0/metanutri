import { expect, test, type Locator, type Page } from '@playwright/test'

// Spec impressao-do-plano: a folha do paciente é papel claro em qualquer tema, sem nada do sistema por cima.

const abrirExemplo = async (pagina: Page) => {
  await pagina.goto('/')
  await pagina.evaluate(() => localStorage.clear())
  await pagina.reload()
  await pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' }).getByRole('button', { name: 'Entendi' }).click()
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).click()
  await pagina.getByRole('button', { name: 'Exportar' }).click()
  await pagina.getByRole('menuitem', { name: /Dieta para imprimir/ }).click()
  const janela = pagina.getByRole('dialog', { name: 'Dieta para imprimir' })
  await expect(janela.getByRole('heading', { name: 'Plano alimentar' })).toBeVisible()
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

test.describe('no tema escuro', () => {
  test.use({ colorScheme: 'dark' })

  test('CA-620: a prévia é papel claro, com o horário na cor do nome da refeição', async ({ page }) => {
    const janela = await abrirExemplo(page)
    const cores = await coresDaFolha(janela)
    expect(cores.escuro).toBe(true)
    expect(cores.fundoDaFolha).toBe('rgb(255, 255, 255)')
    expect(cores.corDoHorario).toBe(cores.corDoTitulo)
    expect(cores.luzDoHorario).toBeLessThan(0.05)
  })

  test('CA-621 e CA-622: no papel, letra preta e nenhum fundo escuro na folha nem em volta dela', async ({ page }) => {
    const janela = await abrirExemplo(page)
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
    const cores = await coresDaFolha(janela)
    expect(cores.escuro).toBe(true)
    expect(cores.corDoHorario).toBe('rgb(0, 0, 0)')
    expect(cores.corDoTitulo).toBe('rgb(0, 0, 0)')
    expect(cores.menorFundo).toBeGreaterThan(0.85)
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
})

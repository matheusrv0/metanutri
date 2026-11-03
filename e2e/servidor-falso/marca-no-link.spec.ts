/* eslint-disable no-restricted-syntax -- os códigos de cor aqui são o dado dos critérios da SPEC (a marca publicada que a
   função do link devolve), não estilo: a regra de hexadecimal é para o código de tela. */
import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { DIETA_GUARDADA, ligarServidorFalso, linkFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO, type Cenario, type Linha } from '../apoio/servidorFalso.ts'

/**
 * Spec marca-no-link: o link do paciente lido da nuvem com a marca da nutricionista (CA-1965 a CA-1973), e o "Salvar" de
 * Sua marca gravando a marca publicada (CA-1963). O servidor falso responde pela função do link e pela tabela `marcas`.
 */

test.use({ reducedMotion: 'reduce' })

const VERDE_FOLHA = '#3f5f2a'
const TOKEN = 'token-do-teste'

/** Um PNG desenhado no navegador (sem nada da conta): a logo de teste, na proporção pedida. */
async function logoDesenhada(pagina: Page, largura: number, altura: number): Promise<string> {
  await pagina.goto('/#/entrar')
  return pagina.evaluate(
    ([l, a]) => {
      const tela = document.createElement('canvas')
      tela.width = l
      tela.height = a
      const pincel = tela.getContext('2d')
      if (!pincel) return ''
      pincel.fillStyle = 'rgb(34, 52, 26)'
      pincel.fillRect(0, 0, l, a)
      pincel.fillStyle = 'rgb(140, 198, 63)'
      pincel.fillRect(l * 0.1, a * 0.1, l * 0.3, a * 0.8)
      return tela.toDataURL('image/png')
    },
    [largura, altura] as const,
  )
}

/** Abre o link com a linha da função dada (a marca vai nas colunas `marca_logo` e `marca_cor`). */
async function abrirLink(pagina: Page, cenario: { link: Linha | null }, linha: Linha) {
  cenario.link = linha
  await pagina.goto(`/#/missoes/${TOKEN}`)
  await expect(pagina.getByRole('heading', { level: 1, name: /Juliana/ })).toBeVisible()
}

const cores = (alvo: Locator) => alvo.evaluate((el) => ({ fundo: getComputedStyle(el).backgroundColor, texto: getComputedStyle(el).color }))
const LOGO_DELA = 'Logo de quem montou seu plano'

/** O link de exemplo: Juliana, com a dieta (para as abas) e o café já feito hoje. */
function linhaComMarca(marca: { readonly logo: string | null; readonly cor: string | null }, parcial: Linha = {}): Linha {
  const hoje = new Date()
  const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  return linkFalso({
    nome: 'Juliana',
    dieta: DIETA_GUARDADA,
    marcacoes: [{ dia, feitas: ['refeicao-1'] }],
    marca_logo: marca.logo,
    marca_cor: marca.cor,
    ...parcial,
  })
}

test.describe('o link do paciente com a marca', () => {
  test('CA-1965 e CA-1971: no celular claro, a logo dela numa placa branca, a cor na aba e na barra com texto branco, a feita em verde e o MetaNutri no rodapé', async ({ page }) => {
    const erros = await vigiarConsole(page)
    const cenario: { link: Linha | null } = { link: null }
    await page.emulateMedia({ colorScheme: 'light' })
    await ligarServidorFalso(page, cenario as Cenario)
    const logo = await logoDesenhada(page, 360, 96)
    await abrirLink(page, cenario, linhaComMarca({ logo, cor: VERDE_FOLHA }))

    const placa = page.getByRole('img', { name: LOGO_DELA })
    await expect(placa).toHaveAttribute('src', logo)
    expect((await cores(placa.locator('xpath=..'))).fundo).toBe('rgb(255, 255, 255)')
    expect(await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).toEqual({ fundo: 'rgb(63, 95, 42)', texto: 'rgb(255, 255, 255)' })
    expect((await cores(page.locator('[role="progressbar"] > div'))).fundo).toBe('rgb(63, 95, 42)')
    // O verde de "feita" é estado, não marca.
    const feita = page.getByRole('button', { name: /Café da manhã/ })
    await expect(feita).toHaveAttribute('aria-pressed', 'true')
    expect((await cores(feita)).fundo).toBe('rgb(220, 243, 231)')
    // O MetaNutri pequeno no rodapé, depois das missões.
    const metanutri = page.getByRole('img', { name: 'MetaNutri' })
    await expect(metanutri).toHaveCount(1)
    const caixaDaPlaca = await placa.boundingBox()
    const caixaDoRodape = await metanutri.boundingBox()
    expect(caixaDoRodape && caixaDaPlaca && caixaDoRodape.y > caixaDaPlaca.y).toBe(true)
    await semRolagemLateral(page)
    expect(erros).toEqual([])
  })

  test('CA-1966: no celular escuro, a versão do escuro com texto #101A1D, e a logo continua na placa branca', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await page.emulateMedia({ colorScheme: 'dark' })
    await ligarServidorFalso(page, cenario as Cenario)
    const logo = await logoDesenhada(page, 360, 96)
    await abrirLink(page, cenario, linhaComMarca({ logo, cor: VERDE_FOLHA }))
    await expect(page.locator('html')).toHaveClass(/dark/)
    // #3F5F2A clareada até 7:1 contra #101A1D: #7AB455.
    expect(await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).toEqual({ fundo: 'rgb(122, 180, 85)', texto: 'rgb(16, 26, 29)' })
    expect((await cores(page.getByRole('img', { name: LOGO_DELA }).locator('xpath=..'))).fundo).toBe('rgb(255, 255, 255)')

    // CB-958: ao imprimir, o app sai do escuro (D-240) e a cor volta à do claro.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
    expect((await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).fundo).toBe('rgb(63, 95, 42)')
  })

  test('CA-1967 e CA-1968: sem marca, o link de hoje; salva a marca, o mesmo link mostra a marca ao abrir de novo', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await page.emulateMedia({ colorScheme: 'light' })
    await ligarServidorFalso(page, cenario as Cenario)
    await abrirLink(page, cenario, linhaComMarca({ logo: null, cor: null }))
    await expect(page.getByRole('img', { name: LOGO_DELA })).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'MetaNutri' })).toHaveCount(1)
    expect((await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).fundo).toBe('rgb(255, 255, 255)')
    expect((await cores(page.locator('[role="progressbar"] > div'))).fundo).toBe('rgb(14, 59, 67)')

    await abrirLink(page, cenario, linhaComMarca({ logo: null, cor: '#1f4e8c' }))
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: /Juliana/ })).toBeVisible()
    expect((await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).fundo).toBe('rgb(31, 78, 140)')
  })

  test('CA-1969: só a cor: o MetaNutri no topo, a cor na ação, e o rodapé não repete o MetaNutri', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await ligarServidorFalso(page, cenario as Cenario)
    await abrirLink(page, cenario, linhaComMarca({ logo: null, cor: '#7a2944' }))
    await expect(page.getByRole('img', { name: 'MetaNutri' })).toHaveCount(1)
    expect((await cores(page.getByRole('tab', { name: 'Missões', selected: true }))).fundo).toBe('rgb(122, 41, 68)')
  })

  test('CA-1970: no link de conta de estudante, o aviso de estágio vem antes da logo', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await ligarServidorFalso(page, cenario as Cenario)
    const logo = await logoDesenhada(page, 360, 96)
    await abrirLink(page, cenario, linhaComMarca({ logo, cor: VERDE_FOLHA }, { uso_nao_comercial: true }))
    const aviso = await page.getByText(/estágio de nutrição/).boundingBox()
    const placa = await page.getByRole('img', { name: LOGO_DELA }).boundingBox()
    expect(aviso && placa && aviso.y < placa.y).toBe(true)
  })

  test('CA-1972: logo muito larga (10:1) e muito alta (1:3) cabem em 200 × 40 px, sem deformar', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await ligarServidorFalso(page, cenario as Cenario)
    for (const [largura, altura] of [
      [600, 60],
      [100, 300],
    ] as const) {
      const logo = await logoDesenhada(page, largura, altura)
      await abrirLink(page, cenario, linhaComMarca({ logo, cor: null }))
      const caixa = await page.getByRole('img', { name: LOGO_DELA }).boundingBox()
      expect(caixa).not.toBeNull()
      if (!caixa) return
      expect(caixa.width).toBeLessThanOrEqual(200.5)
      expect(caixa.height).toBeLessThanOrEqual(40.5)
      expect(caixa.width / caixa.height).toBeCloseTo(largura / altura, 1)
    }
  })

  test('CA-1973: a imagem estragada volta à logo do MetaNutri e as missões abrem', async ({ page }) => {
    const cenario: { link: Linha | null } = { link: null }
    await ligarServidorFalso(page, cenario as Cenario)
    await abrirLink(page, cenario, linhaComMarca({ logo: 'data:image/png;base64,iVBORw0KGgoAAAAstragado', cor: VERDE_FOLHA }))
    await expect(page.getByRole('img', { name: LOGO_DELA })).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'MetaNutri' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Beber 2 litros de água/ })).toBeVisible()
  })
})

test('CA-1963: com a conta, "Salvar" grava a marca publicada na linha da conta e mostra "Salvo"', async ({ page }) => {
  const servidor = await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await page.goto('/#/conta/marca')
  const titulo = page.getByRole('heading', { level: 1, name: 'Sua marca' })
  const aviso = page.getByRole('dialog')
  await expect(titulo.or(aviso)).toBeVisible()
  for (let vez = 0; vez < 3; vez++) {
    await aviso.waitFor({ state: 'visible', timeout: 2000 }).catch(() => undefined)
    if (!(await aviso.isVisible())) break
    await aviso.getByRole('button', { name: 'Entendi' }).click()
    await expect(aviso).toBeHidden()
  }
  await page.getByTitle('Azul').click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  expect(servidor.gravacoesDaMarca).toHaveLength(1)
  expect(servidor.gravacoesDaMarca[0]).toMatchObject({ nutricionista_id: USUARIO_FALSO.id, logo: null, cor: '#1f4e8c' })
})

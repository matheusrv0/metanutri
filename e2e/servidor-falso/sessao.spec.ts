// A sessão que sai sozinha, no navegador (spec separacao-site-app, P1: D-514 a D-520). O relógio da página é o do
// Playwright (`page.clock`): os 30 minutos sem uso, as 12 horas e o computador que dorme passam em segundos. A conta
// entra pelo formulário, com o servidor falso (DP-SA-28): o token traz a hora da entrada (`amr`) e a de emissão (`iat`).
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO, type ServidorFalso } from '../apoio/servidorFalso.ts'

const MIN = 60_000
/**
 * Quanto o relógio falso anda depois do instante da saída. Pouco, de propósito: a saída espera a rede (o envio, com
 * até 10 s, e o encerramento, com até 5 s), e o relógio falso adiantado minutos de uma vez venceria esses prazos antes
 * de a resposta chegar, o que nunca acontece com o relógio de verdade. Passado o instante, o resto corre no tempo real.
 */
const ATE_A_SAIDA = 1_000
const ENTRE_DE_NOVO = { level: 1, name: 'Entre de novo' } as const
const EM_DIA = /^Sua sessão terminou\. Tudo até as \d\d:\d\d está salvo\.$/
const COM_PENDENCIA = 'Sua sessão terminou. Entre para enviar o que ficou neste navegador.'

async function ligar(pagina: Page): Promise<ServidorFalso> {
  const servidor = await ligarServidorFalso(pagina, { entrar: 'ok', perfil: PERFIL_NUTRICIONISTA })
  return servidor
}

/** Entra pelo formulário e espera o Painel, já com os dados da nuvem abertos (e as boas-vindas fechadas). */
async function entrar(pagina: Page, ir = true): Promise<void> {
  if (ir) await pagina.goto('/#/entrar')
  await pagina.getByLabel('E-mail').fill(USUARIO_FALSO.email)
  await pagina.getByLabel('Senha', { exact: true }).fill('senhaforte1')
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click()
  const painel = pagina.getByRole('heading', { level: 1, name: 'Painel' })
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await expect(painel.or(boasVindas)).toBeVisible()
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await expect(painel).toBeVisible()
}

/** As chaves do navegador desta conta e da sessão do Supabase. */
const chavesDaConta = (pagina: Page) =>
  pagina.evaluate(() => Object.keys(localStorage).filter((chave) => chave.startsWith('sb-') || chave.startsWith('metanutri:conta:')))

/** Um contexto novo com o que o anterior guardou: é o navegador fechado e aberto de novo. */
type Guardado = Awaited<ReturnType<BrowserContext['storageState']>>

async function reabrir(browser: Browser, guardado: Guardado, depoisDe: number) {
  const contexto = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: 'pt-BR', storageState: guardado })
  const pagina = await contexto.newPage()
  await ligar(pagina)
  // Se a área de trabalho aparecer, nem que por um quadro, fica anotado (D-518).
  await pagina.addInitScript(() => {
    const vigiar = new MutationObserver(() => {
      for (const titulo of document.querySelectorAll('h1')) if (titulo.textContent === 'Painel') Reflect.set(window, '__viuOPainel', true)
    })
    document.addEventListener('DOMContentLoaded', () => vigiar.observe(document.body, { childList: true, subtree: true }))
  })
  await pagina.clock.install({ time: Date.now() + depoisDe })
  return { contexto, pagina }
}

test.describe('a sessão que sai sozinha (spec separacao-site-app, P1)', () => {
  test.describe.configure({ timeout: 180_000 })

  test('CA-1442, CA-1440 e CA-1447: aos 28 minutos sem uso pergunta; aos 30, sai com tudo salvo e Entrar diz "Entre de novo"', async ({ page }) => {
    const servidor = await ligar(page)
    await page.clock.install()
    await entrar(page)

    await page.clock.runFor(28 * MIN)
    const aviso = page.getByRole('dialog', { name: 'Você ainda está aí?' })
    await expect(aviso).toBeVisible()
    await expect(aviso).toContainText('A sessão termina em 2 minutos.')
    await aviso.getByRole('button', { name: 'Continuar' }).click()
    await expect(aviso).toBeHidden()

    // "Continuar" contou como uso: 27 minutos depois, ainda dentro e sem aviso.
    await page.clock.runFor(27 * MIN)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()

    await page.clock.runFor(3 * MIN + ATE_A_SAIDA)
    await expect(page.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
    await expect(page.getByText(EM_DIA)).toBeVisible()
    await expect(page.getByText(/segurança/i)).toHaveCount(0)
    // CA-1452: só a sessão deste navegador; em dia, o espaço da conta saiu junto.
    expect(servidor.logouts).toEqual(['local'])
    expect(await chavesDaConta(page)).toEqual([])
  })

  test('CA-1443: em uso sem parar, a faixa aparece 10 minutos antes das 12 horas e, às 12 horas, a sessão sai mesmo assim', async ({ page }) => {
    await ligar(page)
    await page.clock.install()
    await entrar(page)
    for (let vez = 0; vez < 28; vez += 1) {
      await page.keyboard.press('Shift')
      await page.clock.runFor(25 * MIN)
    }
    await page.keyboard.press('Shift')
    await page.clock.runFor(11 * MIN)
    await expect(page.getByText(/^A sessão termina às \d\d:\d\d\.$/)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()

    await page.keyboard.press('Shift')
    await page.clock.runFor(9 * MIN + ATE_A_SAIDA)
    await expect(page.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
  })

  test('CA-1448 e CA-1449: sem internet, a saída guarda no navegador o que não subiu; a mesma conta entra de novo e envia', async ({ page }) => {
    const servidor = await ligar(page)
    await page.clock.install()
    await entrar(page)
    await page.evaluate(() => {
      window.location.hash = '#/pacientes'
    })
    servidor.semRede = true
    await page.getByRole('button', { name: 'Novo paciente' }).first().click()
    const guardados = await page.evaluate(() => {
      const chave = Object.keys(localStorage).find((k) => k.startsWith('metanutri:conta:') && k.endsWith(':pacientes'))
      return chave ? (JSON.parse(localStorage.getItem(chave) ?? '[]') as { id: string }[]).map((p) => p.id) : []
    })
    expect(guardados).toHaveLength(1)

    // Sem rede, nada responde: aqui o relógio passa de propósito dos 10 s do envio e dos 5 s do encerramento (CA-1448).
    await page.clock.runFor(31 * MIN)
    await expect(page.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
    await expect(page.getByText(COM_PENDENCIA)).toBeVisible()
    // A sessão saiu deste navegador mesmo sem resposta do servidor; o espaço da conta ficou, inteiro.
    const chaves = await chavesDaConta(page)
    expect(chaves.some((chave) => chave.startsWith('sb-'))).toBe(false)
    expect(chaves.some((chave) => chave.endsWith(':pacientes'))).toBe(true)

    servidor.semRede = false
    const antes = servidor.gravacoesDaCopia.length
    await entrar(page, false)
    await expect
      .poll(() => servidor.gravacoesDaCopia.slice(antes).some((gravacao) => JSON.stringify(gravacao).includes(guardados[0] ?? 'nenhum')))
      .toBe(true)
  })

  test('CA-1453: "Sair" encerra só a sessão deste navegador', async ({ page }) => {
    const servidor = await ligar(page)
    await entrar(page)
    await page.evaluate(() => {
      window.location.hash = '#/conta'
    })
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect.poll(() => servidor.logouts).toEqual(['local'])
  })

  test('CA-1445: duas abas, uma em uso e outra parada: nenhuma sai; quando a saída acontece, as duas mostram "Entre de novo" e só uma sai', async ({ page, context }) => {
    const servidor = await ligar(page)
    await page.clock.install()
    await entrar(page)
    const outra = await context.newPage()
    const servidorDaOutra = await ligarServidorFalso(outra, { perfil: PERFIL_NUTRICIONISTA })
    await outra.goto('/#/painel')
    await expect(outra.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()

    for (let vez = 0; vez < 4; vez += 1) {
      await page.keyboard.press('Shift')
      await page.clock.runFor(10 * MIN)
    }
    await expect(outra.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
    await expect(outra.getByRole('dialog', { name: 'Você ainda está aí?' })).toHaveCount(0)

    // O último uso foi no começo da última volta, 10 minutos atrás: a saída vem 20 minutos depois.
    await page.clock.runFor(20 * MIN + ATE_A_SAIDA)
    await expect(page.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
    await expect(outra.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
    // Qualquer uma das duas pode ser a que sai; o pedido passa pelo servidor falso da aba que saiu.
    expect([...servidor.logouts, ...servidorDaOutra.logouts]).toEqual(['local'])
  })

  test('CA-1451 e CA-1450: reaberto antes dos 30 minutos, abre direto; depois, mostra "Entre de novo" sem a área aparecer', async ({ page, browser }) => {
    await ligar(page)
    await page.clock.install()
    await entrar(page)
    // O que mudou ao entrar (as boas-vindas vistas) sobe 2 s depois; o navegador fecha com tudo na nuvem.
    await page.clock.runFor(3_000)
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
    const guardado = await page.context().storageState()
    await page.context().close()

    const cedo = await reabrir(browser, guardado, 20 * MIN)
    await cedo.pagina.goto('/#/painel')
    await expect(cedo.pagina.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
    await cedo.contexto.close()

    const tarde = await reabrir(browser, guardado, 31 * MIN)
    await tarde.pagina.goto('/#/painel')
    await expect(tarde.pagina.getByRole('heading', ENTRE_DE_NOVO)).toBeVisible()
    await expect(tarde.pagina.getByText(EM_DIA)).toBeVisible()
    expect(await tarde.pagina.evaluate(() => Reflect.get(window, '__viuOPainel') === true)).toBe(false)
    await tarde.contexto.close()
  })
})

// Spec separacao-site-app, R9 (DP-SA-57) e CB-507: a mudança dos dados com mais de uma aba aberta. Só no Chromium (o
// projeto "site"): o que se confere aqui é o armazenamento dividido entre as abas, igual nos três navegadores; a aba
// nova e o window.opener, o ponto frágil, ficam em e2e/site/mudanca.spec.ts, que roda nos três.
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { ENDERECO_FALSO, ligarServidorFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO, type ServidorFalso } from '../apoio/servidorFalso.ts'

const APP = 'http://localhost:4176'
const SITE = 'http://localhost:4178'
const TITULO = 'O MetaNutri mudou para app.metanutri.com.br'
const PRONTO = 'Pronto. Pode fechar esta aba.'
const CONTA = USUARIO_FALSO.id
const BIA = { id: 'bia', nome: 'Bia Souza', criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm: '2026-10-20T00:00:00.000Z' }

test.describe.configure({ timeout: 150_000 })

/**
 * O dado que só existe no endereço antigo: um paciente que nunca chegou à nuvem. Uma vez por aba, só no site. Sem a
 * situação da nuvem, é um dos motivos do D-511 para não estar em dia, e o pacote vai sem ela.
 */
async function dadoSoNoSite(contexto: BrowserContext, comSituacao = true): Promise<void> {
  await contexto.addInitScript(
    ([conta, paciente, situacao]) => {
      if (location.port !== '4178' || sessionStorage.getItem('teste:posto')) return
      sessionStorage.setItem('teste:posto', '1')
      const espaco = `metanutri:conta:${conta}:`
      if (situacao) localStorage.setItem(`${espaco}nuvem`, JSON.stringify({ versao: null, mudancas: 1, salvas: 0, itens: 0, motor: 2 }))
      localStorage.setItem(`${espaco}pacientes`, JSON.stringify([paciente]))
      localStorage.setItem(`${espaco}mudancas`, JSON.stringify({ alterados: { [`pacientes/${paciente.id}`]: paciente.atualizadoEm }, excluidos: {} }))
      localStorage.setItem(`${espaco}aviso-inicial-visto`, '1')
      localStorage.setItem(`${espaco}aviso-nuvem-visto`, '1')
    },
    [CONTA, BIA, comSituacao] as const,
  )
}

/** Os pacientes da cópia que subiu por último para a nuvem falsa. */
const pacientesNaNuvem = (servidor: ServidorFalso): string[] => {
  const ultima = servidor.gravacoesDaCopia.at(-1) as { dados?: { dados?: Record<string, string> } } | undefined
  return (JSON.parse(ultima?.dados?.dados?.['metanutri:pacientes'] ?? '[]') as { nome: string }[]).map((p) => p.nome)
}

/** Os ids dos pacientes da cópia que subiu por último. */
const idsNaNuvem = (servidor: ServidorFalso): string[] => {
  const ultima = servidor.gravacoesDaCopia.at(-1) as { dados?: { dados?: Record<string, string> } } | undefined
  return (JSON.parse(ultima?.dados?.dados?.['metanutri:pacientes'] ?? '[]') as { id: string }[]).map((p) => p.id)
}

const subiu = (servidor: ServidorFalso, desde: number, id: string) => servidor.gravacoesDaCopia.slice(desde).some((g) => JSON.stringify(g).includes(id))

/** Espera o Painel do app, fechando as boas-vindas se vierem. */
async function noPainel(aba: Page): Promise<void> {
  const painel = aba.getByRole('heading', { level: 1, name: 'Painel' })
  const boasVindas = aba.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await expect(painel.or(boasVindas)).toBeVisible({ timeout: 30_000 })
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await expect(painel).toBeVisible()
}

/** Na aba do app, um paciente novo; devolve o id dele. */
async function pacienteNovo(aba: Page): Promise<string> {
  await aba.evaluate(() => {
    window.location.hash = '#/pacientes'
  })
  await aba.getByRole('button', { name: 'Novo paciente' }).first().click()
  const id = await aba.evaluate((conta) => {
    const lista = JSON.parse(localStorage.getItem(`metanutri:conta:${conta}:pacientes`) ?? '[]') as { id: string }[]
    return lista.find((p) => p.id !== 'bia')?.id ?? ''
  }, CONTA)
  expect(id).not.toBe('')
  return id
}

/** "Continuar" numa aba do site; devolve a aba do app que ela abriu, já no Painel. */
async function continuar(contexto: BrowserContext, site: Page): Promise<Page> {
  await expect(site.getByRole('heading', { level: 1 })).toHaveText(TITULO)
  const [aba] = await Promise.all([contexto.waitForEvent('page'), site.getByRole('button', { name: 'Continuar' }).click()])
  await aba.waitForURL(/:4176\/#\/painel$/, { timeout: 30_000 })
  return aba
}

test('R9 (DP-SA-57), CA-1434 e CB-124: a troca com outra aba do app aberta; o paciente novo dessa aba sobe sem recarregar', async ({ context }) => {
  const abaA = await context.newPage()
  const servidor = await ligarServidorFalso(abaA, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await dadoSoNoSite(context)
  await abaA.goto(`${APP}/#/painel`)
  await noPainel(abaA)
  // O espaço da conta em dia no app: a mudança vai trocar (CA-1434).
  await expect
    .poll(
      () =>
        abaA.evaluate((conta) => {
          const s = JSON.parse(localStorage.getItem(`metanutri:conta:${conta}:nuvem`) ?? 'null') as { versao: string | null; mudancas: number; salvas: number } | null
          return s !== null && s.versao !== null && s.mudancas <= s.salvas
        }, CONTA),
      { timeout: 20_000 },
    )
    .toBe(true)

  const site = await context.newPage()
  await site.goto(`${SITE}/#/painel`)
  const abaM = await continuar(context, site)
  await expect(site.getByRole('status')).toHaveText(PRONTO, { timeout: 30_000 })
  await expect.poll(() => pacientesNaNuvem(servidor), { timeout: 20_000 }).toContain('Bia Souza')
  await abaM.close()

  // A aba A continua sincronizando: o paciente novo dela sobe sozinho.
  const antes = servidor.gravacoesDaCopia.length
  const novo = await pacienteNovo(abaA)
  await expect.poll(() => subiu(servidor, antes, novo), { timeout: 20_000 }).toBe(true)
})

test('R9 (DP-SA-57): pacote sem a situação, outra aba aberta e as leituras da aba nova falhando por 8 s; o que foi feito no app e o que veio do site ficam na nuvem, e o site recebe a confirmação', async ({ context }) => {
  const abaA = await context.newPage()
  const servidor = await ligarServidorFalso(abaA, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  // A rede da aba nova falha nas leituras da cópia por alguns segundos; a aba A continua com rede.
  let falharAte = 0
  await context.route(`${ENDERECO_FALSO}/rest/v1/copias**`, async (rota) => {
    const pedido = rota.request()
    if (Date.now() < falharAte && pedido.method() === 'GET' && pedido.frame().page() !== abaA) return rota.abort('internetdisconnected')
    await rota.fallback()
  })
  await dadoSoNoSite(context, false)
  await abaA.goto(`${APP}/#/painel`)
  await noPainel(abaA)
  // Um paciente feito no app, já na nuvem, e a conta em dia: a mudança vai trocar.
  const doApp = await pacienteNovo(abaA)
  await expect.poll(() => idsNaNuvem(servidor), { timeout: 20_000 }).toContain(doApp)
  await expect
    .poll(
      () =>
        abaA.evaluate((conta) => {
          const s = JSON.parse(localStorage.getItem(`metanutri:conta:${conta}:nuvem`) ?? 'null') as { versao: string | null; mudancas: number; salvas: number } | null
          return s !== null && s.versao !== null && s.mudancas <= s.salvas
        }, CONTA),
      { timeout: 20_000 },
    )
    .toBe(true)

  falharAte = Date.now() + 8_000
  const site = await context.newPage()
  await site.goto(`${SITE}/#/painel`)
  await continuar(context, site)
  // A confirmação chega depois da junta (não fica presa), e a nuvem tem os dois.
  await expect(site.getByRole('status')).toHaveText(PRONTO, { timeout: 60_000 })
  await expect.poll(() => idsNaNuvem(servidor).sort(), { timeout: 20_000 }).toEqual([BIA.id, doApp].sort())
  expect(await abaA.evaluate((conta) => localStorage.getItem(`metanutri:conta:${conta}:pacientes`) ?? '', CONTA)).toContain(doApp)
})

test('CB-507: duas abas do site com "Continuar": as duas abas do app abrem, a nuvem recebe, o site apaga e o app segue sincronizando', async ({ context }) => {
  const site1 = await context.newPage()
  const servidor = await ligarServidorFalso(site1, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await dadoSoNoSite(context)
  await site1.goto(`${SITE}/#/painel`)
  const site2 = await context.newPage()
  await site2.goto(`${SITE}/#/painel`)

  const app1 = await continuar(context, site1)
  const app2 = await continuar(context, site2)
  await noPainel(app1)
  await noPainel(app2)

  await expect.poll(() => pacientesNaNuvem(servidor), { timeout: 20_000 }).toContain('Bia Souza')
  await expect(site1.getByRole('status')).toHaveText(PRONTO, { timeout: 30_000 })
  const espacoNoSite = await site1.evaluate((conta) => Object.keys(localStorage).filter((k) => k.startsWith(`metanutri:conta:${conta}:`)), CONTA)
  expect(espacoNoSite).toEqual([])

  // As duas abas do app continuam vivas: o paciente novo da primeira sobe.
  const antes = servidor.gravacoesDaCopia.length
  const novo = await pacienteNovo(app1)
  await expect.poll(() => subiu(servidor, antes, novo), { timeout: 20_000 }).toBe(true)
})

// Spec separacao-site-app, D-512, D-513 e D-527: a mudança do que só existe no endereço antigo (aqui, o site em
// localhost:4178) para o app (localhost:4176, com o servidor de conta falso). Roda no Chromium, no Firefox e no WebKit
// (playwright.config.ts): a aba nova e o window.opener são o ponto frágil (R-512).
import { expect, test, type Page } from '@playwright/test'
import { ligarServidorFalso, PERFIL_NUTRICIONISTA, USUARIO_FALSO, type ServidorFalso } from '../apoio/servidorFalso.ts'

const TITULO = 'O MetaNutri mudou para app.metanutri.com.br'
const CONTA = USUARIO_FALSO.id
const BIA = { id: 'bia', nome: 'Bia Souza', criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm: '2026-10-20T00:00:00.000Z' }

/**
 * O dado que só existe no endereço antigo: a conta com um paciente que nunca chegou à nuvem. Posto uma vez, só no site
 * (a aba nova é do app, outro endereço, e começa sem nada).
 */
async function dadoSoNoSite(pagina: Page): Promise<void> {
  await pagina.addInitScript(
    ([conta, paciente]) => {
      if (location.port !== '4178' || sessionStorage.getItem('teste:posto')) return
      sessionStorage.setItem('teste:posto', '1')
      const espaco = `metanutri:conta:${conta}:`
      localStorage.setItem(`${espaco}nuvem`, JSON.stringify({ versao: null, mudancas: 1, salvas: 0, itens: 0, motor: 2 }))
      localStorage.setItem(`${espaco}pacientes`, JSON.stringify([paciente]))
      localStorage.setItem(`${espaco}mudancas`, JSON.stringify({ alterados: { [`pacientes/${paciente.id}`]: paciente.atualizadoEm }, excluidos: {} }))
      localStorage.setItem(`${espaco}aviso-inicial-visto`, '1')
      localStorage.setItem(`${espaco}aviso-nuvem-visto`, '1')
    },
    [CONTA, BIA] as const,
  )
}

/** Os pacientes da cópia que subiu por último para a nuvem falsa. */
const pacientesNaNuvem = (servidor: ServidorFalso): string[] => {
  const ultima = servidor.gravacoesDaCopia.at(-1) as { dados?: { dados?: Record<string, string> } } | undefined
  return (JSON.parse(ultima?.dados?.dados?.['metanutri:pacientes'] ?? '[]') as { nome: string }[]).map((p) => p.nome)
}

/**
 * O WebKit leva a sério o `upgrade-insecure-requests` da CSP também em `localhost` e pede os arquivos em https, que o
 * servidor de teste não tem. No ar tudo é https; aqui, o pedido volta ao http do mesmo servidor.
 */
test.beforeEach(async ({ context, browserName }) => {
  if (browserName !== 'webkit') return
  await context.route(/^https:\/\/localhost:(4176|4178)\//, async (rota) => {
    const resposta = await rota.fetch({ url: rota.request().url().replace(/^https:/, 'http:') })
    // Da página em http, o arquivo em https é de outra origem: o módulo e o manifesto pedem a permissão.
    await rota.fulfill({ response: resposta, headers: { ...resposta.headers(), 'access-control-allow-origin': '*' } })
  })
})

const espacoNoSite = (pagina: Page) => pagina.evaluate((conta) => Object.keys(localStorage).filter((chave) => chave.startsWith(`metanutri:conta:${conta}:`)), CONTA)

test('CA-1429 a CA-1431, CA-1433 e CA-1436: tela do app com dado só no site: "Continuar", a aba nova traz os dados, a nuvem recebe e o site apaga', async ({ page, context }) => {
  // A sessão do app vem pronta (a pessoa já entrou na aba nova); o site a apaga do lado dele (D-511).
  const servidor = await ligarServidorFalso(page, { sessao: true, perfil: PERFIL_NUTRICIONISTA })
  await dadoSoNoSite(page)
  await page.goto('/#/painel')

  // CA-1429: com dado só aqui, a tela do app no site para em "Continuar", só com esse botão.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITULO)
  await expect(page.getByRole('status')).toHaveText('Clique em Continuar e entre na sua conta. Os dados deste navegador vão junto.')
  await expect(page.getByRole('button')).toHaveText(['Continuar'])
  await expect(page).toHaveURL(/:4178\/#\/painel$/)

  // CA-1430: o app abre em aba nova, em #/mudanca/<código>.
  const [aba] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Continuar' }).click()])
  await expect(page.getByRole('status')).toHaveText('Entre na sua conta na aba que abriu. Deixe esta aba aberta.')
  await aba.waitForURL(/^http:\/\/localhost:4176\/#\/(mudanca\/[0-9a-f]{32}|painel)$/)

  // CA-1431 e CA-1433: a aba nova recebe os dados, abre no Painel e o que veio sobe para a nuvem.
  await aba.waitForURL(/:4176\/#\/painel$/)
  await expect.poll(() => pacientesNaNuvem(servidor), { timeout: 20_000 }).toEqual(['Bia Souza'])

  // CA-1436: com a nuvem em dia, o app confirma; o site apaga o espaço da conta e diz que pode fechar.
  await expect(page.getByRole('status')).toHaveText('Pronto. Pode fechar esta aba.', { timeout: 20_000 })
  expect(await espacoNoSite(page)).toEqual([])
  await expect(page.getByRole('button')).toHaveCount(0)
})

test('CA-1429: com dado só no site, "Entrar" também para em "Continuar", e nada sai do site antes da confirmação', async ({ page }) => {
  await ligarServidorFalso(page, {})
  await dadoSoNoSite(page)
  await page.goto('/')
  await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITULO)
  await expect(page).toHaveURL(/:4178\/$/)
  expect((await espacoNoSite(page)).length).toBeGreaterThan(0)
})

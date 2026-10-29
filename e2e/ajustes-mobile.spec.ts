import { expect, test, type Locator, type Page } from '@playwright/test'
import { semRolagemLateral } from './apoio/fumaca.ts'

// Spec ajustes-mobile (CA-1800): as falhas do celular da área de trabalho que a auditoria de 29/10/2026 achou, cada uma
// com o ID dela (M-xxx), nas larguras e com os dados que a auditoria usou. D-800: nenhuma tela rola para o lado; D-801:
// o nome que identifica quebra em até 2 linhas e mostra o resto no `title`; D-802: toque de 44 px; D-804: nada fixo
// passa de 15% da altura de 360 × 740.

test.use({ reducedMotion: 'reduce' })

const CELULARES = [360, 390, 412] as const
const ALTURA = 740

/** Navegador limpo, sem o aviso de primeiro acesso. */
async function abrirLimpo(pagina: Page): Promise<void> {
  await pagina.goto('/#/painel')
  await pagina.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('metanutri:aviso-inicial-visto', '1')
  })
  await pagina.reload()
}

/** O plano de exemplo, aberto na etapa 2. Devolve o id. */
async function criarExemplo(pagina: Page): Promise<string> {
  await abrirLimpo(pagina)
  await pagina.getByRole('button', { name: 'Ver um plano de exemplo' }).click()
  await expect(pagina).toHaveURL(/#\/caso\/[^/]+\/plano$/)
  return decodeURIComponent(pagina.url().split('#/caso/')[1]?.split('/')[0] ?? '')
}

interface PlanoSemeado {
  readonly id: string
  readonly nome: string
  readonly pacienteId?: string
}

/** Copia o plano de exemplo com outros nomes (e ids), com os pacientes dados. Recarrega. */
async function semear(pagina: Page, exemplo: string, planos: readonly PlanoSemeado[], pacientes: readonly { readonly id: string; readonly nome: string }[]) {
  await pagina.evaluate(
    ({ exemplo, planos, pacientes }) => {
      const agora = new Date().toISOString()
      localStorage.setItem('metanutri:pacientes', JSON.stringify(pacientes.map((p) => ({ ...p, criadoEm: agora, atualizadoEm: agora }))))
      const base = JSON.parse(localStorage.getItem(`metanutri:caso:${exemplo}`) ?? '{}') as { caso: Record<string, unknown> }
      for (const plano of planos) {
        const copia = structuredClone(base)
        copia.caso['id'] = plano.id
        copia.caso['nome'] = plano.nome
        copia.caso['pacienteId'] = plano.pacienteId ?? null
        localStorage.setItem(`metanutri:caso:${plano.id}`, JSON.stringify(copia))
      }
      localStorage.removeItem(`metanutri:caso:${exemplo}`)
      localStorage.setItem('metanutri:casos', JSON.stringify(planos.map((p) => p.id)))
    },
    { exemplo, planos, pacientes },
  )
  await pagina.reload()
}

/** Quanto do texto ficou de fora da caixa: na largura (corte de uma linha) e na altura (mais linhas que o limite). */
const corte = (alvo: Locator) => alvo.evaluate((el) => ({ largura: el.scrollWidth - el.clientWidth, altura: el.scrollHeight - el.clientHeight }))

async function inteiroAVista(alvo: Locator, rotulo: string): Promise<void> {
  const c = await corte(alvo)
  expect(c.largura, `${rotulo}: cortado na largura`).toBeLessThanOrEqual(1)
  expect(c.altura, `${rotulo}: cortado na altura`).toBeLessThanOrEqual(1)
}

async function dentroDaTela(alvo: Locator, rotulo: string): Promise<void> {
  const caixa = await alvo.boundingBox()
  const largura = await alvo.page().evaluate(() => document.documentElement.clientWidth)
  expect(caixa, rotulo).not.toBeNull()
  expect(caixa?.x ?? -1, `${rotulo}: começa fora da tela`).toBeGreaterThanOrEqual(0)
  expect((caixa?.x ?? 0) + (caixa?.width ?? 0), `${rotulo}: passa da tela`).toBeLessThanOrEqual(largura + 0.5)
}

// --------------------------------------------------------------------------------------------- M-001 · Meus alimentos

const SEM_ESPACO = 'SuperProteinBarChocolateBrownieCookiesAndCreamZeroLactose'
const BISCOITO = 'Biscoito integral recheado sabor chocolate meio amargo com castanha-do-pará e granola crocante (pacote família)'

const produto = (id: number, nome: string, marca: string) => ({
  id,
  codigoBarras: '',
  nome,
  marca,
  porcaoG: 30,
  medidaCaseira: '1 unidade',
  porPorcao: { energia_kcal: 142, proteina_g: 2.1, lipideos_g: 5.3, carboidrato_g: 20.2, sodio_mg: 95 },
  criadoEm: '2026-10-29T10:00:00.000Z',
  tipo: 'alimento',
  nomeParaPaciente: '',
  grupo: 'Produtos açucarados',
  preparo: 'pronto para consumo',
  unidade: 'g',
  base: 'porcao',
  medidas: [{ nome: 'unidade', gramas: 30 }],
  fonte: { tipo: 'rotulo' },
  observacoes: '',
  sugerirAutomaticamente: false,
  atualizadoEm: '2026-10-29T10:00:00.000Z',
})

for (const largura of CELULARES) {
  test(`M-001: em ${largura} px, Meus alimentos com nome sem espaço não rola para o lado e Editar/Excluir ficam na tela`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await abrirLimpo(page)
    await page.evaluate(
      (produtos) => localStorage.setItem('metanutri:produtos', JSON.stringify(produtos)),
      [produto(900_000, BISCOITO, 'Indústria e Comércio de Alimentos Integrais do Nordeste Ltda.'), produto(900_001, SEM_ESPACO, 'Marca')],
    )
    await page.goto('/#/produtos')
    const lista = page.getByRole('list', { name: 'Alimentos cadastrados' })
    await expect(lista.getByRole('listitem')).toHaveCount(2)
    await semRolagemLateral(page)
    for (const nome of [SEM_ESPACO, BISCOITO]) {
      await dentroDaTela(page.getByRole('button', { name: `Editar ${nome}` }), `Editar ${nome}`)
      await dentroDaTela(page.getByRole('button', { name: `Excluir ${nome}` }), `Excluir ${nome}`)
      // D-801: até 2 linhas, sem estourar o cartão, e o nome inteiro no `title`.
      const titulo = lista.getByRole('heading', { name: nome })
      await expect(titulo).toHaveAttribute('title', nome)
      expect((await corte(titulo)).largura, `${nome}: passa do cartão`).toBeLessThanOrEqual(1)
    }
    // O diálogo Editar abre dentro da tela (a auditoria o mediu com 672 px, fora do centro).
    await page.getByRole('button', { name: `Editar ${SEM_ESPACO}` }).click()
    await dentroDaTela(page.getByRole('dialog'), 'diálogo Editar')
  })
}

// --------------------------------------------------------------------------------------------- M-007 · Planos e Pacientes

test.describe('M-007: nomes de planos e pacientes que só mudam no fim', () => {
  const PACIENTES = [
    { id: 'p1', nome: 'Francisca das Chagas Nascimento Bezerra 01' },
    { id: 'p2', nome: 'Francisca das Chagas Nascimento Bezerra 02' },
  ]
  const PLANOS: readonly PlanoSemeado[] = [
    { id: 'a', nome: 'Plano de reeducação alimentar — Ana', pacienteId: 'p1' },
    { id: 'b', nome: 'Plano de reeducação alimentar — Bia', pacienteId: 'p2' },
    { id: 'c', nome: 'Reeducação alimentar — ciclo 1', pacienteId: 'p1' },
    { id: 'd', nome: 'Reeducação alimentar — ciclo 2', pacienteId: 'p1' },
  ]

  for (const largura of CELULARES) {
    test(`em ${largura} px, Planos, Pacientes e o histórico da ficha mostram o nome inteiro`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: ALTURA })
      const exemplo = await criarExemplo(page)
      await semear(page, exemplo, PLANOS, PACIENTES)

      await page.goto('/#/casos')
      const planos = page.getByRole('list', { name: 'Planos salvos' })
      for (const plano of PLANOS) await inteiroAVista(planos.getByRole('heading', { name: plano.nome }), plano.nome)
      // Em Planos, o nome do paciente também aparece no cartão.
      await expect(planos.getByRole('listitem').filter({ hasText: 'Plano de reeducação alimentar — Bia' })).toContainText('Francisca das Chagas Nascimento Bezerra 02')
      await semRolagemLateral(page)

      await page.goto('/#/pacientes')
      const pacientes = page.getByRole('list', { name: 'Pacientes' })
      for (const paciente of PACIENTES) await inteiroAVista(pacientes.getByRole('heading', { name: paciente.nome }), paciente.nome)
      await semRolagemLateral(page)

      await page.goto('/#/paciente/p1')
      const historico = page.getByRole('list', { name: 'Planos do paciente' })
      for (const nome of ['Reeducação alimentar — ciclo 1', 'Reeducação alimentar — ciclo 2']) await inteiroAVista(historico.getByText(nome, { exact: true }), nome)
      await semRolagemLateral(page)
    })
  }
})

// --------------------------------------------------------------------------------------------- M-008 · Tabela de alimentos

for (const largura of CELULARES) {
  test(`M-008: em ${largura} px, "com sal" e "sem sal" da margarina aparecem inteiros na tabela de alimentos`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: ALTURA })
    await abrirLimpo(page)
    await page.goto('/#/alimentos')
    await page.getByRole('searchbox', { name: 'Buscar alimento na tabela' }).fill('margarina interesterificado')
    const itens = page.getByRole('list', { name: 'Alimentos da tabela' }).getByRole('button').filter({ hasText: /Margarina, com óleo interesterificado/ })
    await expect(itens).toHaveCount(2)
    for (const item of await itens.all()) await inteiroAVista(item.locator('p > span').first(), await item.innerText())
  })
}

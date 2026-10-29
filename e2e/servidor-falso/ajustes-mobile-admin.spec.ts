import { expect, test, type Locator, type Page } from '@playwright/test'
import { ENDERECO_FALSO, PERFIL_NUTRICIONISTA, USUARIO_FALSO, assinaturaFalsa, ligarServidorFalso } from '../apoio/servidorFalso.ts'

// Spec ajustes-mobile (auditoria de 29/10/2026): Aprovações e Negócio, as telas do administrador, no celular, com os
// dados de pior caso da auditoria (e-mail de 82 caracteres, receita de R$ 24 milhões, 400 contas).

test.use({ reducedMotion: 'reduce' })

const EMAIL_LONGO = 'maria.aparecida.dos.santos.oliveira.nutricao2026@aluno.universidadefederal.edu.br'
const EMAIL_DO_CRN = 'bartholomew.fitzgerald@northwind-industries-holdings.example.com'
const CHAVE_DA_SESSAO = 'sb-falso-e2e-auth-token'

/** A sessão do administrador, confirmada pelo código (aal2): sem ela, Negócio e Aprovações pedem o segundo fator. */
function sessaoDeAdministrador() {
  const agora = Math.floor(Date.now() / 1000)
  const validoAte = agora + 24 * 3600
  const b64 = (texto: string) => Buffer.from(texto).toString('base64url')
  const corpo = { sub: USUARIO_FALSO.id, email: USUARIO_FALSO.email, role: 'authenticated', aud: 'authenticated', exp: validoAte, iat: agora, aal: 'aal2', session_id: 's1', amr: [{ method: 'password', timestamp: agora }] }
  return {
    access_token: `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify(corpo))}.assinatura-falsa`,
    refresh_token: 'refresh-falso',
    token_type: 'bearer',
    expires_in: 24 * 3600,
    expires_at: validoAte,
    user: { id: USUARIO_FALSO.id, aud: 'authenticated', role: 'authenticated', email: USUARIO_FALSO.email, email_confirmed_at: '2026-10-01T12:00:00Z', user_metadata: { nome: USUARIO_FALSO.nome }, app_metadata: { provider: 'email' }, identities: [{ id: 'i1' }], created_at: '2026-10-01T12:00:00Z', factors: [] },
  }
}

/** A fila de Aprovações da auditoria: o primeiro pedido e o primeiro CRN com o e-mail enorme. */
function aprovacoes(pior: boolean) {
  const n = pior ? 40 : 2
  const pedidos = Array.from({ length: n }, (_, k) => ({
    id: `ped${k}`,
    usuario: `u${k}`,
    nome: k === 0 && pior ? 'Aleksandra Wiśniewska-Kowalczyk de Albuquerque e Vasconcellos' : `Estudante ${k + 1} Souza`,
    email: k === 0 && pior ? EMAIL_LONGO : `estudante${k}@ufrn.edu.br`,
    instituicao: pior ? 'Universidade Federal do Rio Grande do Norte — Centro de Ciências da Saúde (campus Central)' : 'UFRN',
    matricula: pior ? '2023123456789012345678' : '20231234',
    periodo: 5,
    formatura: '2028-12-01',
    enviado_em: '2026-10-20T12:00:00Z',
    arquivo: 'u0/comprovante.pdf',
  }))
  const crns = Array.from({ length: n }, (_, k) => ({
    usuario: `c${k}`,
    nome: k === 0 && pior ? 'Christopher Alexander Montgomery de Albuquerque III' : `Nutri ${k + 1}`,
    email: k === 0 && pior ? EMAIL_DO_CRN : `nutri${k}@exemplo.com`,
    crn_regiao: 3,
    crn_numero: pior ? '123456789/P' : '12345',
    conta_criada_em: '2026-10-20T12:00:00Z',
    crn_status: ['em_conferencia', 'conferido', 'nao_encontrado'][k % 3],
    crn_decidido_em: null,
  }))
  return { pedidos, crns }
}

/** O Negócio da auditoria: 6 contas no normal, 400 no pior, com a Clínica de R$ 1.234.567,89. */
function negocio(pior: boolean) {
  const n = pior ? 400 : 6
  const planos = ['free', 'estudante', 'solo', 'pro', 'clinica']
  const contas = Array.from({ length: n }, (_, k) => {
    const plano = planos[k % 5] ?? 'free'
    const valor = plano === 'solo' ? (k % 2 ? 29900 : 3490) : plano === 'pro' ? (k % 2 ? 59900 : 6490) : plano === 'clinica' ? (pior ? 123456789 : 14900) : 0
    return {
      id: `conta${k}`,
      nome: k === 0 && pior ? 'Maria Aparecida dos Santos Wiśniewska-Kowalczyk de Albuquerque e Vasconcellos' : k === 1 ? '' : `Conta ${k + 1}`,
      email: k === 0 && pior ? EMAIL_LONGO : `conta${k}@exemplo.com`,
      criada_em: `2026-${String(1 + (k % 10)).padStart(2, '0')}-10T12:00:00Z`,
      email_confirmado_em: k % 4 ? '2026-10-10T12:00:00Z' : null,
      ultimo_login_em: k % 3 ? '2026-10-28T12:00:00Z' : null,
      situacao: k % 2 ? 'nutricionista' : 'estudante',
      crn_regiao: k % 2 ? 3 : null,
      crn_status: k % 2 ? 'conferido' : null,
      pedido_status: k % 2 ? null : 'em_analise',
      plano,
      status: ['ativa', 'pendente', 'pausada', 'cancelada'][k % 4],
      ciclo: k % 2 ? 'anual' : 'mensal',
      valor_centavos: valor,
      expira_em: null,
      assinatura_atualizada_em: '2026-10-10T12:00:00Z',
    }
  })
  const historico = contas.map((c, k) => ({ nutricionista_id: c.id, plano: c.plano, status: 'ativa', ciclo: c.ciclo, valor_centavos: c.valor_centavos, quando: `2026-${String(1 + (k % 10)).padStart(2, '0')}-11T12:00:00Z` }))
  return { contas, historico, uso: { links_30_dias: pior ? 1234567 : 12, copias_30_dias: pior ? 98765 : 40 } }
}

/** Entra como administrador e abre a tela. As funções do administrador respondem aqui; o resto, o servidor falso. */
async function abrirComoAdministrador(pagina: Page, tela: 'aprovacoes' | 'negocio', pior: boolean): Promise<void> {
  await ligarServidorFalso(pagina, { perfil: PERFIL_NUTRICIONISTA, assinatura: assinaturaFalsa('ativa', 'pro') })
  const contexto = pagina.context()
  await contexto.addInitScript(([chave, valor]) => {
    if (!localStorage.getItem(chave)) localStorage.setItem(chave, valor)
  }, [CHAVE_DA_SESSAO, JSON.stringify(sessaoDeAdministrador())] as const)
  const fila = aprovacoes(pior)
  const dados = negocio(pior)
  const respostas: Readonly<Record<string, unknown>> = {
    '/rest/v1/rpc/eh_admin': true,
    '/rest/v1/rpc/admin_sem_segundo_fator': false,
    '/rest/v1/rpc/pedidos_em_analise': fila.pedidos,
    '/rest/v1/rpc/crn_para_conferir': fila.crns,
    '/rest/v1/rpc/comprovantes_para_apagar': [],
    '/rest/v1/rpc/painel_contas': dados.contas,
    '/rest/v1/rpc/painel_historico_assinaturas': dados.historico,
    '/rest/v1/rpc/painel_uso': [dados.uso],
  }
  await contexto.route(`${ENDERECO_FALSO}/rest/v1/rpc/**`, async (route) => {
    const caminho = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS' || !(caminho in respostas)) return route.fallback()
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(respostas[caminho]) })
  })
  await pagina.goto(`/#/${tela}`)
  const titulo = pagina.getByRole('heading', { level: 1, name: tela === 'aprovacoes' ? 'Aprovações' : 'Negócio' })
  const boasVindas = pagina.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
  await expect(titulo.or(boasVindas)).toBeVisible()
  if (await boasVindas.isVisible()) await boasVindas.getByRole('button', { name: 'Entendi' }).click()
  await expect(titulo).toBeVisible()
}

interface Caixa {
  readonly esquerda: number
  readonly direita: number
  readonly topo: number
  readonly base: number
}

/** A caixa do elemento. */
const caixaDe = (alvo: Locator): Promise<Caixa> =>
  alvo.evaluate((el) => {
    const q = el.getBoundingClientRect()
    return { esquerda: q.left, direita: q.right, topo: q.top, base: q.bottom }
  })

/** A caixa do texto, não a do elemento: o texto que transborda (ou que a borda corta) passa da caixa do elemento. */
const caixaDoTexto = (alvo: Locator): Promise<Caixa> =>
  alvo.evaluate((el) => {
    const faixa = document.createRange()
    faixa.selectNodeContents(el)
    const q = faixa.getBoundingClientRect()
    return { esquerda: q.left, direita: q.right, topo: q.top, base: q.bottom }
  })

/** A largura da tela: a janela de layout, sem a barra de rolagem. */
const caixaDaTela = (pagina: Page): Promise<Caixa> =>
  pagina.evaluate(() => ({ esquerda: 0, direita: document.documentElement.clientWidth, topo: -Infinity, base: Infinity }))

const semRolagemLateral = async (pagina: Page) => {
  const medida = await pagina.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: document.documentElement.clientWidth }))
  expect(medida.documento, 'a página rola para o lado').toBeLessThanOrEqual(medida.janela)
}

const dentroDe = (dentro: Caixa, fora: Caixa, nome: string) => {
  expect(dentro.esquerda, `${nome}: passa da esquerda`).toBeGreaterThanOrEqual(fora.esquerda - 0.5)
  expect(dentro.direita, `${nome}: passa da direita`).toBeLessThanOrEqual(fora.direita + 0.5)
}

for (const largura of [360, 390, 412]) {
  test.describe(`Aprovações › Estudantes em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 }, hasTouch: true })

    test('M-004: o e-mail sem quebra não alarga a página, e Aprovar e Recusar ficam à vista', async ({ page }) => {
      await abrirComoAdministrador(page, 'aprovacoes', true)
      const pedido = page.getByRole('region', { name: /Aleksandra/ })
      await expect(pedido).toBeVisible()
      await semRolagemLateral(page)
      const tela = await caixaDaTela(page)
      dentroDe(await caixaDe(pedido), tela, 'pedido aberto')
      dentroDe(await caixaDoTexto(pedido.getByText(EMAIL_LONGO, { exact: true })), await caixaDe(pedido), 'e-mail')
      // A matrícula longa, no mesmo pedido, não invade a coluna ao lado (M-011 cita esta linha).
      const matricula = pedido.getByText('2023123456789012345678', { exact: true })
      dentroDe(await caixaDoTexto(matricula), await caixaDe(matricula), 'matrícula')
      for (const nome of ['Recusar', 'Aprovar']) dentroDe(await caixaDe(pedido.getByRole('button', { name: nome })), tela, nome)
    })
  })
}

for (const largura of [412, 768]) {
  test.describe(`Aprovações › CRN em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 900 }, hasTouch: true })

    test('M-017: o e-mail sem quebra fica na coluna do nome, sem cruzar o número do CRN', async ({ page }) => {
      await abrirComoAdministrador(page, 'aprovacoes', true)
      await page.getByRole('radio', { name: /^CRN/ }).click()
      const linha = page.getByRole('listitem').filter({ hasText: 'Christopher Alexander' })
      const campoEmail = linha.getByText(EMAIL_DO_CRN, { exact: true })
      const email = await caixaDoTexto(campoEmail)
      const crn = await caixaDoTexto(linha.getByText(/123456789\/P/))
      const cruza = email.esquerda < crn.direita && crn.esquerda < email.direita && email.topo < crn.base && crn.topo < email.base
      expect(cruza, 'o e-mail cruza o CRN').toBe(false)
      dentroDe(email, await caixaDe(campoEmail.locator('xpath=..')), 'e-mail na coluna do nome')
      await semRolagemLateral(page)
    })
  })
}

test.describe('Negócio no celular (360 px)', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

  test('M-014: a receita de R$ 24 milhões cabe no cartão e a página não rola para o lado', async ({ page }) => {
    await abrirComoAdministrador(page, 'negocio', true)
    const resumo = page.getByRole('region', { name: 'Resumo do negócio' })
    await expect(resumo).toBeVisible()
    await semRolagemLateral(page)
    const receita = resumo.getByText(/^R\$\s24\.693\.353,80$/)
    const cartao = receita.locator('xpath=ancestor::div[1]')
    dentroDe(await caixaDoTexto(receita), await caixaDe(cartao), 'receita')
    dentroDe(await caixaDe(cartao), await caixaDe(resumo), 'cartão da receita')
    dentroDe(await caixaDe(resumo), await caixaDaTela(page), 'cartões')
  })

  test('M-015: o valor escrito no gráfico cabe no cartão (dados normais)', async ({ page }) => {
    await abrirComoAdministrador(page, 'negocio', false)
    const cartao = page.getByRole('region', { name: 'Receita por mês' })
    const barras = cartao.getByRole('list', { name: 'Receita por mês' }).getByRole('listitem')
    // O valor escrito em cima da barra do mês, à vista (a dica fica transparente até o toque).
    const escrito = barras.last().locator('span', { hasText: /^R\$/ }).filter({ visible: true }).first()
    await expect(escrito).toBeVisible()
    expect(await escrito.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    dentroDe(await caixaDoTexto(escrito), await caixaDe(cartao), 'valor escrito')
  })

  test('M-015: na tabela por plano, o valor do mês cabe na linha e alinha com "Por mês" (pior caso)', async ({ page }) => {
    await abrirComoAdministrador(page, 'negocio', true)
    const cartao = page.getByRole('region', { name: 'Assinaturas por plano' })
    const cabecalho = await caixaDoTexto(cartao.getByText('Por mês', { exact: true }))
    const linhas = await cartao.getByRole('listitem').all()
    expect(linhas.length).toBeGreaterThan(0)
    for (const linha of linhas) {
      const valor = linha.getByText(/^R\$/).last()
      const v = await caixaDoTexto(valor)
      dentroDe(v, await caixaDe(linha), (await valor.textContent()) ?? 'valor')
      expect(Math.abs(v.direita - cabecalho.direita), 'alinhado com o cabeçalho').toBeLessThanOrEqual(1)
    }
  })

  test('M-016: as contas viram cartões, 50 por vez, e o seletor de grupo mostra que rola', async ({ page }) => {
    await abrirComoAdministrador(page, 'negocio', true)
    await expect(page.getByRole('table')).toBeHidden()
    const lista = page.getByRole('list', { name: 'Contas' })
    await expect(lista.getByRole('listitem')).toHaveCount(50)
    await semRolagemLateral(page)
    // Antes, as 400 contas davam 30.555 px de página.
    expect(await page.evaluate(() => document.documentElement.scrollHeight), 'altura da página').toBeLessThan(15_000)
    await page.getByRole('button', { name: 'Mostrar mais 50' }).click()
    await expect(lista.getByRole('listitem')).toHaveCount(100)

    // A conta do e-mail enorme é a mais antiga: a busca a traz (e volta a mostrar do começo).
    await page.getByRole('searchbox', { name: 'Buscar nome ou e-mail' }).fill('maria aparecida')
    await expect(lista.getByRole('listitem')).toHaveCount(1)
    const tela = await caixaDaTela(page)
    const cartao = lista.getByRole('listitem')
    for (const texto of [EMAIL_LONGO, 'Estudante', 'Comprovante em análise', 'Situação', 'Plano']) {
      dentroDe(await caixaDoTexto(cartao.getByText(texto, { exact: true })), tela, texto)
    }
    await semRolagemLateral(page)
    await page.getByRole('searchbox', { name: 'Buscar nome ou e-mail' }).fill('')

    const seletor = page.getByRole('radiogroup', { name: 'Grupo de contas' })
    const mascara = await seletor.evaluate((el) => {
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        const m = getComputedStyle(p).maskImage
        if (m && m !== 'none') return m
      }
      return 'none'
    })
    expect(mascara, 'sem degradê na borda do seletor').not.toBe('none')
    const ultima = page.getByRole('radio', { name: 'Assinantes' })
    await ultima.scrollIntoViewIfNeeded()
    dentroDe(await caixaDe(ultima), tela, 'Assinantes')
  })
})

test.describe('Negócio no computador (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('M-016: no computador, as contas continuam na tabela de cinco colunas', async ({ page }) => {
    await abrirComoAdministrador(page, 'negocio', false)
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('columnheader')).toHaveText(['Pessoa', 'Situação', 'Plano', 'Criou a conta', 'Último acesso'])
    await expect(page.getByRole('list', { name: 'Contas' })).toBeHidden()
  })
})

import { expect, test, type Page } from '@playwright/test'
import { semRolagemLateral, vigiarConsole } from '../apoio/fumaca.ts'
import { DIETA_GUARDADA, ligarServidorFalso, linkFalso, type Linha, type ServidorFalso } from '../apoio/servidorFalso.ts'

/**
 * Spec lado-do-paciente (T30 do PLAN): o fluxo do paciente num celular de 390 px, com o link lido da nuvem pelo servidor
 * falso. O endereço fixo, Hoje, Plano e Semana com a barra de baixo, a folha "Meu plano", receber o link por e-mail, o
 * aparelho que lembra, o link que não abre, a página do aceite e a tela de 360 a 412 px com a letra a 200%.
 */

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })

/** Um token como os do app (12 a 64 letras minúsculas e números): só ele abre em `/p/<token>`. */
const TOKEN = 'k7q2mx9pla3r'
const MASCARADO = 'j•••a@gmail.com'

/** Juliana, com a dieta do exemplo, três missões de refeição e a da água, a mensagem e a próxima consulta. */
function linkDaJuliana(parcial: Linha = {}): Linha {
  return linkFalso({
    token: TOKEN,
    nome: 'Juliana Martins',
    dieta: DIETA_GUARDADA,
    missoes: [
      { id: 'refeicao-1', texto: 'Desjejum por volta das 6h', origem: 'Refeição do plano' },
      { id: 'refeicao-3', texto: 'Almoço por volta das 12h', origem: 'Refeição do plano' },
      { id: 'refeicao-5', texto: 'Jantar por volta das 19h', origem: 'Refeição do plano' },
      { id: 'agua', texto: 'Beber 2 litros de água', origem: '35 ml por kg de peso' },
    ],
    mensagem: 'Capriche na água nos dias de treino.',
    mensagem_em: '2026-11-03T12:00:00Z',
    // Uma terça bem à frente: a consulta que já passou some (D-145).
    proxima_consulta: '2027-03-16T14:30',
    ultimo_acesso: null,
    plano_em: '2026-11-03T12:00:00Z',
    nutricionista: 'Ana Lima',
    email_mascarado: MASCARADO,
    avisos: { plano: 'desligado', semana: 'desligado', lembrete: 'desligado' },
    ...parcial,
  })
}

async function abrirLinkDaJuliana(pagina: Page, parcial: Linha = {}): Promise<ServidorFalso> {
  const servidor = await ligarServidorFalso(pagina, {
    link: linkDaJuliana(parcial),
    funcoes: {
      'meu-link': (corpo) =>
        corpo['acao'] === 'recuperar'
          ? { corpo: { ok: true } }
          : // D-1247: o e-mail digitado sempre pede o "Confirmar" do e-mail.
            { corpo: { enviadoPara: MASCARADO, confirmar: typeof corpo['email'] === 'string' || (Array.isArray(corpo['avisos']) && corpo['avisos'].length > 0), confirmarEmail: typeof corpo['email'] === 'string' } },
    },
  })
  await pagina.goto(`/p/${TOKEN}`)
  await expect(pagina.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Juliana' })).toBeVisible()
  return servidor
}

const barraDeBaixo = (pagina: Page) => pagina.getByRole('navigation', { name: 'Partes do plano' })

test('CA-2220, CA-2200 a CA-2203 e CA-2239: o endereço antigo vira /p/<token>; Hoje com a barra de baixo; marcar vai para a nuvem; o acesso fica anotado', async ({ page }) => {
  const erros = await vigiarConsole(page)
  const servidor = await ligarServidorFalso(page, { link: linkDaJuliana() })
  await page.goto(`/#/missoes/${TOKEN}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Juliana' })).toBeVisible()
  // CA-2220: a mesma tela, no endereço novo, sem recarregar.
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/p/${TOKEN}`)
  expect(new URL(page.url()).hash).toBe('')

  // CA-2200: com dieta, Hoje, Plano e Semana; abre em Hoje, marcada.
  const barra = barraDeBaixo(page)
  await expect(barra.getByRole('link')).toHaveText(['Hoje', 'Plano', 'Semana'])
  await expect(barra.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page')

  // CA-2212 e CA-2214: a mensagem com o nome dela e a próxima consulta abaixo.
  await expect(page.getByText('Capriche na água nos dias de treino.')).toBeVisible()
  await expect(page.getByText('Próxima consulta: ter., 16/03, às 14:30')).toBeVisible()

  // CA-2202 e CA-2203: quatro missões, nenhuma feita; marcar enche um segmento e grava.
  const progresso = page.getByRole('progressbar', { name: 'Missões feitas hoje' })
  await expect(progresso).toHaveAttribute('aria-valuetext', '0 de 4 feitas')
  const agua = page.getByRole('button', { name: /Beber 2 litros de água/ })
  await agua.click()
  await expect(agua).toHaveAttribute('aria-pressed', 'true')
  await expect(progresso).toHaveAttribute('aria-valuetext', '1 de 4 feitas')
  await expect.poll(() => servidor.chamadasDoBanco.filter((c) => c.nome === 'marcar_missoes').length).toBe(1)
  // Tocar de novo volta.
  await agua.click()
  await expect(agua).toHaveAttribute('aria-pressed', 'false')
  await expect(progresso).toHaveAttribute('aria-valuetext', '0 de 4 feitas')

  // CA-2239: o link anota o dia em que foi aberto, pelo token.
  const acessos = servidor.chamadasDoBanco.filter((c) => c.nome === 'registrar_acesso')
  expect(acessos.length).toBeGreaterThanOrEqual(1)
  expect(acessos[0]?.corpo).toEqual({ p_token: TOKEN })
  expect(erros).toEqual([])
})

test('CA-2206, CA-2207 e CA-2211: "Ver" abre o Plano na refeição; "Marcar como feita" marca a de Hoje; Semana conta o dia', async ({ page }) => {
  await abrirLinkDaJuliana(page)
  const barra = barraDeBaixo(page)

  // CA-2206: "Ver" leva ao Plano, sem marcar.
  const almocoEmHoje = page.getByRole('button', { name: /Almoço por volta das 12h/ })
  await page.getByRole('button', { name: 'Ver o almoço no plano' }).click()
  await expect(barra.getByRole('link', { name: 'Plano' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { level: 1, name: 'Seu plano alimentar, Juliana' })).toBeVisible()
  const almoco = page.getByRole('region', { name: '12:00 Almoço' })
  await expect(almoco).toBeInViewport()
  // CA-2208: três opções no almoço.
  await expect(almoco.getByRole('tab')).toHaveText(['Opção 1', 'Opção 2', 'Opção 3'])

  // CA-2207: marcar no Plano marca a missão de Hoje.
  await almoco.getByRole('button', { name: 'Marcar como feita' }).click()
  await expect(almoco.getByRole('button', { name: 'Feita hoje' })).toBeVisible()
  await barra.getByRole('link', { name: 'Hoje' }).click()
  await expect(almocoEmHoje).toHaveAttribute('aria-pressed', 'true')

  // CA-2211: Semana com o dia de hoje marcado e a meta.
  await barra.getByRole('link', { name: 'Semana' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sua semana' })).toBeVisible()
  await expect(page.getByText('1 de 7 dias')).toBeVisible()
  await expect(page.getByText('A meta é 4 dias.')).toBeVisible()
  await expect(page.getByText('Próxima consulta: terça, 16 de março, às 14:30')).toBeVisible()
})

test('CA-2219, CA-2235, CA-2236 e CA-2240: Mais › "Receber meu link por e-mail", com a correção do domínio e um aviso', async ({ page }) => {
  const servidor = await abrirLinkDaJuliana(page)
  await page.getByRole('button', { name: 'Mais opções' }).click()

  // CA-2219: a folha com os dois nomes e os itens, "Esquecer neste aparelho" por último.
  const folha = page.getByRole('dialog', { name: 'Meu plano' })
  await expect(folha).toContainText('Juliana · com Ana Lima')
  const itens = folha.getByRole('button').filter({ hasNotText: /Fechar/ })
  await expect(itens.last()).toHaveText('Esquecer neste aparelho')
  await expect(folha.getByRole('button', { name: /Avisos por e-mail/ })).toContainText('Desligados')
  await folha.getByRole('button', { name: 'Receber meu link por e-mail' }).click()

  // CA-2235: o e-mail da ficha, mascarado, com "Usar outro".
  const receber = page.getByRole('dialog', { name: 'Receber por e-mail' })
  await expect(receber.getByText(MASCARADO)).toBeVisible()
  await receber.getByRole('button', { name: 'Usar outro' }).click()
  await receber.getByLabel('Seu e-mail').fill('juliana@gmial.com')
  // CA-2236: o erro de digitação vira a pergunta, e um toque corrige.
  await receber.getByRole('button', { name: 'juliana@gmail.com' }).click()
  await expect(receber.getByLabel('Seu e-mail')).toHaveValue('juliana@gmail.com')

  // CA-2240, CA-2291 e CA-2303: os avisos vêm desmarcados; com o e-mail digitado, sai só o pedido de confirmação.
  const resumo = receber.getByRole('checkbox', { name: 'Resumo da semana' })
  await expect(receber.getByRole('checkbox')).toHaveCount(3)
  for (const caixa of await receber.getByRole('checkbox').all()) await expect(caixa).not.toBeChecked()
  await resumo.check()
  await receber.getByRole('button', { name: 'Enviar' }).click()
  await expect(receber.getByRole('status')).toContainText(`Enviamos um e-mail para ${MASCARADO}.`)
  await expect(receber.getByRole('status')).toContainText('Toque em Confirmar nele para receber o link.')
  expect(servidor.pedidosDeFuncao.filter((p) => p.nome === 'meu-link').map((p) => p.corpo)).toEqual([
    { acao: 'receber', token: TOKEN, email: 'juliana@gmail.com', avisos: ['semana'] },
  ])
  await semRolagemLateral(page)
})

test('CA-2227 e CA-2228: o aparelho lembra o plano na tela de entrar; "Esquecer neste aparelho" tira o cartão', async ({ page }) => {
  await abrirLinkDaJuliana(page)
  await page.goto('/#/entrar')
  const abrir = page.getByRole('button', { name: 'Abrir meu plano: Juliana · Ana Lima' })
  await expect(abrir).toBeVisible()
  await abrir.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Juliana' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/p/${TOKEN}`)

  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('dialog', { name: 'Meu plano' }).getByRole('button', { name: 'Esquecer neste aparelho' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Esquecer o plano neste aparelho?' })
  await expect(confirmar.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  await confirmar.getByRole('button', { name: 'Esquecer' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Recuperar meu link' })).toBeVisible()

  await page.goto('/#/entrar')
  await expect(page.getByRole('button', { name: /Entrar/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Abrir meu plano/ })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('metanutri:meus-planos') ?? '')).not.toContain(TOKEN)
})

test('CA-2238 e CA-2233: o link que não abre leva a "Recuperar meu link", e a resposta é a mesma para qualquer e-mail', async ({ page }) => {
  const servidor = await ligarServidorFalso(page, { link: null, funcoes: { 'meu-link': () => ({ corpo: { ok: true } }) } })
  await page.goto(`/p/${TOKEN}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Este link não abre mais' })).toBeVisible()
  await expect(page.getByText('O link também está na mensagem da sua nutricionista no WhatsApp.')).toBeVisible()
  await page.getByRole('button', { name: 'Recuperar pelo e-mail' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Recuperar meu link' })).toBeVisible()
  await page.getByLabel('E-mail').fill('juliana@gmail.com')
  await page.getByRole('button', { name: 'Enviar o link' }).click()
  await expect(page.getByText('Se este e-mail estiver cadastrado por uma nutricionista, o link chega em instantes.')).toBeVisible()
  const pedidos = servidor.pedidosDeFuncao.filter((p) => p.nome === 'meu-link')
  expect(pedidos).toHaveLength(1)
  expect(pedidos[0]?.corpo).toMatchObject({ acao: 'recuperar', email: 'juliana@gmail.com' })
  await semRolagemLateral(page)
})

test('CA-2289: o endereço trocado mostra só "Este link foi trocado." e o aparelho esquece o plano', async ({ page }) => {
  await ligarServidorFalso(page, { link: null, linkTrocado: true })
  await page.addInitScript(
    (token) => localStorage.setItem('metanutri:meus-planos', JSON.stringify([{ token, primeiroNome: 'Juliana', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-02' }])),
    TOKEN,
  )
  await page.goto(`/p/${TOKEN}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Este link foi trocado.' })).toBeVisible()
  await expect(page.getByText('Peça o novo a quem cuida do seu plano.')).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('metanutri:meus-planos') ?? '')).not.toContain(TOKEN)
  await semRolagemLateral(page)
})

test('CA-2241: a página do aceite não aceita ao abrir; só o "Confirmar" registra', async ({ page }) => {
  const chave = 'a'.repeat(16) + 'B2c3D4e5F6g7H8i9'
  const servidor = await ligarServidorFalso(page, {
    funcoes: {
      'avisos-resposta': (corpo) => {
        const escolhidos = corpo['acao'] === 'confirmar' && Array.isArray(corpo['avisos']) ? corpo['avisos'] : ['semana']
        return { corpo: { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['semana', 'lembrete'], escolhidos, feito: corpo['acao'] === 'confirmar' } }
      },
    },
  })
  await page.goto(`/avisos/${chave}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos de Ana Lima por e-mail' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Resumo da semana' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Lembrete' })).not.toBeChecked()
  // Abrir só leu: nada foi aceito.
  expect(servidor.pedidosDeFuncao.map((p) => p.corpo['acao'])).toEqual(['ler'])

  await page.getByRole('checkbox', { name: 'Lembrete' }).check()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Pronto. Você vai receber: Resumo da semana, Lembrete.')).toBeVisible()
  expect(servidor.pedidosDeFuncao.at(-1)?.corpo).toEqual({ acao: 'confirmar', chave, avisos: ['semana', 'lembrete'] })
  await semRolagemLateral(page)
})

test('CA-2295: em 390 px, com a letra normal, o seletor de opções do Plano e o "Você quis dizer…?" têm 44 px ou mais', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await abrirLinkDaJuliana(page)
  /** Os botões e links à vista menores que 44 px (de altura ou de largura). */
  const pequenos = (dentro: string) =>
    page.evaluate(
      (seletor) =>
        [...document.querySelectorAll<HTMLElement>(`${seletor} button, ${seletor} a, ${seletor} [role="tab"]`)]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ nome: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40), altura: Math.round(el.getBoundingClientRect().height), largura: Math.round(el.getBoundingClientRect().width) }))
          .filter((alvo) => alvo.altura < 44 || alvo.largura < 44),
      dentro,
    )

  await barraDeBaixo(page).getByRole('link', { name: 'Plano' }).click()
  await expect(page.getByRole('tab', { name: 'Opção 2' }).first()).toBeVisible()
  expect(await pequenos('main')).toEqual([])

  await page.getByRole('button', { name: 'Mais opções' }).click()
  await page.getByRole('dialog', { name: 'Meu plano' }).getByRole('button', { name: 'Receber meu link por e-mail' }).click()
  const receber = page.getByRole('dialog', { name: 'Receber por e-mail' })
  await receber.getByRole('button', { name: 'Usar outro' }).click()
  await receber.getByLabel('Seu e-mail').fill('juliana@gmial.com')
  await expect(receber.getByRole('button', { name: 'juliana@gmail.com' })).toBeVisible()
  expect(await pequenos('[role="dialog"]')).toEqual([])
})

for (const largura of [360, 390, 412] as const) {
  test(`CA-2218: em ${largura} px, com a letra a 200%, nada rola de lado, a barra de baixo não cobre a última missão e os alvos têm 44 px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    await abrirLinkDaJuliana(page)
    // A letra do sistema a 200% (como nos testes do site): a raiz em 200%, e tudo em rem cresce junto.
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await page.evaluate(() => document.fonts.ready.then(() => new Promise((pronto) => requestAnimationFrame(() => pronto(null)))))
    // Nada rola de lado; se rolar, o erro diz quem passou da largura (o texto que não quebra, pelo começo dele).
    const rolagem = await page.evaluate(() => ({
      documento: document.documentElement.scrollWidth,
      janela: window.innerWidth,
      passam: [...document.querySelectorAll<HTMLElement>('main *')]
        .filter((el) => getComputedStyle(el).overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${el.scrollWidth}/${el.clientWidth}`)
        .slice(-4),
    }))
    expect(rolagem.documento, `a página rola para o lado: ${rolagem.passam.join('; ')}`).toBeLessThanOrEqual(rolagem.janela)

    // A última missão, rolada até o fim da página, fica acima da barra de baixo.
    const ultima = page.getByRole('button', { name: /Beber 2 litros de água/ })
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const caixaDaMissao = await ultima.boundingBox()
    const caixaDaBarra = await barraDeBaixo(page).boundingBox()
    expect(caixaDaMissao).not.toBeNull()
    expect(caixaDaBarra).not.toBeNull()
    if (caixaDaMissao && caixaDaBarra) expect(caixaDaMissao.y + caixaDaMissao.height).toBeLessThanOrEqual(caixaDaBarra.y + 1)

    // Todo botão e link à vista tem 44 px de altura ou mais.
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main button, main a, nav a, button, a')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ nome: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40), altura: el.getBoundingClientRect().height, largura: el.getBoundingClientRect().width }))
        .filter((alvo) => alvo.altura < 44 || alvo.largura < 44),
    )
    expect(pequenos).toEqual([])
  })
}

// @vitest-environment node
// A função meu-link (spec lado-do-paciente, D-1220, D-1221, D-1226): recuperar o link, receber o link por e-mail e ligar
// um aviso, com o banco e o Resend de mentira.
import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_QUE_NAO_VALE, CONFIRA_O_EMAIL, hashDoToken, LIMITE_DA_CONTA, LINK_QUE_NAO_ABRE, NAO_ENVIOU, PEDIDOS_DEMAIS_NO_DIA } from '../../supabase/functions/_shared/avisos/comum.ts'
import { hashDoEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { meuLink, TEMPO_DA_RECUPERACAO_MS, type DependenciasDoMeuLink } from '../../supabase/functions/_shared/avisos/meuLink.ts'
import { TETOS_PADRAO } from '../../supabase/functions/_shared/avisos/tetos.ts'
import * as doApp from '../domain/emailsDoLink.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, envioAntigo, linkDe, resendFalso, type EstadoFalso, type ResendFalso } from './servidorAvisosFalsos.test-utils.ts'

let estado: EstadoFalso
let resend: ResendFalso
let deps: DependenciasDoMeuLink
let turnstileOk: boolean
let dominioRecebe: boolean | null

beforeEach(() => {
  acertarRelogio(new Date('2026-11-03T13:15:00.000Z'))
  const falso = bancoFalso()
  estado = falso.estado
  resend = resendFalso()
  turnstileOk = true
  dominioRecebe = true
  // D-1249: a espera da recuperação aguarda o trabalho dela, para os testes verem o que saiu.
  let trabalho: Promise<unknown> = Promise.resolve()
  deps = {
    ...dependencias(falso.banco, resend),
    turnstile: async () => turnstileOk,
    temServidorDeEmail: async () => dominioRecebe,
    emSegundoPlano: (t) => void (trabalho = t),
    esperar: async () => void (await trabalho),
  }
})

const pedir = (corpo: Record<string, unknown>, ip: string | null = '200.1.2.3') => meuLink({ metodo: 'POST', corpo, ip }, deps)

describe('as frases são as do app', () => {
  it('as respostas de erro do servidor são as mesmas que a tela conhece (src/domain/emailsDoLink.ts)', () => {
    expect([NAO_ENVIOU, CONFIRA_O_EMAIL, PEDIDOS_DEMAIS_NO_DIA, CHAVE_QUE_NAO_VALE]).toEqual([doApp.NAO_ENVIOU, doApp.CONFIRA_O_EMAIL, doApp.PEDIDOS_DEMAIS_NO_DIA, doApp.CHAVE_QUE_NAO_VALE])
    expect(LIMITE_DA_CONTA).toBe('Você chegou a 30 e-mails hoje. Amanhã volta.')
  })
})

describe('Recuperar meu link (D-1220)', () => {
  it('CA-2233: com cadastro, sai o S1 com o link, como "MetaNutri", e a resposta é a de sempre', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'recuperar', email: 'Juliana.Martins@gmail.com ', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    const [enviado] = resend.lotes[0]?.emails ?? []
    expect(enviado).toMatchObject({ tipo: 'S1', para: 'juliana.martins@gmail.com', nomeDoRemetente: 'MetaNutri', responderPara: null, assunto: 'Seu link do plano' })
    expect(enviado?.texto).toContain('https://app.metanutri.com.br/p/k7q2mx9pla3r')
    expect(estado.envios).toHaveLength(1)
    expect(estado.envios[0]).toMatchObject({ tipo: 'S1', estado: 'enviado', linkId: 'link-juliana' })
  })

  it('CA-2233: sem cadastro, a mesma resposta, e nada sai', async () => {
    expect(await pedir({ acao: 'recuperar', email: 'ninguem@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    expect(resend.lotes).toHaveLength(0)
  })

  it('D-1220: sem a verificação contra robôs, a mesma resposta, e nada sai', async () => {
    await comLink(estado)
    turnstileOk = false
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: null })).toEqual({ status: 200, corpo: { ok: true } })
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2234: o quarto pedido na mesma hora para o mesmo e-mail não sai, com a mesma resposta', async () => {
    await comLink(estado)
    for (let i = 0; i < 3; i++) await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' }, `10.0.0.${i}`)
    expect(resend.lotes).toHaveLength(3)
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' }, '10.0.0.9')).toEqual({ status: 200, corpo: { ok: true } })
    expect(resend.lotes).toHaveLength(3)
    // Uma hora depois, volta a sair.
    acertarRelogio(new Date('2026-11-03T14:16:00.000Z'))
    await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' }, '10.0.0.10')
    expect(resend.lotes).toHaveLength(4)
  })

  it('CA-2234: o quarto pedido na mesma hora do mesmo endereço de internet não sai', async () => {
    await comLink(estado)
    for (const email of ['a@gmail.com', 'b@gmail.com', 'c@gmail.com']) await pedir({ acao: 'recuperar', email, turnstile: 'tok' }, '10.9.9.9')
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' }, '10.9.9.9')).toEqual({ status: 200, corpo: { ok: true } })
    expect(resend.lotes).toHaveLength(0)
  })

  it('CB-1200: duas nutricionistas: um S1 com um link por nutricionista; só a primeira linha conta no teto', async () => {
    estado.nutris.set('nutri-carlos', { ...ANA, id: 'nutri-carlos', nome: 'Carlos Souza', cor: null })
    await comLink(estado)
    await comLink(estado, { link: { id: 'link-2', nutricionistaId: 'nutri-carlos', token: 'outro2token34' } })
    await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })
    const [enviado] = resend.lotes[0]?.emails ?? []
    expect(enviado?.texto).toContain('Juliana, estes são os links dos seus planos.')
    expect(enviado?.texto).toContain('Ana Lima: https://app.metanutri.com.br/p/k7q2mx9pla3r')
    expect(enviado?.texto).toContain('Carlos Souza: https://app.metanutri.com.br/p/outro2token34')
    expect(estado.envios.map((e) => e.contaNoTeto)).toEqual([true, false])
  })

  it('CA-2254: quem parou todos os e-mails do plano ainda recebe o S1 que ele mesmo pediu', async () => {
    await comLink(estado)
    const linha = estado.emails.get('link-juliana')
    if (linha) estado.emails.set('link-juliana', { ...linha, parouTudoEm: '2026-11-01T10:00:00Z' })
    await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })
    expect(resend.lotes).toHaveLength(1)
  })

  it('CA-2294: com cadastro e sem, a resposta sai depois dos mesmos 3 segundos, sem esperar o envio', async () => {
    await comLink(estado)
    const esperas: number[] = []
    const segundoPlano: Promise<unknown>[] = []
    let soltarResend = (): void => undefined
    const resendLento = new Promise<void>((resolver) => {
      soltarResend = resolver
    })
    deps = {
      ...deps,
      enviar: async (emails, idem) => {
        await resendLento
        return resend.enviar(emails, idem)
      },
      esperar: async (ms) => void esperas.push(ms),
      emSegundoPlano: (t) => void segundoPlano.push(t),
    }
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    expect(await pedir({ acao: 'recuperar', email: 'ninguem@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    expect(esperas).toEqual([TEMPO_DA_RECUPERACAO_MS, TEMPO_DA_RECUPERACAO_MS])
    expect(TEMPO_DA_RECUPERACAO_MS).toBe(3000)
    // A resposta saiu com o Resend ainda parado; o trabalho termina em segundo plano.
    expect(resend.lotes).toHaveLength(0)
    soltarResend()
    await Promise.all(segundoPlano)
    expect(resend.lotes).toHaveLength(1)
  })

  it('CA-2294: o banco fora no meio da recuperação não muda a resposta', async () => {
    await comLink(estado)
    estado.falhar = true
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
  })

  it('CB-1216: Resend fora do ar na recuperação: a resposta continua a mesma, e o envio não fica gravado', async () => {
    await comLink(estado)
    resend.modo = 'fora'
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    expect(estado.envios).toHaveLength(0)
  })
})

describe('Receber meu link por e-mail (D-1221)', () => {
  it('CA-2235: o e-mail mascarado que já vale manda o S1 na hora para o e-mail do link e responde mascarado', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 200, corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: false, confirmarEmail: false } })
    const [s1] = resend.lotes[0]?.emails ?? []
    expect(s1).toMatchObject({ tipo: 'S1', para: 'juliana.martins@gmail.com', nomeDoRemetente: 'Ana Lima via MetaNutri', responderPara: 'ana@nutricaoclinica.com.br' })
    expect(s1?.texto.split('\n').slice(0, 2)).toEqual(['Ana Lima', 'Nutricionista · CRN-3 12345'])
  })

  it('CA-2235: sem e-mail no link, o mascarado não vale', async () => {
    await comLink(estado, { email: null })
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 422, corpo: { erro: CONFIRA_O_EMAIL } })
  })

  it('CA-2236: domínio sem servidor de e-mail é recusado na hora, e nada sai', async () => {
    await comLink(estado)
    dominioRecebe = false
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'juliana@gmial.con', avisos: [] })).toEqual({ status: 422, corpo: { erro: CONFIRA_O_EMAIL } })
    expect(resend.lotes).toHaveLength(0)
    dominioRecebe = null
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'juliana@empresa.com.br', avisos: [] })).status).toBe(200)
  })

  it('CA-2301: o pedido conta nos 3 do dia antes da consulta do domínio, e o recusado por ela continua contando', async () => {
    await comLink(estado)
    let consultas = 0
    deps = {
      ...deps,
      temServidorDeEmail: async () => {
        consultas++
        // Na hora da consulta, o pedido já está anotado.
        expect(estado.limites.filter((l) => l.chave === 'link:link-juliana')).toHaveLength(consultas)
        return false
      },
    }
    for (let i = 0; i < 3; i++) expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'quem.pegou@golpe.org', avisos: [] })).toEqual({ status: 422, corpo: { erro: CONFIRA_O_EMAIL } })
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'quem.pegou@golpe.org', avisos: [] })).toEqual({ status: 429, corpo: { erro: PEDIDOS_DEMAIS_NO_DIA } })
    // O quarto nem chega a consultar o domínio.
    expect(consultas).toBe(3)
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2236: e-mail sem formato também', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'juliana', avisos: [] })).toEqual({ status: 422, corpo: { erro: CONFIRA_O_EMAIL } })
  })

  it('CA-2237: o quarto pedido do dia no mesmo link não sai', async () => {
    await comLink(estado)
    for (let i = 0; i < 3; i++) expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).status).toBe(200)
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 429, corpo: { erro: PEDIDOS_DEMAIS_NO_DIA } })
    expect(resend.lotes).toHaveLength(3)
    // No dia seguinte (Brasília), volta.
    acertarRelogio(new Date('2026-11-04T03:30:00.000Z'))
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).status).toBe(200)
  })

  it('CA-2240: com avisos marcados, sai o S1 e o S3, e a chave do aceite vale 7 dias', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: ['semana', 'lembrete'] })).toEqual({
      status: 200,
      corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: true, confirmarEmail: false },
    })
    const emails = resend.lotes[0]?.emails ?? []
    expect(emails.map((e) => e.tipo)).toEqual(['S1', 'S3'])
    expect(emails[1]?.texto).toContain('- Resumo da semana, toda terça\n- Lembrete depois de 3 dias sem marcar')
    const [chave] = [...estado.chaves.values()]
    expect(chave).toMatchObject({ tipo: 'aceite', avisos: ['semana', 'lembrete'], linkId: 'link-juliana', venceEm: '2026-11-10T13:15:00.000Z' })
    expect(emails[1]?.texto).toContain(`https://app.metanutri.com.br/avisos/${chave?.chave}`)
    // D-1226: pedir não aceita nada: só o botão da página.
    expect(estado.aceites).toHaveLength(0)
  })

  it('CA-2242: o aviso que a nutricionista não oferece não entra no S3', async () => {
    await comLink(estado, { ofertas: { lembrete: false } })
    await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: ['semana', 'lembrete'] })
    expect([...estado.chaves.values()][0]?.avisos).toEqual(['semana'])
  })

  it('CA-2240: aviso já ligado não pede outro S3', async () => {
    await comLink(estado, { aceites: ['semana'] })
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: ['semana'] })).toMatchObject({ corpo: { confirmar: false } })
    expect(resend.lotes[0]?.emails.map((e) => e.tipo)).toEqual(['S1'])
  })

  it('CA-2291 e CA-2303: o e-mail digitado recebe só o "Confirme o seu e-mail", sem o link, e o link continua com o e-mail de antes', async () => {
    const { emailHash } = await comLink(estado, { aceites: ['semana'] })
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'Pedro.Novo@Gmail.com', avisos: ['lembrete'] })).toEqual({
      status: 200,
      corpo: { enviadoPara: 'p•••o@gmail.com', confirmar: true, confirmarEmail: true },
    })
    const emails = resend.lotes[0]?.emails ?? []
    expect(emails.map((e) => [e.tipo, e.para, e.assunto])).toEqual([['S3', 'pedro.novo@gmail.com', 'Confirme o seu e-mail']])
    expect(emails[0]?.texto).toContain('Juliana, confirme que este e-mail é seu para receber o link do seu plano com Ana Lima.')
    expect(emails[0]?.texto).toContain('Com a confirmação, você recebe também:\n- Lembrete depois de 3 dias sem marcar')
    expect(emails[0]?.texto).toContain('Sem a confirmação, este e-mail não recebe nada e não serve para recuperar o link.')
    // D-1258: o endereço do plano não vai para um e-mail por confirmar.
    expect(emails[0]?.texto).not.toContain('/p/k7q2mx9pla3r')
    expect(emails[0]?.html).not.toContain('/p/k7q2mx9pla3r')
    // O link não muda: nem o endereço, nem a origem, nem o aceite do e-mail de antes.
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: 'juliana.martins@gmail.com', origem: 'ficha', emailHash })
    expect(estado.aceites.filter((a) => a.saiuEm === null).map((a) => a.tipo)).toEqual(['semana'])
    const [chave] = [...estado.chaves.values()]
    expect(chave).toMatchObject({ tipo: 'aceite', email: 'pedro.novo@gmail.com', emailHash: await hashDoEmail('pedro.novo@gmail.com'), avisos: ['lembrete'] })
  })

  it('CA-2291: sem aviso marcado, o "Confirme o seu e-mail" sai do mesmo jeito', async () => {
    await comLink(estado)
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'pedro.novo@gmail.com', avisos: [] })).corpo).toEqual({ enviadoPara: 'p•••o@gmail.com', confirmar: true, confirmarEmail: true })
    expect(resend.lotes[0]?.emails.map((e) => e.assunto)).toEqual(['Confirme o seu e-mail'])
    expect([...estado.chaves.values()][0]?.avisos).toEqual([])
  })

  it('D-1247: o e-mail digitado igual ao do link também pede confirmação (a resposta não revela se ele acertou)', async () => {
    await comLink(estado)
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'juliana.martins@gmail.com', avisos: [] })).corpo).toMatchObject({ confirmarEmail: true })
    expect(resend.lotes[0]?.emails.map((e) => e.assunto)).toEqual(['Confirme o seu e-mail'])
  })

  it('CA-2291: o e-mail que o paciente deu e não confirmou não serve como o mascarado, para "Recuperar" nem ligar aviso', async () => {
    await comLink(estado)
    const linha = estado.emails.get('link-juliana')
    if (linha) estado.emails.set('link-juliana', { ...linha, email: 'pedro.velho@gmail.com', emailHash: await hashDoEmail('pedro.velho@gmail.com'), origem: 'paciente', confirmadoEm: null })
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).status).toBe(422)
    expect((await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'semana' })).status).toBe(422)
    await pedir({ acao: 'recuperar', email: 'pedro.velho@gmail.com', turnstile: 'tok' })
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2291: o e-mail confirmado pelo paciente vale como o mascarado e para "Recuperar"', async () => {
    await comLink(estado)
    const linha = estado.emails.get('link-juliana')
    if (linha) estado.emails.set('link-juliana', { ...linha, email: 'pedro.novo@gmail.com', emailHash: await hashDoEmail('pedro.novo@gmail.com'), origem: 'paciente', confirmadoEm: '2026-11-02T10:00:00Z' })
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).corpo).toMatchObject({ enviadoPara: 'p•••o@gmail.com', confirmarEmail: false })
    await pedir({ acao: 'recuperar', email: 'pedro.novo@gmail.com', turnstile: 'tok' })
    expect(resend.lotes.map((l) => l.emails[0]?.para)).toEqual(['pedro.novo@gmail.com', 'pedro.novo@gmail.com'])
  })

  it('CA-2292: o Resend fora não muda nada e não conta nos 3 do dia', async () => {
    await comLink(estado)
    resend.modo = 'fora'
    for (let i = 0; i < 4; i++) expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'pedro.novo@gmail.com', avisos: ['semana'] })).toEqual({ status: 503, corpo: { erro: NAO_ENVIOU } })
    expect(estado.chaves.size).toBe(0)
    expect(estado.emails.get('link-juliana')?.email).toBe('juliana.martins@gmail.com')
    resend.modo = 'ok'
    for (let i = 0; i < 3; i++) expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).status).toBe(200)
  })

  it('CA-2299: a conta da nutricionista no teto dela: "Não foi possível enviar agora.", e o pedido não conta', async () => {
    await comLink(estado)
    for (let i = 0; i < 30; i++) estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: `${i}`.padStart(64, 'b'), dia: '2026-11-03', criadoEm: '2026-11-03T12:00:00.000Z', linkId: null }))
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 503, corpo: { erro: NAO_ENVIOU } })
    expect(estado.limites).toHaveLength(0)
  })

  it('CA-2292: o teto cheio também não conta', async () => {
    await comLink(estado)
    const tetos = deps.tetos
    deps = { ...deps, tetos: () => ({ ...TETOS_PADRAO, dia: 0 }) }
    expect((await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'pedro.novo@gmail.com', avisos: [] })).status).toBe(503)
    expect(estado.limites).toHaveLength(0)
    deps = { ...deps, tetos }
  })

  it('D-1239: endereço devolvido antes não recebe de novo', async () => {
    const { emailHash } = await comLink(estado)
    if (emailHash) estado.supressao.set(emailHash, 'devolvido')
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 422, corpo: { erro: CONFIRA_O_EMAIL } })
  })

  it('CB-1216: Resend fora do ar: "Não foi possível enviar agora."', async () => {
    await comLink(estado)
    resend.modo = 'fora'
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: ['semana'] })).toEqual({ status: 503, corpo: { erro: NAO_ENVIOU } })
    expect(estado.envios).toHaveLength(0)
  })

  it('CA-2271: no teto do dia, o serviço não sai', async () => {
    await comLink(estado)
    deps = { ...deps, tetos: () => ({ ...TETOS_PADRAO, dia: 0 }) }
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 503, corpo: { erro: NAO_ENVIOU } })
    expect(resend.lotes).toHaveLength(0)
  })

  it('D-1222: link que não abre (token antigo sem fixo, ou removido): 404', async () => {
    expect((await pedir({ acao: 'receber', token: 'naoexiste1234', usarDaFicha: true, avisos: [] })).status).toBe(404)
    expect((await pedir({ acao: 'receber', token: '../../x', usarDaFicha: true, avisos: [] })).status).toBe(404)
  })

  it('D-1217: o token antigo do paciente pede pelo link fixo', async () => {
    await comLink(estado)
    estado.links.set('link-velho', linkDe({ id: 'link-velho', token: 'antigo1234567', substituidoPor: 'link-juliana' }))
    await pedir({ acao: 'receber', token: 'antigo1234567', usarDaFicha: true, avisos: [] })
    expect(resend.lotes[0]?.emails[0]?.texto).toContain('/p/k7q2mx9pla3r')
  })
})

describe('Ligar um aviso no link (CA-2256)', () => {
  it('CA-2256: ligar manda o S3 daquele aviso', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'lembrete' })).toEqual({ status: 200, corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: true, confirmarEmail: false } })
    expect(resend.lotes[0]?.emails.map((e) => e.tipo)).toEqual(['S3'])
    expect([...estado.chaves.values()][0]?.avisos).toEqual(['lembrete'])
  })

  it('CA-2242: aviso não oferecido não liga', async () => {
    await comLink(estado, { ofertas: { plano: false } })
    expect((await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'plano' })).status).toBe(409)
  })

  it('pedido estranho: 400', async () => {
    expect((await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'tudo' })).status).toBe(400)
    expect((await pedir({ acao: 'apagar' })).status).toBe(400)
    expect((await meuLink({ metodo: 'GET', corpo: null, ip: null }, deps)).status).toBe(405)
  })
})

describe('a confirmação presa ao endereço do link (D-1256)', () => {
  /** A nutricionista troca o endereço do link (o que o gatilho do 017 faz com a linha). */
  const trocarOEndereco = () => {
    const link = estado.links.get('link-juliana')
    if (link) estado.links.set(link.id, { ...link, token: 'novoendereco9' })
  }

  it('CA-2300 (DP-LP-42): a chave do aceite guarda o resumo do endereço com que foi pedida', async () => {
    await comLink(estado)
    await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'pedro.novo@gmail.com', avisos: [] })
    expect([...estado.chaves.values()][0]?.tokenHash).toBe(await hashDoToken('k7q2mx9pla3r'))
    expect(await hashDoToken('k7q2mx9pla3r')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('CA-2300 e CB-1232: a troca no meio do pedido (durante a consulta do domínio): a confirmação não nasce e nada sai', async () => {
    await comLink(estado)
    deps = {
      ...deps,
      temServidorDeEmail: async () => {
        trocarOEndereco()
        return true
      },
    }
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'quem.pegou@gmail.com', avisos: [] })).toEqual({ status: 404, corpo: { erro: LINK_QUE_NAO_ABRE } })
    expect(estado.chaves.size).toBe(0)
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2300: ligar um aviso com a troca no meio também não manda nada', async () => {
    await comLink(estado)
    const banco = deps.banco
    deps = {
      ...deps,
      banco: {
        ...banco,
        aceitesDoLink: async (id) => {
          trocarOEndereco()
          return banco.aceitesDoLink(id)
        },
      },
    }
    expect(await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'lembrete' })).toEqual({ status: 404, corpo: { erro: LINK_QUE_NAO_ABRE } })
    expect(estado.chaves.size).toBe(0)
    expect(resend.lotes).toHaveLength(0)
  })
})

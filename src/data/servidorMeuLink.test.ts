// @vitest-environment node
// A função meu-link (spec lado-do-paciente, D-1220, D-1221, D-1226): recuperar o link, receber o link por e-mail e ligar
// um aviso, com o banco e o Resend de mentira.
import { beforeEach, describe, expect, it } from 'vitest'
import { CHAVE_QUE_NAO_VALE, CONFIRA_O_EMAIL, LIMITE_DA_CONTA, NAO_ENVIOU, PEDIDOS_DEMAIS_NO_DIA } from '../../supabase/functions/_shared/avisos/comum.ts'
import { hashDoEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { meuLink, type DependenciasDoMeuLink } from '../../supabase/functions/_shared/avisos/meuLink.ts'
import { TETOS_PADRAO } from '../../supabase/functions/_shared/avisos/tetos.ts'
import * as doApp from '../domain/emailsDoLink.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, linkDe, resendFalso, type EstadoFalso, type ResendFalso } from './servidorAvisosFalsos.test-utils.ts'

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
  deps = { ...dependencias(falso.banco, resend), turnstile: async () => turnstileOk, temServidorDeEmail: async () => dominioRecebe }
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

  it('CB-1216: Resend fora do ar na recuperação: a resposta continua a mesma, e o envio não fica gravado', async () => {
    await comLink(estado)
    resend.modo = 'fora'
    expect(await pedir({ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: 'tok' })).toEqual({ status: 200, corpo: { ok: true } })
    expect(estado.envios).toHaveLength(0)
  })
})

describe('Receber meu link por e-mail (D-1221)', () => {
  it('CA-2235: "Usar este" manda o S1 na hora para o e-mail do link e responde mascarado', async () => {
    await comLink(estado)
    expect(await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', usarDaFicha: true, avisos: [] })).toEqual({ status: 200, corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: false } })
    const [s1] = resend.lotes[0]?.emails ?? []
    expect(s1).toMatchObject({ tipo: 'S1', para: 'juliana.martins@gmail.com', nomeDoRemetente: 'Ana Lima via MetaNutri', responderPara: 'ana@nutricaoclinica.com.br' })
    expect(s1?.texto.split('\n').slice(0, 2)).toEqual(['Ana Lima', 'Nutricionista · CRN-3 12345'])
  })

  it('CA-2235: sem e-mail no link, "Usar este" não vale', async () => {
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
      corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: true },
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

  it('CA-2257: outro e-mail troca o do link (origem paciente), e o aceite do antigo deixa de valer', async () => {
    const { emailHash } = await comLink(estado, { aceites: ['semana'] })
    await pedir({ acao: 'receber', token: 'k7q2mx9pla3r', email: 'Juliana.Nova@Gmail.com', avisos: [] })
    const linha = estado.emails.get('link-juliana')
    expect(linha).toMatchObject({ email: 'juliana.nova@gmail.com', origem: 'paciente', emailHash: await hashDoEmail('juliana.nova@gmail.com') })
    expect(linha?.emailHash).not.toBe(emailHash)
    expect(resend.lotes[0]?.emails[0]?.para).toBe('juliana.nova@gmail.com')
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
    expect(await pedir({ acao: 'ligar', token: 'k7q2mx9pla3r', tipo: 'lembrete' })).toEqual({ status: 200, corpo: { enviadoPara: 'j•••s@gmail.com', confirmar: true } })
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

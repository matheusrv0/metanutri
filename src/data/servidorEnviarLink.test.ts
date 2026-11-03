// @vitest-environment node
// A função enviar-link (spec lado-do-paciente): o S2, o convite, o S4 e o A1 agendado, pedidos pela nutricionista.
import { beforeEach, describe, expect, it } from 'vitest'
import { LIMITE_DA_CONTA, NAO_ENVIOU, type DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import { EMAIL_DEVOLVIDO, enviarLink, SEM_EMAIL } from '../../supabase/functions/_shared/avisos/enviarLink.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, resendFalso, type EstadoFalso, type ResendFalso } from './servidorAvisosFalsos.test-utils.ts'

const LINK = '11111111-2222-4333-8444-555555555555'
let estado: EstadoFalso
let resend: ResendFalso
let deps: DependenciasComuns

beforeEach(() => {
  acertarRelogio(new Date('2026-11-03T13:15:00.000Z'))
  const falso = bancoFalso()
  estado = falso.estado
  resend = resendFalso()
  deps = dependencias(falso.banco, resend)
})

const pedir = (acao: string, sobre: Record<string, unknown> = {}, conta: string | null = ANA.id) => enviarLink({ metodo: 'POST', conta, corpo: { acao, link: LINK, ...sobre } }, deps)
const comJuliana = (sobre: Parameters<typeof comLink>[1] = {}) => comLink(estado, { ...sobre, link: { id: LINK, planoEm: '2026-11-03T10:00:00.000Z', ...sobre.link } })

describe('"E-mail" no cartão do link: o S2 (D-1224)', () => {
  it('CA-2262: sai o S2 para o e-mail do link, e "Enviados" ganha a linha', async () => {
    await comJuliana({ aceites: ['plano', 'semana', 'lembrete'] })
    expect(await pedir('enviar')).toEqual({ status: 200, corpo: { enviadoPara: 'j•••s@gmail.com', agendadoPara: null } })
    const [s2] = resend.lotes[0]?.emails ?? []
    expect(s2).toMatchObject({ tipo: 'S2', para: 'juliana.martins@gmail.com', assunto: 'Ana Lima enviou seu plano', nomeDoRemetente: 'Ana Lima via MetaNutri' })
    expect(s2?.preCabecalho).toBe('Atualizado em 3 de novembro.')
    expect(estado.envios.map((e) => [e.tipo, e.estado])).toEqual([['S2', 'enviado']])
  })

  it('CA-2259: a resposta vai para o e-mail do Perfil; sem ele, para o da conta', async () => {
    await comJuliana()
    await pedir('enviar')
    expect(resend.lotes[0]?.emails[0]?.responderPara).toBe('ana@nutricaoclinica.com.br')
    estado.nutris.set(ANA.id, { ...ANA, responderPara: null })
    await pedir('enviar')
    expect(resend.lotes[1]?.emails[0]?.responderPara).toBe('ana.conta@gmail.com')
  })

  it('CA-2252: o S2 leva o descadastro de um clique (https, sem mailto) e o rodapé "Não quero receber e-mails deste plano"', async () => {
    await comJuliana({ aceites: ['plano', 'semana', 'lembrete'] })
    await pedir('enviar')
    const [s2] = resend.lotes[0]?.emails ?? []
    expect(s2?.cabecalhos?.['List-Unsubscribe']).toMatch(/^<https:\/\/projeto\.supabase\.co\/functions\/v1\/avisos-resposta\?c=[A-Za-z0-9]{32}>$/)
    expect(s2?.cabecalhos?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(s2?.texto).toContain('Não quero receber e-mails deste plano: https://app.metanutri.com.br/avisos/')
  })

  it('CA-2243: com avisos oferecidos e não aceitos, o S2 traz o convite; com todos aceitos, não', async () => {
    await comJuliana({ aceites: ['semana'] })
    await pedir('enviar')
    expect(resend.lotes[0]?.emails[0]?.texto).toContain('Ana Lima pode avisar quando o plano mudar e lembrar das missões se você ficar 3 dias sem marcar.')
    const convite = [...estado.chaves.values()].find((c) => c.tipo === 'aceite')
    expect(convite?.avisos).toEqual(['plano', 'lembrete'])
    expect(estado.emails.get(LINK)?.conviteEm).toBe('2026-11-03T13:15:00.000Z')
    // O convite é um por mês: o S2 seguinte sai sem ele.
    await pedir('enviar')
    expect(resend.lotes[1]?.emails[0]?.texto).not.toContain('Quero receber os avisos')
  })

  it('CA-2262: o trigésimo primeiro envio de serviço da conta no dia não sai', async () => {
    await comJuliana()
    for (let i = 0; i < 30; i++) expect((await pedir('enviar')).status).toBe(200)
    expect(await pedir('enviar')).toEqual({ status: 429, corpo: { erro: LIMITE_DA_CONTA } })
    expect(resend.lotes).toHaveLength(30)
  })

  it('CA-2261: sem e-mail no link, "Cadastre o e-mail na ficha."', async () => {
    await comJuliana({ email: null })
    expect(await pedir('enviar')).toEqual({ status: 422, corpo: { erro: SEM_EMAIL } })
  })

  it('CA-2265: e-mail devolvido: o S2 não sai', async () => {
    const { emailHash } = await comJuliana()
    if (emailHash) estado.supressao.set(emailHash, 'devolvido')
    expect(await pedir('enviar')).toEqual({ status: 422, corpo: { erro: EMAIL_DEVOLVIDO } })
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2254: quem pediu para não receber e-mails do plano não recebe o S2: "Juliana pediu para não receber e-mails."', async () => {
    await comJuliana()
    const linha = estado.emails.get(LINK)
    if (linha) estado.emails.set(LINK, { ...linha, parouTudoEm: '2026-11-01T10:00:00Z' })
    expect(await pedir('enviar')).toEqual({ status: 409, corpo: { erro: 'Juliana pediu para não receber e-mails.' } })
  })

  it('CB-1213: quem marcou como spam também não', async () => {
    const { emailHash } = await comJuliana()
    if (emailHash) estado.supressao.set(emailHash, 'queixa')
    expect((await pedir('enviar')).status).toBe(409)
  })

  it('CB-1225: o e-mail da própria nutricionista funciona como qualquer outro', async () => {
    await comJuliana({ email: 'ana@nutricaoclinica.com.br' })
    expect((await pedir('enviar')).status).toBe(200)
  })

  it('CA-2258: link de conta de estudante: "Estágio de nutrição, sob supervisão" no topo', async () => {
    await comJuliana({ link: { usoNaoComercial: true } })
    await pedir('enviar')
    expect(resend.lotes[0]?.emails[0]?.texto.split('\n').slice(0, 2)).toEqual(['Ana Lima', 'Estágio de nutrição, sob supervisão'])
  })

  it('CB-1216: Resend fora do ar: "Não foi possível enviar agora."', async () => {
    await comJuliana()
    resend.modo = 'fora'
    expect(await pedir('enviar')).toEqual({ status: 503, corpo: { erro: NAO_ENVIOU } })
    expect(estado.envios).toHaveLength(0)
  })

  it('o link de outra conta não existe para quem pede; sem sessão, 401', async () => {
    await comJuliana()
    expect((await pedir('enviar', {}, 'outra-conta')).status).toBe(404)
    expect((await pedir('enviar', {}, null)).status).toBe(401)
    expect((await enviarLink({ metodo: 'POST', conta: ANA.id, corpo: { acao: 'enviar', link: 'nao-e-uuid' } }, deps)).status).toBe(400)
  })
})

describe('"Enviar convite" (D-1227)', () => {
  it('D-1227: o convite sai uma vez por mês', async () => {
    await comJuliana()
    expect((await pedir('convite')).status).toBe(200)
    expect(resend.lotes[0]?.emails[0]?.texto).toContain('Quero receber os avisos')
    expect(await pedir('convite')).toEqual({ status: 429, corpo: { erro: 'Um convite por mês. O último foi em 03/11.' } })
    acertarRelogio(new Date('2026-12-04T13:15:00.000Z'))
    expect((await pedir('convite')).status).toBe(200)
  })

  it('D-1227: sem aviso para oferecer, não há convite', async () => {
    await comJuliana({ aceites: ['plano', 'semana', 'lembrete'] })
    expect(await pedir('convite')).toEqual({ status: 409, corpo: { erro: 'Juliana já recebe os avisos oferecidos.' } })
  })
})

describe('"Trocar o endereço": o S4 (D-1215)', () => {
  it('CA-2223: o S4 sai na hora, com o endereço novo', async () => {
    await comJuliana({ link: { token: 'zr8mvq3cte5j' } })
    expect((await pedir('trocou')).status).toBe(200)
    const [s4] = resend.lotes[0]?.emails ?? []
    expect(s4).toMatchObject({ tipo: 'S4', assunto: 'Seu link do plano mudou' })
    expect(s4?.texto).toContain('Abrir meu plano: https://app.metanutri.com.br/p/zr8mvq3cte5j')
    expect(s4?.cabecalhos).toBeUndefined()
  })
})

describe('"Atualizar com este plano": o A1 agendado (D-1230)', () => {
  it('CA-2249: "Avisar Juliana por e-mail" marcado agenda o A1 30 minutos depois', async () => {
    await comJuliana({ aceites: ['plano'] })
    expect(await pedir('atualizou', { avisar: true })).toEqual({ status: 200, corpo: { enviadoPara: null, agendadoPara: '2026-11-03T13:45:00.000Z' } })
    expect(estado.links.get(LINK)?.a1Para).toBe('2026-11-03T13:45:00.000Z')
  })

  it('CA-2249: duas atualizações em 20 minutos: a segunda empurra o mesmo A1', async () => {
    await comJuliana({ aceites: ['plano'] })
    await pedir('atualizou', { avisar: true })
    acertarRelogio(new Date('2026-11-03T13:35:00.000Z'))
    await pedir('atualizou', { avisar: true })
    expect(estado.links.get(LINK)?.a1Para).toBe('2026-11-03T14:05:00.000Z')
  })

  it('CA-2249: atualização às 22h: o A1 fica para as 8h', async () => {
    await comJuliana({ aceites: ['plano'] })
    acertarRelogio(new Date('2026-11-04T01:00:00.000Z'))
    expect((await pedir('atualizou', { avisar: true })).corpo).toMatchObject({ agendadoPara: '2026-11-04T11:00:00.000Z' })
  })

  it('D-1230: sem o aceite do aviso, ou desmarcado, nada fica agendado', async () => {
    await comJuliana({ aceites: ['semana'] })
    expect((await pedir('atualizou', { avisar: true })).corpo).toMatchObject({ agendadoPara: null })
    await comJuliana({ aceites: ['plano'] })
    await pedir('atualizou', { avisar: true })
    expect((await pedir('atualizou', { avisar: false })).corpo).toMatchObject({ agendadoPara: null })
    expect(estado.links.get(LINK)?.a1Para).toBeNull()
  })
})

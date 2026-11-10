// @vitest-environment node
// A função avisos-resposta (spec lado-do-paciente, D-1226 e D-1235): a página do aceite, a do descadastro e o descadastro
// de um clique, com o banco de mentira.
import { beforeEach, describe, expect, it } from 'vitest'
import { responderAosAvisos, type PedidoDaResposta } from '../../supabase/functions/_shared/avisos/avisosResposta.ts'
import { CHAVE_QUE_NAO_VALE, hashDoToken, type DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import { hashDoEmail } from '../../supabase/functions/_shared/avisos/email.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, resendFalso, type EstadoFalso, type ResendFalso } from './servidorAvisosFalsos.test-utils.ts'

let estado: EstadoFalso
let deps: DependenciasComuns
let resend: ResendFalso

const ACEITE = 'A'.repeat(32)

beforeEach(() => {
  acertarRelogio(new Date('2026-11-05T12:43:00.000Z'))
  const falso = bancoFalso()
  estado = falso.estado
  resend = resendFalso()
  deps = dependencias(falso.banco, resend)
})

const pedir = (corpo: Record<string, unknown>, sobre: Partial<PedidoDaResposta> = {}) => responderAosAvisos({ metodo: 'POST', chaveDaUrl: null, corpo, umClique: false, ...sobre }, deps)

/** O S3 pedido na terça (3/11) para o resumo e o lembrete. */
async function comPedidoDeAceite(sobre: { readonly vence?: string; readonly avisos?: readonly ('plano' | 'semana' | 'lembrete')[] } = {}) {
  const { link, emailHash } = await comLink(estado)
  estado.chaves.set(ACEITE, {
    chave: ACEITE,
    linkId: link.id,
    nutricionistaId: ANA.id,
    tipo: 'aceite',
    avisos: sobre.avisos ?? ['semana', 'lembrete'],
    emailHash,
    email: null,
    tokenHash: await hashDoToken(link.token),
    criadoEm: '2026-11-03T12:43:00.000Z',
    venceEm: sobre.vence ?? '2026-11-10T12:43:00.000Z',
    usadoEm: null,
    desfazer: null,
  })
  return { link, emailHash }
}

/** A chave de descadastro do aviso no link. */
const chaveDeSair = async (aviso: 'plano' | 'semana' | 'lembrete' | 's2' | 'n1', linkId: string | null = 'link-juliana') => {
  // O descadastro vai para o e-mail de agora do link (D-1252); o N1, para o da conta.
  const emailHash = (linkId === null ? null : estado.emails.get(linkId)?.emailHash) ?? (await hashDoEmail(ANA.emailDaConta ?? ''))
  const chave = await deps.banco.chaveDeSair(linkId, ANA.id, aviso, emailHash)
  if (chave === null) throw new Error('sem chave')
  return chave
}

describe('o aceite em dois passos (D-1226)', () => {
  it('CA-2241: abrir o endereço (a página lê a chave) não aceita nada', async () => {
    await comPedidoDeAceite()
    const r = await pedir({ acao: 'ler', chave: ACEITE })
    expect(r).toEqual({ status: 200, corpo: { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['plano', 'semana', 'lembrete'], escolhidos: ['semana', 'lembrete'], aviso: null, emailNovo: null, feito: false } })
    expect(estado.aceites).toHaveLength(0)
    // O GET (o antivírus que abre todo link) nem chega à regra.
    expect((await responderAosAvisos({ metodo: 'GET', chaveDaUrl: ACEITE, corpo: null, umClique: false }, deps)).status).toBe(405)
    expect(estado.aceites).toHaveLength(0)
  })

  it('CA-2241: só o "Confirmar" registra o aceite, com o tipo, o dia e a hora e a versão "avisos-v1"', async () => {
    const { emailHash } = await comPedidoDeAceite()
    const r = await pedir({ acao: 'confirmar', chave: ACEITE, avisos: ['semana', 'lembrete'] })
    expect(r.corpo).toMatchObject({ feito: true, escolhidos: ['semana', 'lembrete'] })
    expect(estado.aceites.map((a) => [a.tipo, a.emailHash, a.aceitoEm, a.diaDaSemana])).toEqual([
      ['semana', emailHash, '2026-11-05T12:43:00.000Z', 2],
      ['lembrete', emailHash, '2026-11-05T12:43:00.000Z', 2],
    ])
    // A versão do texto é a do banco (default 'avisos-v1' no 017); o falso guarda o que o núcleo manda.
    expect(estado.chaves.get(ACEITE)?.usadoEm).toBe('2026-11-05T12:43:00.000Z')
  })

  it('CA-2243: a página do S2 vem com os avisos oferecidos marcados; desmarcar um não o aceita', async () => {
    await comPedidoDeAceite({ avisos: ['plano', 'semana', 'lembrete'] })
    expect((await pedir({ acao: 'ler', chave: ACEITE })).corpo).toMatchObject({ escolhidos: ['plano', 'semana', 'lembrete'] })
    await pedir({ acao: 'confirmar', chave: ACEITE, avisos: ['plano'] })
    expect(estado.aceites.map((a) => a.tipo)).toEqual(['plano'])
  })

  it('CA-2242: o aviso que a nutricionista não oferece não é aceito, nem aparece na página', async () => {
    const { link } = await comPedidoDeAceite()
    const linha = estado.emails.get(link.id)
    if (linha) estado.emails.set(link.id, { ...linha, ofertas: { plano: true, semana: false, lembrete: true } })
    expect((await pedir({ acao: 'ler', chave: ACEITE })).corpo).toMatchObject({ avisos: ['plano', 'lembrete'], escolhidos: ['lembrete'] })
    await pedir({ acao: 'confirmar', chave: ACEITE, avisos: ['semana', 'lembrete'] })
    expect(estado.aceites.map((a) => a.tipo)).toEqual(['lembrete'])
  })

  it('CB-1222: a chave do S3 vale 7 dias e uma vez; depois, "Este endereço não vale."', async () => {
    await comPedidoDeAceite({ vence: '2026-11-05T12:00:00.000Z' })
    expect(await pedir({ acao: 'ler', chave: ACEITE })).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
  })

  it('CB-1222: confirmar duas vezes não aceita de novo', async () => {
    await comPedidoDeAceite()
    await pedir({ acao: 'confirmar', chave: ACEITE })
    await pedir({ acao: 'confirmar', chave: ACEITE })
    expect(estado.aceites).toHaveLength(2)
  })

  it('CA-2257: o e-mail do link mudou depois do S3: a chave do endereço antigo não aceita', async () => {
    const { link } = await comPedidoDeAceite()
    const linha = estado.emails.get(link.id)
    if (linha) estado.emails.set(link.id, { ...linha, email: 'outro@gmail.com', emailHash: 'f'.repeat(64) })
    expect((await pedir({ acao: 'confirmar', chave: ACEITE })).status).toBe(404)
    expect(estado.aceites).toHaveLength(0)
  })

  it('CB-1214: o link saiu (a conta foi excluída): a chave não vale', async () => {
    await comPedidoDeAceite()
    estado.links.clear()
    expect((await pedir({ acao: 'ler', chave: ACEITE })).status).toBe(404)
  })
})

describe('o e-mail digitado no link só vale confirmado (D-1247)', () => {
  const NOVO = 'pedro.novo@gmail.com'
  const DO_EMAIL = 'B'.repeat(32)

  /** O S3 "Confirme o seu e-mail": a chave guarda o endereço digitado. */
  async function comEmailPorConfirmar(sobre: { readonly avisos?: readonly ('plano' | 'semana' | 'lembrete')[]; readonly email?: string; readonly chave?: string } = {}) {
    const { link, emailHash } = await comLink(estado, { aceites: ['plano'] })
    const email = sobre.email ?? NOVO
    estado.chaves.set(sobre.chave ?? DO_EMAIL, {
      chave: sobre.chave ?? DO_EMAIL,
      linkId: link.id,
      nutricionistaId: ANA.id,
      tipo: 'aceite',
      avisos: sobre.avisos ?? [],
      emailHash: await hashDoEmail(email),
      email,
      tokenHash: await hashDoToken(link.token),
      criadoEm: '2026-11-03T12:43:00.000Z',
      venceEm: '2026-11-10T12:43:00.000Z',
      usadoEm: null,
      desfazer: null,
    })
    return { link, emailHashDaFicha: emailHash }
  }

  it('CA-2291: a página mostra o endereço digitado, mascarado, e abrir não muda o e-mail do link', async () => {
    await comEmailPorConfirmar({ avisos: ['semana'] })
    expect((await pedir({ acao: 'ler', chave: DO_EMAIL })).corpo).toMatchObject({ tipo: 'aceite', emailNovo: 'p•••o@gmail.com', escolhidos: ['semana'], feito: false })
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: 'juliana.martins@gmail.com', origem: 'ficha' })
  })

  it('CA-2291: "Confirmar" leva o endereço ao link (origem paciente, com a data) e liga os avisos marcados', async () => {
    const { emailHashDaFicha } = await comEmailPorConfirmar({ avisos: ['semana'] })
    const r = await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })
    expect(r.corpo).toMatchObject({ feito: true, escolhidos: ['semana'] })
    const hash = await hashDoEmail(NOVO)
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: NOVO, emailHash: hash, origem: 'paciente', confirmadoEm: '2026-11-05T12:43:00.000Z' })
    expect(estado.aceites.filter((a) => a.saiuEm === null).map((a) => [a.tipo, a.emailHash])).toEqual([
      ['plano', emailHashDaFicha],
      ['semana', hash],
    ])
  })

  it('CA-2291: confirma mesmo sem nenhum aviso marcado', async () => {
    await comEmailPorConfirmar()
    expect((await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })).corpo).toMatchObject({ feito: true, escolhidos: [] })
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: NOVO, origem: 'paciente' })
  })

  it('D-1247: o endereço igual ao que o link já tem só fica confirmado', async () => {
    await comEmailPorConfirmar({ email: 'juliana.martins@gmail.com' })
    await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: 'juliana.martins@gmail.com', origem: 'ficha', confirmadoEm: '2026-11-05T12:43:00.000Z' })
  })

  it('CB-1229: dois e-mails por confirmar: vale o último confirmado, e o outro continua valendo até ser usado', async () => {
    await comEmailPorConfirmar()
    const outra = 'C'.repeat(32)
    const segundo = 'pedro.outro@gmail.com'
    estado.chaves.set(outra, { ...(estado.chaves.get(DO_EMAIL) ?? ({} as never)), chave: outra, email: segundo, emailHash: await hashDoEmail(segundo) })
    await pedir({ acao: 'confirmar', chave: outra, avisos: [] })
    expect(estado.emails.get('link-juliana')?.email).toBe(segundo)
    await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })
    expect(estado.emails.get('link-juliana')?.email).toBe(NOVO)
  })

  it('CA-2303: o "Confirmar" do e-mail digitado manda o link do plano (S1) para ele; ler e confirmar de novo não mandam', async () => {
    await comEmailPorConfirmar({ avisos: ['semana'] })
    expect((await pedir({ acao: 'ler', chave: DO_EMAIL })).status).toBe(200)
    expect(resend.lotes).toHaveLength(0)
    expect((await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })).corpo).toMatchObject({ feito: true })
    const enviados = resend.lotes.flatMap((l) => l.emails)
    expect(enviados.map((e) => [e.tipo, e.para, e.assunto])).toEqual([['S1', NOVO, 'Seu link do plano']])
    expect(enviados[0]?.texto).toContain('https://app.metanutri.com.br/p/k7q2mx9pla3r')
    expect(enviados[0]?.nomeDoRemetente).toBe('Ana Lima via MetaNutri')
    expect(estado.envios.map((e) => [e.tipo, e.linkId])).toEqual([['S1', 'link-juliana']])
    await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })
    expect(resend.lotes.flatMap((l) => l.emails)).toHaveLength(1)
  })

  it('CA-2303: a confirmação só dos avisos (sem e-mail digitado) não manda o link', async () => {
    await comPedidoDeAceite()
    await pedir({ acao: 'confirmar', chave: ACEITE, avisos: ['semana'] })
    expect(resend.lotes).toHaveLength(0)
  })

  it('CB-1233: com o Resend fora, o "Confirmar" vale do mesmo jeito, e o S1 não sai', async () => {
    await comEmailPorConfirmar()
    resend.modo = 'fora'
    expect((await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })).corpo).toMatchObject({ feito: true })
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: NOVO, origem: 'paciente' })
    expect(estado.envios).toHaveLength(0)
  })

  it('CA-2300: a confirmação pedida com o endereço de antes da troca não vale, nem para ler nem para confirmar', async () => {
    await comEmailPorConfirmar({ avisos: ['semana'] })
    const link = estado.links.get('link-juliana')
    if (link) estado.links.set(link.id, { ...link, token: 'novoendereco9' })
    const naoVale = { status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } }
    expect(await pedir({ acao: 'ler', chave: DO_EMAIL })).toEqual(naoVale)
    expect(await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })).toEqual(naoVale)
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: 'juliana.martins@gmail.com', origem: 'ficha' })
    expect(estado.aceites.filter((a) => a.tipo === 'semana')).toHaveLength(0)
  })

  it('CA-2300: a chave sem o resumo do endereço (de antes desta versão) também não vale', async () => {
    await comEmailPorConfirmar()
    const chave = estado.chaves.get(DO_EMAIL)
    if (chave) estado.chaves.set(DO_EMAIL, { ...chave, tokenHash: null })
    expect((await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })).status).toBe(404)
    expect(estado.emails.get('link-juliana')?.email).toBe('juliana.martins@gmail.com')
  })

  it('a chave com o endereço mexido (o resumo não bate) não vale', async () => {
    await comEmailPorConfirmar()
    const chave = estado.chaves.get(DO_EMAIL)
    if (chave) estado.chaves.set(DO_EMAIL, { ...chave, email: 'outro@gmail.com' })
    expect((await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: [] })).status).toBe(404)
    expect(estado.emails.get('link-juliana')?.email).toBe('juliana.martins@gmail.com')
  })

  /** A troca do endereço logo antes de o banco gravar o "Confirmar" (a página já leu a chave e o link de antes). */
  function trocarAntesDeGravar(): void {
    const { banco } = deps
    const gravar = banco.gravarEmailDoPaciente
    deps = {
      ...deps,
      banco: {
        ...banco,
        gravarEmailDoPaciente: async (...pedido: Parameters<typeof gravar>) => {
          const link = estado.links.get('link-juliana')
          if (link) estado.links.set(link.id, { ...link, token: 'novoendereco9' })
          return gravar(...pedido)
        },
      },
    }
  }

  it('CA-2308 e CB-1232: a troca entre a leitura da chave e a gravação: "Este endereço não vale.", o link fica com o da ficha e nada sai', async () => {
    await comEmailPorConfirmar({ avisos: ['semana'] })
    trocarAntesDeGravar()
    expect(await pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(estado.emails.get('link-juliana')).toMatchObject({ email: 'juliana.martins@gmail.com', origem: 'ficha', confirmadoEm: null })
    expect(estado.aceites.filter((a) => a.tipo === 'semana')).toHaveLength(0)
    expect(estado.chaves.get(DO_EMAIL)?.usadoEm).toBeNull()
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2308: na chave do e-mail que o link já tem, a troca no meio também recusa o "Confirmar"', async () => {
    await comPedidoDeAceite()
    trocarAntesDeGravar()
    expect((await pedir({ acao: 'confirmar', chave: ACEITE, avisos: ['semana'] })).status).toBe(404)
    expect(estado.aceites).toHaveLength(0)
    expect(estado.emails.get('link-juliana')?.confirmadoEm).toBeNull()
  })

  it('CB-1222 e D-1261: dois "Confirmar" da mesma chave ao mesmo tempo aceitam uma vez e mandam um S1 só', async () => {
    await comEmailPorConfirmar({ avisos: ['semana'] })
    const [a, b] = await Promise.all([pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] }), pedir({ acao: 'confirmar', chave: DO_EMAIL, avisos: ['semana'] })])
    expect([a.status, b.status]).toEqual([200, 200])
    expect(b.corpo).toMatchObject({ feito: true })
    expect(resend.lotes.flatMap((l) => l.emails)).toHaveLength(1)
    expect(estado.aceites.filter((x) => x.tipo === 'semana')).toHaveLength(1)
  })
})

describe('a chave de descadastro é presa ao endereço (D-1252)', () => {
  it('CA-2297: com o e-mail da ficha corrigido, a chave do endereço errado não descadastra, não para tudo nem desfaz', async () => {
    await comLink(estado, { email: 'juliana.errado@gmail.com', aceites: ['semana'] })
    const doErrado = await chaveDeSair('semana')
    const doS2 = await chaveDeSair('s2')
    // A ficha corrigida: o link passa a ter o e-mail certo (e o aceite dele).
    const linha = estado.emails.get('link-juliana')
    const certo = await hashDoEmail('juliana.martins@gmail.com')
    if (linha) estado.emails.set('link-juliana', { ...linha, email: 'juliana.martins@gmail.com', emailHash: certo, emailFicha: 'juliana.martins@gmail.com' })
    estado.aceites.push({ id: 999, linkId: 'link-juliana', nutricionistaId: ANA.id, tipo: 'semana', emailHash: certo, aceitoEm: '2026-11-04T12:00:00.000Z', diaDaSemana: 3, saiuEm: null, pausadoEm: null })
    const antes = JSON.stringify(estado.aceites)
    for (const acao of ['ler', 'sair', 'parar-todos', 'desfazer']) expect(await pedir({ acao, chave: doErrado }), acao).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(await pedir({}, { umClique: true, chaveDaUrl: doS2 })).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(JSON.stringify(estado.aceites)).toBe(antes)
    expect(estado.emails.get('link-juliana')?.parouTudoEm).toBeNull()
    // A chave do endereço de agora vale.
    expect((await pedir({ acao: 'sair', chave: await chaveDeSair('semana') })).status).toBe(200)
  })

  it('D-1252: cada endereço tem a sua chave', async () => {
    await comLink(estado)
    const a = await deps.banco.chaveDeSair('link-juliana', ANA.id, 'semana', 'a'.repeat(64))
    const b = await deps.banco.chaveDeSair('link-juliana', ANA.id, 'semana', 'b'.repeat(64))
    expect(a).not.toBe(b)
    expect(await deps.banco.chaveDeSair('link-juliana', ANA.id, 'semana', 'a'.repeat(64))).toBe(a)
  })
})

describe('o descadastro (D-1235)', () => {
  it('CA-2253: abrir a página não descadastra; o botão tira só aquele aviso e mostra o "Pronto."', async () => {
    await comLink(estado, { aceites: ['semana', 'lembrete'] })
    const chave = await chaveDeSair('semana')
    expect((await pedir({ acao: 'ler', chave })).corpo).toMatchObject({ tipo: 'sair', aviso: 'semana', feito: false })
    expect(estado.aceites.every((a) => a.saiuEm === null)).toBe(true)
    expect((await pedir({ acao: 'sair', chave })).corpo).toMatchObject({ tipo: 'sair', aviso: 'semana', feito: true })
    expect(estado.aceites.map((a) => [a.tipo, a.saiuEm !== null])).toEqual([
      ['semana', true],
      ['lembrete', false],
    ])
  })

  it('CA-2253: "Desfazer" volta como estava, sem novo S3', async () => {
    await comLink(estado, { aceites: ['semana'] })
    const chave = await chaveDeSair('semana')
    await pedir({ acao: 'sair', chave })
    expect((await pedir({ acao: 'desfazer', chave })).corpo).toMatchObject({ feito: false })
    expect(estado.aceites.map((a) => a.saiuEm)).toEqual([null])
    expect(estado.chaves.get(chave)?.usadoEm).toBeNull()
  })

  it('CA-2254: "Parar todos os e-mails deste plano" tira os avisos e o S2 daquele link; "Desfazer" devolve tudo', async () => {
    await comLink(estado, { aceites: ['plano', 'semana', 'lembrete'] })
    const chave = await chaveDeSair('semana')
    await pedir({ acao: 'sair', chave })
    expect((await pedir({ acao: 'parar-todos', chave })).corpo).toMatchObject({ feito: true, aviso: 'todos' })
    expect(estado.aceites.every((a) => a.saiuEm !== null)).toBe(true)
    expect(estado.emails.get('link-juliana')?.parouTudoEm).toBe('2026-11-05T12:43:00.000Z')
    await pedir({ acao: 'desfazer', chave })
    expect(estado.aceites.every((a) => a.saiuEm === null)).toBe(true)
    expect(estado.emails.get('link-juliana')?.parouTudoEm).toBeNull()
  })

  it('CA-2254: "Não quero receber e-mails deste plano" (o rodapé do S2) para tudo no link', async () => {
    await comLink(estado, { aceites: ['semana'] })
    await pedir({ acao: 'sair', chave: await chaveDeSair('s2') })
    expect(estado.emails.get('link-juliana')?.parouTudoEm).not.toBeNull()
    expect(estado.aceites[0]?.saiuEm).not.toBeNull()
  })

  it('CA-2252: o POST de um clique do Gmail tira o paciente daquele aviso, sem página', async () => {
    await comLink(estado, { aceites: ['lembrete', 'semana'] })
    const chave = await chaveDeSair('lembrete')
    expect(await responderAosAvisos({ metodo: 'POST', chaveDaUrl: chave, corpo: null, umClique: true }, deps)).toEqual({ status: 200, corpo: { ok: true } })
    expect(estado.aceites.map((a) => [a.tipo, a.saiuEm !== null])).toEqual([
      ['lembrete', true],
      ['semana', false],
    ])
  })

  it('CA-2255: a chave de um paciente só mexe nos avisos daquele link', async () => {
    await comLink(estado, { aceites: ['semana'] })
    await comLink(estado, { link: { id: 'link-carlos', token: 'carlos123456' }, email: 'carlos@outlook.com', aceites: ['semana'] })
    await pedir({ acao: 'sair', chave: await chaveDeSair('semana', 'link-carlos') })
    expect(estado.aceites.map((a) => [a.linkId, a.saiuEm !== null])).toEqual([
      ['link-juliana', false],
      ['link-carlos', true],
    ])
  })

  it('CA-2255: a chave mexida à mão é recusada: "Este endereço não vale."', async () => {
    await comLink(estado, { aceites: ['semana'] })
    const chave = await chaveDeSair('semana')
    const mexida = `${chave.slice(0, 31)}${chave.endsWith('Z') ? 'Y' : 'Z'}`
    expect(await pedir({ acao: 'sair', chave: mexida })).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(await pedir({ acao: 'sair', chave: 'curta' })).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(await responderAosAvisos({ metodo: 'POST', chaveDaUrl: 'x', corpo: null, umClique: true }, deps)).toEqual({ status: 404, corpo: { erro: CHAVE_QUE_NAO_VALE } })
    expect(estado.aceites[0]?.saiuEm).toBeNull()
  })

  it('D-1231: o descadastro do resumo da adesão desliga o N1 da conta, e "Desfazer" religa', async () => {
    const chave = await chaveDeSair('n1', null)
    expect((await pedir({ acao: 'sair', chave })).corpo).toMatchObject({ aviso: 'n1', feito: true, nutricionista: 'MetaNutri' })
    expect(estado.nutris.get(ANA.id)?.resumoDaAdesao).toBe(false)
    await pedir({ acao: 'desfazer', chave })
    expect(estado.nutris.get(ANA.id)?.resumoDaAdesao).toBe(true)
  })

  it('a chave de aceite não descadastra, e a de descadastro não aceita', async () => {
    await comPedidoDeAceite()
    expect((await pedir({ acao: 'sair', chave: ACEITE })).status).toBe(404)
    const chave = await chaveDeSair('semana')
    expect((await pedir({ acao: 'confirmar', chave })).status).toBe(404)
  })

  it('pedido sem ação: 400', async () => {
    expect((await pedir({ chave: ACEITE })).status).toBe(400)
  })
})

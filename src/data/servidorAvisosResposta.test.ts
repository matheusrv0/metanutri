// @vitest-environment node
// A função avisos-resposta (spec lado-do-paciente, D-1226 e D-1235): a página do aceite, a do descadastro e o descadastro
// de um clique, com o banco de mentira.
import { beforeEach, describe, expect, it } from 'vitest'
import { responderAosAvisos, type PedidoDaResposta } from '../../supabase/functions/_shared/avisos/avisosResposta.ts'
import { CHAVE_QUE_NAO_VALE, type DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, resendFalso, type EstadoFalso } from './servidorAvisosFalsos.test-utils.ts'

let estado: EstadoFalso
let deps: DependenciasComuns

const ACEITE = 'A'.repeat(32)

beforeEach(() => {
  acertarRelogio(new Date('2026-11-05T12:43:00.000Z'))
  const falso = bancoFalso()
  estado = falso.estado
  deps = dependencias(falso.banco, resendFalso())
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
    criadoEm: '2026-11-03T12:43:00.000Z',
    venceEm: sobre.vence ?? '2026-11-10T12:43:00.000Z',
    usadoEm: null,
    desfazer: null,
  })
  return { link, emailHash }
}

/** A chave de descadastro do aviso no link. */
const chaveDeSair = async (aviso: 'plano' | 'semana' | 'lembrete' | 's2' | 'n1', linkId: string | null = 'link-juliana') => {
  const chave = await deps.banco.chaveDeSair(linkId, ANA.id, aviso)
  if (chave === null) throw new Error('sem chave')
  return chave
}

describe('o aceite em dois passos (D-1226)', () => {
  it('CA-2241: abrir o endereço (a página lê a chave) não aceita nada', async () => {
    await comPedidoDeAceite()
    const r = await pedir({ acao: 'ler', chave: ACEITE })
    expect(r).toEqual({ status: 200, corpo: { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['plano', 'semana', 'lembrete'], escolhidos: ['semana', 'lembrete'], aviso: null, feito: false } })
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

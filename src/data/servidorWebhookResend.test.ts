// @vitest-environment node
// Os eventos do Resend (spec lado-do-paciente, D-1239, DP-LP-18): a assinatura do Svix, conferida antes de qualquer coisa.
import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BancoDosAvisos } from '../../supabase/functions/_shared/avisos/portas.ts'
import { motivoDaPausa, porcentagem } from '../../supabase/functions/_shared/avisos/reputacao.ts'
import { assinaturaConfere } from '../../supabase/functions/_shared/avisos/svix.ts'
import { receberEventoDoResend } from '../../supabase/functions/_shared/avisos/webhookResend.ts'
import { acertarRelogio, bancoFalso, comLink, envioAntigo, type EstadoFalso } from './servidorAvisosFalsos.test-utils.ts'

/** O segredo do painel do Resend: `whsec_` e 24 bytes em base64. */
const CHAVE = Buffer.from('chave-de-teste-do-webhook').toString('base64')
const SEGREDO = `whsec_${CHAVE}`
const AGORA = new Date('2026-11-03T15:00:00Z')
const MOMENTO = String(AGORA.getTime() / 1000)
const CORPO = JSON.stringify({ type: 'email.bounced', data: { email_id: 're_1', bounce: { type: 'Permanent' } } })

/** Assina como o Svix: HMAC-SHA256 de `id.momento.corpo`, em base64, com `v1,`. */
const assinarComoOSvix = (id: string, momento: string, corpo: string, chave = CHAVE): string =>
  `v1,${createHmac('sha256', Buffer.from(chave, 'base64')).update(`${id}.${momento}.${corpo}`).digest('base64')}`

const evento = (sobre: Partial<Parameters<typeof assinaturaConfere>[0]> = {}) => ({
  segredo: SEGREDO,
  id: 'msg_1',
  momento: MOMENTO,
  assinaturas: assinarComoOSvix('msg_1', MOMENTO, CORPO),
  corpo: CORPO,
  agora: AGORA,
  ...sobre,
})

describe('CA-2277: a assinatura do Svix', () => {
  it('CA-2277: a assinatura certa confere, também no meio de outras (rotação do segredo)', async () => {
    expect(await assinaturaConfere(evento())).toBe(true)
    expect(await assinaturaConfere(evento({ assinaturas: `v1,b3V0cmE= ${assinarComoOSvix('msg_1', MOMENTO, CORPO)}` }))).toBe(true)
  })

  it('CA-2277: assinatura errada, corpo mexido, outro id ou outro segredo: não confere', async () => {
    expect(await assinaturaConfere(evento({ assinaturas: 'v1,AAAA' }))).toBe(false)
    expect(await assinaturaConfere(evento({ corpo: CORPO.replace('Permanent', 'Transient') }))).toBe(false)
    expect(await assinaturaConfere(evento({ id: 'msg_2' }))).toBe(false)
    expect(await assinaturaConfere(evento({ segredo: `whsec_${Buffer.from('outra').toString('base64')}` }))).toBe(false)
  })

  it('CA-2277: sem segredo configurado, sem cabeçalhos ou fora dos 5 minutos: não confere', async () => {
    expect(await assinaturaConfere(evento({ segredo: null }))).toBe(false)
    expect(await assinaturaConfere(evento({ assinaturas: null }))).toBe(false)
    expect(await assinaturaConfere(evento({ momento: null }))).toBe(false)
    expect(await assinaturaConfere(evento({ agora: new Date(AGORA.getTime() + 6 * 60_000) }))).toBe(false)
    expect(await assinaturaConfere(evento({ momento: 'ontem' }))).toBe(false)
  })
})

// ---------- Os eventos (D-1239) ----------


let estado: EstadoFalso
let banco: BancoDosAvisos
let hash: string

beforeEach(async () => {
  acertarRelogio(AGORA)
  const falso = bancoFalso()
  estado = falso.estado
  banco = falso.banco
  hash = (await comLink(estado, { aceites: ['semana'] })).emailHash ?? ''
  estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: hash, dia: '2026-11-03', resendId: 're_1', estado: 'enviado' }))
})

/** O evento assinado como o Resend manda. */
function eventoDoResend(tipo: string, dados: Record<string, unknown>, sobre: Partial<{ assinaturas: string | null; segredo: string | null }> = {}) {
  const corpo = JSON.stringify({ type: tipo, created_at: AGORA.toISOString(), data: { email_id: 're_1', ...dados } })
  return receberEventoDoResend(
    { metodo: 'POST', corpo, id: 'msg_9', momento: MOMENTO, assinaturas: sobre.assinaturas === undefined ? assinarComoOSvix('msg_9', MOMENTO, corpo) : sobre.assinaturas },
    { banco, agora: () => AGORA, log: () => undefined, segredo: sobre.segredo === undefined ? SEGREDO : sobre.segredo },
  )
}

describe('os eventos do Resend (CA-2277)', () => {
  it('CA-2277: a devolução definitiva, com a assinatura certa, põe o endereço na supressão e o envio fica "Devolvido"', async () => {
    expect(await eventoDoResend('email.bounced', { bounce: { type: 'Permanent', subType: 'General' } })).toEqual({ status: 200, corpo: { ok: true } })
    expect(estado.supressao.get(hash)).toBe('devolvido')
    expect(estado.envios[0]?.estado).toBe('devolvido')
  })

  it('CA-2277: a queixa também; e o link para os e-mails do plano (CB-1213)', async () => {
    await eventoDoResend('email.complained', {})
    expect(estado.supressao.get(hash)).toBe('queixa')
    expect(estado.envios[0]?.estado).toBe('queixa')
    expect(estado.emails.get('link-juliana')?.parouTudoEm).toBe(AGORA.toISOString())
  })

  it('CA-2277: com a assinatura errada, ou sem o segredo, nada muda', async () => {
    expect((await eventoDoResend('email.bounced', { bounce: { type: 'Permanent' } }, { assinaturas: 'v1,AAAA' })).status).toBe(401)
    expect((await eventoDoResend('email.bounced', { bounce: { type: 'Permanent' } }, { segredo: null })).status).toBe(401)
    expect(estado.supressao.size).toBe(0)
    expect(estado.envios[0]?.estado).toBe('enviado')
  })

  it('CA-2264: entregue vira "Entregue"; a entrega não desfaz uma devolução que chegou antes', async () => {
    await eventoDoResend('email.delivered', {})
    expect(estado.envios[0]?.estado).toBe('entregue')
    await eventoDoResend('email.bounced', { bounce: { type: 'Permanent' } })
    await eventoDoResend('email.delivered', {})
    expect(estado.envios[0]?.estado).toBe('devolvido')
  })

  it('CB-1212: a devolução temporária não suprime; a terceira em 30 dias vira definitiva', async () => {
    estado.envios.push(envioAntigo({ tipo: 'A3', emailHash: hash, dia: '2026-10-20', estado: 'devolucao-temporaria', criadoEm: '2026-10-20T21:00:00.000Z' }))
    await eventoDoResend('email.bounced', { bounce: { type: 'Transient', subType: 'MailboxFull' } })
    expect(estado.envios[0]?.estado).toBe('devolucao-temporaria')
    expect(estado.supressao.size).toBe(0)
    estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: hash, dia: '2026-11-03', resendId: 're_2', estado: 'enviado' }))
    estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: hash, dia: '2026-10-25', estado: 'devolucao-temporaria', criadoEm: '2026-10-25T11:00:00.000Z' }))
    await eventoDoResend('email.bounced', { bounce: { type: 'Transient' } })
    expect(estado.supressao.get(hash)).toBe('devolvido')
  })

  it('evento de e-mail que não é dos avisos, ou de outro tipo: ignorado', async () => {
    expect((await eventoDoResend('email.delivered', { email_id: 're_de_outro' })).corpo).toEqual({ ignorado: true })
    expect((await eventoDoResend('email.opened', {})).corpo).toEqual({ ignorado: true })
  })
})

describe('a pausa automática (CA-2278)', () => {
  it('CA-2278: devolução acima de 2% em 7 dias, com 200 envios ou mais: os avisos param, com o motivo', async () => {
    for (let i = 0; i < 205; i++) estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: `${i}`.padStart(64, '0'), dia: '2026-11-02', criadoEm: '2026-11-02T11:00:00.000Z' }))
    for (let i = 0; i < 4; i++) estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: `d${i}`.padStart(64, '0'), dia: '2026-11-02', estado: 'devolvido', criadoEm: '2026-11-02T11:00:00.000Z' }))
    await eventoDoResend('email.bounced', { bounce: { type: 'Permanent' } })
    // 5 devolvidos em 210: 2,4%.
    expect(estado.estado).toEqual({ pausadoEm: AGORA.toISOString(), motivo: 'devolução 2,4%' })
  })

  it('CA-2278: abaixo de 200 envios, nada pausa; dentro dos limites, também não', () => {
    expect(motivoDaPausa({ envios: 150, devolvidos: 30, queixas: 5 })).toBeNull()
    expect(motivoDaPausa({ envios: 1000, devolvidos: 20, queixas: 0 })).toBeNull()
    expect(motivoDaPausa({ envios: 1000, devolvidos: 21, queixas: 0 })).toBe('devolução 2,1%')
    expect(motivoDaPausa({ envios: 2000, devolvidos: 0, queixas: 2 })).toBe('queixa 0,1%')
    expect(motivoDaPausa({ envios: 10000, devolvidos: 0, queixas: 6 })).toBe('queixa 0,06%')
    expect(porcentagem(0.03)).toBe('3%')
  })
})

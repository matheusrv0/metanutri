// @vitest-environment node
// Os eventos do Resend (spec lado-do-paciente, D-1239, DP-LP-18): a assinatura do Svix, conferida antes de qualquer coisa.
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assinaturaConfere } from '../../supabase/functions/_shared/avisos/svix.ts'

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

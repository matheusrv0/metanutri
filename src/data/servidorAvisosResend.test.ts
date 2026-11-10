// @vitest-environment node
// O envio pelo Resend em lote, a verificação contra robôs e a conferência do domínio (spec lado-do-paciente, DP-LP-14,
// DP-LP-17 e DP-LP-19). O `fetch` é de mentira: nada sai da máquina.
import { describe, expect, it } from 'vitest'
import { temServidorDeEmail } from '../../supabase/functions/_shared/avisos/dns.ts'
import type { Buscar, PedidoHttp } from '../../supabase/functions/_shared/avisos/http.ts'
import { enviarEmLote, remetente, type EmailParaEnviar } from '../../supabase/functions/_shared/avisos/resend.ts'
import { turnstileConfere } from '../../supabase/functions/_shared/avisos/turnstile.ts'

interface Pedido {
  readonly url: string
  readonly pedido: PedidoHttp
}

/** Um `fetch` falso que responde, em ordem, o que a lista diz; `'rede'` é a rede caída. */
function buscarFalso(respostas: readonly ({ readonly status: number; readonly corpo?: unknown } | 'rede')[]) {
  const pedidos: Pedido[] = []
  let n = 0
  const buscar: Buscar = async (url, pedido) => {
    pedidos.push({ url, pedido })
    const r = respostas[Math.min(n++, respostas.length - 1)]
    if (r === undefined || r === 'rede') throw new TypeError('Failed to fetch')
    return { status: r.status, json: async () => r.corpo ?? null }
  }
  return { buscar, pedidos }
}

const email = (i: number): EmailParaEnviar => ({
  nomeDoRemetente: 'Ana Lima via MetaNutri',
  para: `paciente${i}@exemplo.com`,
  responderPara: 'ana@nutri.com',
  assunto: 'Sua semana: 5 de 7 dias',
  html: '<p>oi</p>',
  texto: 'oi',
  cabecalhos: { 'List-Unsubscribe': '<https://x/avisos-resposta?c=abc>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  tipo: 'A2',
})

const ids = (n: number, desde = 0) => ({ data: Array.from({ length: n }, (_, i) => ({ id: `re_${desde + i}` })) })
const esperas: number[] = []
const deps = (buscar: Buscar, chave: string | null = 're_teste') => ({
  buscar,
  chave,
  endereco: 'avisos@avisos.metanutri.com.br',
  esperar: async (ms: number) => {
    esperas.push(ms)
  },
})

describe('o lote do Resend (CA-2275, CA-2276)', () => {
  it('CA-2275: 230 avisos saem em 3 pedidos (100, 100 e 30), com 200 ms entre eles', async () => {
    esperas.length = 0
    const { buscar, pedidos } = buscarFalso([
      { status: 200, corpo: ids(100) },
      { status: 200, corpo: ids(100, 100) },
      { status: 200, corpo: ids(30, 200) },
    ])
    const r = await enviarEmLote(Array.from({ length: 230 }, (_, i) => email(i)), 'rodada-1', deps(buscar))
    expect(pedidos.map((p) => (JSON.parse(p.pedido.body ?? '[]') as unknown[]).length)).toEqual([100, 100, 30])
    expect(pedidos.every((p) => p.url === 'https://api.resend.com/emails/batch' && p.pedido.method === 'POST')).toBe(true)
    expect(r.filter((x) => x.ok)).toHaveLength(230)
    expect(r[229]).toEqual({ ok: true, id: 're_229' })
    expect(esperas).toEqual([200, 200])
  })

  it('CA-2275: um 429 no segundo lote: os 100 que saíram ficam, e os 130 que faltam voltam como "limite", sem outro pedido', async () => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo: ids(100) }, { status: 429, corpo: { message: 'Too many requests' } }])
    const r = await enviarEmLote(Array.from({ length: 230 }, (_, i) => email(i)), 'rodada-2', deps(buscar))
    expect(pedidos).toHaveLength(2)
    expect(r.slice(0, 100).every((x) => x.ok)).toBe(true)
    expect(r.slice(100).every((x) => !x.ok && x.motivo === 'limite')).toBe(true)
  })

  it('CA-2276: cada lote leva a chave de idempotência, para o Resend não repetir o que já saiu', async () => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo: ids(100) }, { status: 200, corpo: ids(1) }])
    await enviarEmLote(Array.from({ length: 101 }, (_, i) => email(i)), 'avisos-2026-11-03-manha', deps(buscar))
    expect(pedidos.map((p) => p.pedido.headers['Idempotency-Key'])).toEqual(['avisos-2026-11-03-manha-0', 'avisos-2026-11-03-manha-1'])
  })

  it('CB-1216: Resend fora do ar ou rede caída: nada saiu, e o resto nem é pedido', async () => {
    const fora = buscarFalso([{ status: 503 }])
    expect(await enviarEmLote([email(1), email(2)], 'x', deps(fora.buscar))).toEqual([
      { ok: false, motivo: 'fora' },
      { ok: false, motivo: 'fora' },
    ])
    const rede = buscarFalso(['rede'])
    expect(await enviarEmLote([email(1)], 'x', deps(rede.buscar))).toEqual([{ ok: false, motivo: 'fora' }])
  })

  it('CA-2282: sem a chave, nada é pedido', async () => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo: ids(1) }])
    expect(await enviarEmLote([email(1)], 'x', deps(buscar, null))).toEqual([{ ok: false, motivo: 'fora' }])
    expect(pedidos).toHaveLength(0)
  })

  it('D-1225, D-1235 e CA-2279: o e-mail sai do subdomínio dos avisos, com resposta para a nutricionista e o descadastro', async () => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo: ids(1) }])
    await enviarEmLote([email(1)], 'x', deps(buscar))
    const [enviado] = JSON.parse(pedidos[0]?.pedido.body ?? '[]') as Record<string, unknown>[]
    expect(enviado).toMatchObject({
      from: '"Ana Lima via MetaNutri" <avisos@avisos.metanutri.com.br>',
      to: ['paciente1@exemplo.com'],
      reply_to: 'ana@nutri.com',
      headers: { 'List-Unsubscribe': '<https://x/avisos-resposta?c=abc>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      tags: [{ name: 'tipo', value: 'A2' }],
    })
    expect(pedidos[0]?.pedido.headers['Authorization']).toBe('Bearer re_teste')
  })

  it('o nome do remetente não quebra o cabeçalho', () => {
    expect(remetente('Ana "Lima"\r\nBcc: x@y', 'a@b.c')).toBe('"Ana Lima Bcc: x@y" <a@b.c>')
    expect(remetente('', 'a@b.c')).toBe('"MetaNutri" <a@b.c>')
  })
})

describe('a verificação contra robôs (DP-LP-19)', () => {
  const pedir = (corpo: unknown, sobre: Partial<{ segredo: string | null; token: string | null }> = {}) => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo }])
    return { pedidos, conferiu: turnstileConfere({ buscar, segredo: 'segredo', token: 'tok', ip: '200.1.2.3', host: 'app.metanutri.com.br', ...sobre }) }
  }
  const CERTO = { success: true, action: 'recuperar-link', hostname: 'app.metanutri.com.br' }

  it('D-1220: confere o token no siteverify, com a ação recuperar-link e o host do app', async () => {
    const { pedidos, conferiu } = pedir(CERTO)
    expect(await conferiu).toBe(true)
    expect(pedidos[0]?.url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    expect(pedidos[0]?.pedido.body).toBe('secret=segredo&response=tok&remoteip=200.1.2.3')
  })

  it('D-1220: token de outra ação, recusado ou sem segredo não confere', async () => {
    expect(await pedir({ success: true, action: 'login' }).conferiu).toBe(false)
    expect(await pedir({ success: false }).conferiu).toBe(false)
    expect(await pedir({ success: true }, { segredo: null }).conferiu).toBe(false)
    expect(await pedir({ success: true }, { token: null }).conferiu).toBe(false)
  })

  it('CA-2296: token sem a ação, com outra ação ou de outro endereço não confere', async () => {
    expect(await pedir({ ...CERTO, action: undefined }).conferiu).toBe(false)
    expect(await pedir({ ...CERTO, action: '' }).conferiu).toBe(false)
    expect(await pedir({ ...CERTO, action: 'entrar' }).conferiu).toBe(false)
    expect(await pedir({ ...CERTO, hostname: 'outro-site.com' }).conferiu).toBe(false)
    expect(await pedir({ ...CERTO, hostname: undefined }).conferiu).toBe(false)
    expect(await pedir(CERTO, { segredo: null }).conferiu).toBe(false)
  })
})

describe('o domínio recebe e-mail? (CA-2236, DP-LP-17)', () => {
  it('CA-2236: com MX, recebe', async () => {
    const { buscar, pedidos } = buscarFalso([{ status: 200, corpo: { Status: 0, Answer: [{ type: 15, data: '10 mx.gmail.com.' }] } }])
    expect(await temServidorDeEmail('gmail.com', buscar)).toBe(true)
    expect(pedidos[0]?.url).toBe('https://cloudflare-dns.com/dns-query?name=gmail.com&type=MX')
  })

  it('CA-2236: domínio que não existe, ou com o MX nulo, não recebe ("Confira o e-mail.")', async () => {
    expect(await temServidorDeEmail('gmial.con', buscarFalso([{ status: 200, corpo: { Status: 3 } }]).buscar)).toBe(false)
    expect(await temServidorDeEmail('nao-recebe.com', buscarFalso([{ status: 200, corpo: { Status: 0, Answer: [{ type: 15, data: '0 .' }] } }]).buscar)).toBe(false)
  })

  it('sem MX, o registro A também recebe; sem nenhum, não recebe', async () => {
    const comA = buscarFalso([
      { status: 200, corpo: { Status: 0 } },
      { status: 200, corpo: { Status: 0, Answer: [{ type: 1, data: '1.2.3.4' }] } },
    ])
    expect(await temServidorDeEmail('empresa.com.br', comA.buscar)).toBe(true)
    const nada = buscarFalso([{ status: 200, corpo: { Status: 0 } }, { status: 200, corpo: { Status: 0 } }])
    expect(await temServidorDeEmail('vazio.com', nada.buscar)).toBe(false)
  })

  it('DP-LP-17: a consulta que falha não recusa (nulo)', async () => {
    expect(await temServidorDeEmail('gmail.com', buscarFalso(['rede']).buscar)).toBeNull()
    expect(await temServidorDeEmail('gmail.com', buscarFalso([{ status: 500 }]).buscar)).toBeNull()
    expect(await temServidorDeEmail('gmail.com', buscarFalso([{ status: 200, corpo: { Status: 2 } }]).buscar)).toBeNull()
  })
})

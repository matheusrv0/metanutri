// @vitest-environment node
// Spec seguranca-lote-4 (D-136): ataques às funções de cobrança pelo núcleo puro, com o banco e a operadora
// de mentira (src/data/servidorFalsos.test-utils.ts). As funções Deno não sobem no Supabase local (DP-A5).
//  - CA-490: 11 pedidos com cartão na mesma hora, na mesma conta: o 11º recebe 429 sem chamar a operadora.
//  - CA-488 (complemento): o id de outra conta no corpo do pedido é ignorado; vale só a conta da sessão.
import { assinar, type PedidoDeAssinatura } from '../../supabase/functions/_shared/assinar.ts'
import { MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'
import { gerenciarAssinatura, type PedidoDeGerenciar } from '../../supabase/functions/_shared/gerenciarAssinatura.ts'
import { cenario, responde } from './servidorFalsos.test-utils.ts'

const ANA = { id: 'u1', email: 'ana@exemplo.com' }
const BIA = { id: 'u2', email: 'bia@exemplo.com' }
const CRIADA = { id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-06T15:00:00.000Z' }
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
const ATIVA_ANA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const ATIVA_BIA = { ...ATIVA_ANA, nutricionista_id: 'u2', plano: 'pro', preapproval_id: 'pre-2', cartao_final: '1111' }
const ROTAS = {
  'POST /preapproval': [responde(201, CRIADA)],
  'GET /preapproval/pre-1': [responde(200, COBRADA)],
  'PUT /preapproval/pre-1': [responde(200, { status: 'cancelled' })],
  'GET /preapproval/pre-2': [responde(200, COBRADA)],
  'PUT /preapproval/pre-2': [responde(200, { status: 'cancelled' })],
}

const ASSINAR: PedidoDeAssinatura = {
  conta: ANA,
  corpo: { plano: 'solo', ciclo: 'mensal', card_token_id: 'tok_teste_12345', cartao: { bandeira: 'Mastercard', final: '6351' } },
  site: 'https://metanutri.com.br/',
}
const trocar = (n: number, extra: Readonly<Record<string, unknown>> = {}): PedidoDeGerenciar => ({
  conta: ANA,
  corpo: { acao: 'trocar_cartao', card_token_id: `tok_novo_${String(n).padStart(5, '0')}`, cartao: { bandeira: 'Visa', final: '5682' }, ...extra },
})

describe('CA-490: o limite de pedidos com cartão por conta', () => {
  it('CA-490: 11 trocas de cartão seguidas na mesma hora: 10 passam e a 11ª recebe 429 sem chamar a operadora', async () => {
    const c = cenario([ATIVA_ANA], ROTAS)
    const status: number[] = []
    for (let n = 1; n <= 11; n++) status.push((await gerenciarAssinatura(trocar(n), c.deps)).status)
    expect(status).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 429])
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(10)
    expect(c.chamadas).toHaveLength(10)
    expect(c.reservas.size).toBe(0)
  })

  it('CA-490: assinar e depois 10 trocas na mesma hora: o 11º pedido com cartão recebe 429, com a frase do limite', async () => {
    const c = cenario([], ROTAS)
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
    const respostas = []
    for (let n = 1; n <= 10; n++) respostas.push(await gerenciarAssinatura(trocar(n), c.deps))
    expect(respostas.slice(0, 9).every((r) => r.status === 200)).toBe(true)
    expect(respostas[9]).toEqual({ status: 429, corpo: { erro: MUITAS_CHAMADAS, codigo: 'muitas-chamadas' } })
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['POST', ...Array.from({ length: 9 }, () => 'PUT')])
  })

  it('CA-490: o limite é da conta: outra conta, na mesma hora, ainda passa', async () => {
    const c = cenario([ATIVA_ANA, ATIVA_BIA], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, new Date(c.deps.agora().getTime() - 60_000))
    expect((await gerenciarAssinatura(trocar(11), c.deps)).status).toBe(429)
    const daBia = await gerenciarAssinatura({ ...trocar(12), conta: BIA }, c.deps)
    expect(daBia.status).toBe(200)
    expect(c.pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['PUT /preapproval/pre-2'])
  })
})

describe('CA-488: a função de cobrança só mexe na conta da sessão', () => {
  const ALHEIO = { nutricionista_id: 'u2', conta: 'u2', usuario: 'u2', id: 'u2', preapproval_id: 'pre-2' }

  it('CA-488: cancelar com o id e a assinatura de outra conta no corpo cancela só a própria', async () => {
    const c = cenario([ATIVA_ANA, ATIVA_BIA], ROTAS)
    const r = await gerenciarAssinatura({ conta: ANA, corpo: { acao: 'cancelar', ...ALHEIO } }, c.deps)
    expect(r.status).toBe(200)
    expect(c.pedidos.every((p) => p.caminho === '/preapproval/pre-1')).toBe(true)
    expect(c.assinaturas.get('u1')?.status).toBe('cancelada')
    expect(c.assinaturas.get('u2')).toEqual(expect.objectContaining({ status: 'ativa', preapproval_id: 'pre-2', cartao_final: '1111' }))
  })

  it('CA-488: trocar o cartão com o id de outra conta no corpo troca só o da própria', async () => {
    const c = cenario([ATIVA_ANA, ATIVA_BIA], ROTAS)
    expect((await gerenciarAssinatura(trocar(1, ALHEIO), c.deps)).status).toBe(200)
    expect(c.pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['PUT /preapproval/pre-1'])
    expect(c.assinaturas.get('u2')?.cartao_final).toBe('1111')
    expect(c.chamadas.map((ch) => ch.conta)).toEqual(['u1'])
  })

  it('CA-488: a prévia com o id de outra conta no corpo lê só a própria', async () => {
    const c = cenario([ATIVA_ANA, ATIVA_BIA], ROTAS)
    expect((await gerenciarAssinatura({ conta: ANA, corpo: { acao: 'previa', ...ALHEIO } }, c.deps)).status).toBe(200)
    expect(c.pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual(['GET /preapproval/pre-1'])
  })

  it('CA-488: assinar com o id de outra conta no corpo grava a assinatura na conta da sessão', async () => {
    const c = cenario([], ROTAS)
    const r = await assinar({ ...ASSINAR, corpo: { ...ASSINAR.corpo as Record<string, unknown>, ...ALHEIO } }, c.deps)
    expect(r.status).toBe(200)
    expect(c.assinaturas.get('u1')?.preapproval_id).toBe('pre-1')
    expect(c.assinaturas.has('u2')).toBe(false)
  })

  it('CA-488: sem sessão, nada acontece, nem com o id de outra conta no corpo', async () => {
    const c = cenario([ATIVA_BIA], ROTAS)
    expect((await gerenciarAssinatura({ conta: null, corpo: { acao: 'cancelar', ...ALHEIO } }, c.deps)).status).toBe(401)
    expect((await assinar({ ...ASSINAR, conta: null }, c.deps)).status).toBe(401)
    expect(c.pedidos).toEqual([])
    expect(c.assinaturas.get('u2')?.status).toBe('ativa')
  })
})

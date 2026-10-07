// @vitest-environment node
// D-108 (spec seguranca-lote-2): o limite de chamadas à operadora por conta, pela assinar e pela
// gerenciar-assinatura, com o banco de mentira (src/data/servidorFalsos.test-utils.ts).
import { assinar, type PedidoDeAssinatura } from '../../supabase/functions/_shared/assinar.ts'
import { CHAMADAS_FICAM_MS, JANELA_DAS_CHAMADAS_MS, LIMITE_DE_CHAMADAS, MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'
import { SEM_COBRANCA, UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import { FORA, gerenciarAssinatura, type PedidoDeGerenciar } from '../../supabase/functions/_shared/gerenciarAssinatura.ts'
import type { RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import { AGORA, cenario, linhaDe, responde } from './servidorFalsos.test-utils.ts'

const CONTA = { id: 'u1', email: 'ana@exemplo.com' }
const TOKEN = 'tok_teste_12345'
const ASSINAR: PedidoDeAssinatura = {
  conta: CONTA,
  corpo: { plano: 'solo', ciclo: 'mensal', card_token_id: TOKEN, cartao: { bandeira: 'Mastercard', final: '6351' } },
  site: 'https://metanutri.com.br/',
}
const pedir = (corpo: unknown): PedidoDeGerenciar => ({ conta: CONTA, corpo })
const PREVIA = pedir({ acao: 'previa' })
const CANCELAR = pedir({ acao: 'cancelar' })
const TROCAR = pedir({ acao: 'trocar_cartao', card_token_id: 'tok_novo_12345', cartao: { bandeira: 'Visa', final: '5682' } })

const ATIVA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const POST = 'POST /preapproval'
const GET = 'GET /preapproval/pre-1'
const PUT = 'PUT /preapproval/pre-1'
const BUSCA = 'GET /preapproval/search?payer_email=ana%40exemplo.com&limit=50'
const CRIADA = { id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-06T15:00:00.000Z' }
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
/** A operadora respondendo bem a cada pedido. */
const ROTAS = { [POST]: [responde(201, CRIADA)], [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] }

const MUITAS = { status: 429, corpo: { erro: 'Muitas tentativas seguidas. Espere uma hora e tente de novo.', codigo: 'muitas-chamadas' } }
const SEM_CONTAGEM_ASSINAR = { status: 502, corpo: { erro: SEM_COBRANCA } }
const SEM_CONTAGEM_GERENCIAR = { status: 502, corpo: { erro: FORA } }

const HORA_MS = 3_600_000
const antes = (horas: number) => new Date(AGORA.getTime() - horas * HORA_MS)

type Rotas = Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>>
type Linha = Parameters<typeof linhaDe>[0]

describe('D-108: os números da spec', () => {
  it('10 pedidos com cartão e 20 de conferir por hora; as chamadas anotadas ficam 2 dias', () => {
    expect(LIMITE_DE_CHAMADAS).toEqual({ cartao: 10, conferir: 20 })
    expect(JANELA_DAS_CHAMADAS_MS).toBe(HORA_MS)
    expect(CHAMADAS_FICAM_MS).toBe(2 * UM_DIA_MS)
    expect(MUITAS_CHAMADAS).toBe(MUITAS.corpo.erro)
  })
})

describe('D-108: o limite de pedidos com cartão (CA-448)', () => {
  it('CA-448: assinar com 10 pedidos com cartão na última hora responde 429 sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect(await assinar(ASSINAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.chamadas).toHaveLength(10)
    expect(c.ordem).toEqual(['contarRecusas', 'soltarReservaVencida', 'reservar', 'lerDaConta', 'anotarChamada', 'soltarReserva'])
    expect(c.log).toHaveBeenCalledWith('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', 'cartao')
  })

  it('CA-448: trocar o cartão com 10 na última hora responde 429 sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', 'anotarChamada', 'soltarReserva'])
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
  })

  it('CA-448: assinar e trocar o cartão somam no mesmo limite', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
  })

  it('CB-113: o 10º pedido com cartão ainda passa, em assinar e em trocar o cartão', async () => {
    const assinando = cenario([], ROTAS)
    assinando.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await assinar(ASSINAR, assinando.deps)).status).toBe(200)
    expect(assinando.chamadas).toHaveLength(10)
    const trocando = cenario([ATIVA], ROTAS)
    trocando.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await gerenciarAssinatura(TROCAR, trocando.deps)).status).toBe(200)
    expect(trocando.chamadas).toHaveLength(10)
  })

  it('CB-113: a janela é estrita: os pedidos de exatamente 1 h atrás já não contam', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(1))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
  })

  it.each<[string, Rotas, number]>([
    ['assinou', { [POST]: [responde(201, CRIADA)] }, 200],
    ['o banco recusou o cartão', { [POST]: [responde(400, { message: 'cc_rejected_other_reason' })] }, 402],
    ['sem resposta e a busca não achou', { [POST]: [null], [BUSCA]: [responde(200, { results: [] })] }, 502],
    ['erro do lado dela e a busca não achou', { [POST]: [responde(503)], [BUSCA]: [responde(200, { results: [] })] }, 502],
  ])('CA-448: qualquer resultado conta (%s): a chamada fica anotada', async (_caso, rotas, status) => {
    const c = cenario([], rotas)
    expect((await assinar(ASSINAR, c.deps)).status).toBe(status)
    expect(c.chamadas.map((ch) => [ch.conta, ch.tipo])).toEqual([['u1', 'cartao']])
  })

  it('D-108: só conta o pedido que chegaria à operadora: quem já assina, o limite de recusas, outra aba, cartão incompleto e troca sem assinatura ativa não anotam', async () => {
    const jaAssina = cenario([ATIVA], ROTAS)
    expect((await assinar(ASSINAR, jaAssina.deps)).status).toBe(409)
    const comRecusas = cenario([], ROTAS)
    comRecusas.semearTentativas('u1', Array.from({ length: 5 }, () => ({ quando: antes(1), recusada: true })))
    expect((await assinar(ASSINAR, comRecusas.deps)).corpo['codigo']).toBe('muitas-tentativas')
    const outraAba = cenario([], ROTAS)
    outraAba.comReserva('u1')
    expect((await assinar(ASSINAR, outraAba.deps)).status).toBe(409)
    const incompleto = cenario([], ROTAS)
    expect((await assinar({ ...ASSINAR, corpo: { plano: 'solo', ciclo: 'mensal' } }, incompleto.deps)).status).toBe(400)
    const naoAtiva = cenario([{ ...ATIVA, status: 'pendente' }], ROTAS)
    expect((await gerenciarAssinatura(TROCAR, naoAtiva.deps)).status).toBe(409)
    for (const c of [jaAssina, comRecusas, outraAba, incompleto, naoAtiva]) {
      expect(c.chamadas).toEqual([])
      expect(c.ordem).not.toContain('anotarChamada')
    }
  })

  it('D-108: o limite é de cada conta: 10 pedidos de outra conta não fecham este', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('outra', 'cartao', 10, antes(0.5))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
  })

  it('CB-114: sem conseguir contar, assinar responde 502 (nada foi cobrado) sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([], ROTAS)
    c.falhar('anotarChamada')
    expect(await assinar(ASSINAR, c.deps)).toEqual(SEM_CONTAGEM_ASSINAR)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as chamadas à operadora:', 'banco fora')
  })

  it('CB-114: sem conseguir contar, trocar o cartão responde 502 (nada mudou) sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.falhar('anotarChamada')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(SEM_CONTAGEM_GERENCIAR)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it('depois de anotar, apaga as chamadas de mais de 2 dias', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 1, antes(49))
    c.semearChamadas('u1', 'conferir', 1, antes(47))
    const apagar = vi.spyOn(c.banco, 'apagarChamadasAntesDe')
    await assinar(ASSINAR, c.deps)
    expect(apagar).toHaveBeenCalledWith(new Date(AGORA.getTime() - 2 * UM_DIA_MS))
    expect(c.chamadas.map((ch) => [ch.tipo, ch.quando.toISOString()])).toEqual([
      ['conferir', antes(47).toISOString()],
      ['cartao', AGORA.toISOString()],
    ])
  })

  it('apagar as antigas que falha só vai para o registro; o pedido segue', async () => {
    const c = cenario([], ROTAS)
    const deps = { ...c.deps, banco: { ...c.banco, apagarChamadasAntesDe: () => Promise.reject(new Error('chamadas fora')) } }
    expect((await assinar(ASSINAR, deps)).status).toBe(200)
    expect(c.log).toHaveBeenCalledWith('Não consegui apagar as chamadas antigas à operadora:', 'chamadas fora')
  })

  it('nenhum registro leva o código do cartão nem o e-mail', async () => {
    const cheio = cenario([], ROTAS)
    cheio.semearChamadas('u1', 'cartao', 10, antes(0.5))
    const semContagem = cenario([], ROTAS)
    semContagem.falhar('anotarChamada')
    for (const c of [cheio, semContagem]) await assinar(ASSINAR, c.deps)
    const registros = JSON.stringify([...cheio.log.mock.calls, ...semContagem.log.mock.calls])
    expect(registros).not.toContain(TOKEN)
    expect(registros).not.toContain('ana@exemplo.com')
  })
})

describe('D-108: o limite de conferir e cancelar (CA-449)', () => {
  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CA-449: %s com 20 pedidos na última hora responde 429 sem chamar a operadora; nada muda', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.ordem).toEqual(['lerDaConta', 'anotarChamada'])
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
    expect(c.log).toHaveBeenCalledWith('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', 'conferir')
  })

  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CB-113: o 20º pedido de %s ainda passa', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 19, antes(0.5))
    expect((await gerenciarAssinatura(pedido, c.deps)).status).toBe(200)
    expect(c.chamadas).toHaveLength(20)
  })

  it('CA-449: prévia e cancelar somam no mesmo limite', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 19, antes(0.5))
    expect((await gerenciarAssinatura(PREVIA, c.deps)).status).toBe(200)
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['GET'])
    expect(c.assinaturas.get('u1')?.status).toBe('ativa')
  })

  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CB-114: sem conseguir contar, %s responde 502 sem chamar a operadora', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.falhar('anotarChamada')
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(SEM_CONTAGEM_GERENCIAR)
    expect(c.pedidos).toEqual([])
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as chamadas à operadora:', 'banco fora')
  })

  it('CB-115: cinco prévias ao mesmo tempo, com 18 na última hora: só duas chegam à operadora', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 18, antes(0.5))
    const respostas = await Promise.all(Array.from({ length: 5 }, () => gerenciarAssinatura(PREVIA, c.deps)))
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 200, 429, 429, 429])
    expect(c.pedidos.filter((p) => p.metodo === 'GET')).toHaveLength(2)
    expect(c.chamadas.filter((ch) => ch.tipo === 'conferir')).toHaveLength(20)
  })

  it.each<[string, PedidoDeGerenciar, Linha]>([
    ['a prévia de uma já cancelada aqui (R11)', PREVIA, { ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z' }],
    ['cancelar uma já cancelada aqui (CB-93)', CANCELAR, { ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z' }],
    ['a prévia de uma pendente', PREVIA, { ...ATIVA, status: 'pendente' }],
    ['a conta sem assinatura paga (409)', PREVIA, { ...ATIVA, preapproval_id: null }],
  ])('D-108: %s não chega à operadora e não conta, nem com o limite cheio', async (_caso, pedido, linha) => {
    const c = cenario([linha], ROTAS)
    c.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect((await gerenciarAssinatura(pedido, c.deps)).status).not.toBe(429)
    expect(c.chamadas).toHaveLength(20)
    expect(c.pedidos).toEqual([])
  })

  it('D-108: cartão e conferir são limites separados', async () => {
    const conferir = cenario([ATIVA], ROTAS)
    conferir.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect((await gerenciarAssinatura(PREVIA, conferir.deps)).status).toBe(200)
    const cartao = cenario([ATIVA], ROTAS)
    cartao.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect((await gerenciarAssinatura(TROCAR, cartao.deps)).status).toBe(200)
  })
})

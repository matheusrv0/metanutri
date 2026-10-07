// @vitest-environment node
import { EM_ANDAMENTO } from '../../supabase/functions/_shared/assinar.ts'
import { RECUSA_PADRAO, UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import {
  desfechoDoCancelamento,
  FORA,
  GRAVADA_LA_SO,
  gerenciarAssinatura,
  type Desfecho,
  type PedidoDeGerenciar,
} from '../../supabase/functions/_shared/gerenciarAssinatura.ts'
import type { Operadora, RecusasContadas, RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import { AGORA, cenario, linhaDe, responde, type Cenario } from './servidorFalsos.test-utils.ts'

const CONTA = { id: 'u1', email: 'ana@exemplo.com' }
const ATIVA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const GET = 'GET /preapproval/pre-1'
const PUT = 'PUT /preapproval/pre-1'
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
const SEM_COBRANCA_AINDA = { status: 'authorized', summarized: { charged_quantity: 0 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
/** A véspera de 6/11, 23h59min59s em Brasília (CA-378). */
const VALE_ATE = '2026-11-06T02:59:59.000Z'

const TOKEN = 'tok_novo_12345'
const CARTAO_NOVO = { bandeira: 'Visa', final: '5682' }
const pedir = (corpo: unknown): PedidoDeGerenciar => ({ conta: CONTA, corpo })
const PREVIA = pedir({ acao: 'previa' })
const CANCELAR = pedir({ acao: 'cancelar' })
const TROCAR = pedir({ acao: 'trocar_cartao', card_token_id: TOKEN, cartao: CARTAO_NOVO })
const trocarCom = (mudanca: Readonly<Record<string, unknown>>) => pedir({ acao: 'trocar_cartao', card_token_id: TOKEN, cartao: CARTAO_NOVO, ...mudanca })

const FALHOU = { status: 502, corpo: { erro: FORA } }
const TROCOU = { status: 200, corpo: { cartao: CARTAO_NOVO } }
const MUITAS = { status: 429, corpo: { erro: 'Muitas tentativas com cartão recusado. Tente de novo amanhã.', codigo: 'muitas-tentativas' } }
const RECUSA_DO_BANCO = responde(400, { message: 'cc_rejected_bad_filled_security_code' })

const HORA_MS = 3_600_000
const antes = (horas: number) => new Date(AGORA.getTime() - horas * HORA_MS)
/** `n` recusas de cartão feitas `horas` atrás. */
const recusas = (n: number, horas: number) => Array.from({ length: n }, () => ({ quando: antes(horas), recusada: true }))

type Rotas = Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>>
type Linha = Parameters<typeof linhaDe>[0]

/** A linha como viria de uma leitura sem a coluna `ultima_cobranca_paga` (o campo some, não é nulo). */
const semUltimaPaga = (parcial: Linha) => {
  const linha = linhaDe(parcial)
  Reflect.deleteProperty(linha, 'ultima_cobranca_paga')
  return linha
}
const CANCELADA_COM_PERIODO = { ...ATIVA, status: 'cancelada', expira_em: VALE_ATE, encerrada_por: 'pessoa' }
const ENCERRADA_POR_RECUSA = { ...ATIVA, status: 'cancelada', expira_em: null, encerrada_por: 'recusa', ultima_cobranca_paga: '2026-09-06T15:00:00.000Z' }

describe('desfechoDoCancelamento: o que cancelar agora faz (D-81)', () => {
  it.each<[string, Readonly<Record<string, unknown>> | null, Linha, Desfecho]>([
    ['nenhuma cobrança ainda', SEM_COBRANCA_AINDA, ATIVA, { cobrada: false, expiraEm: null }],
    ['uma cobrança', COBRADA, ATIVA, { cobrada: true, expiraEm: VALE_ATE }],
    [
      'sem charged_quantity, com last_charged_date',
      { summarized: { last_charged_date: '2026-10-06T16:00:00Z' }, next_payment_date: '2026-11-06T15:00:00.000Z' },
      ATIVA,
      { cobrada: true, expiraEm: VALE_ATE },
    ],
    [
      'sem resumo; a última paga anotada aqui (D-83)',
      { next_payment_date: '2026-11-06T15:00:00.000Z' },
      { ...ATIVA, ultima_cobranca_paga: '2026-10-06T16:00:00.000Z' },
      { cobrada: true, expiraEm: VALE_ATE },
    ],
    ['sem resumo e nada anotado aqui: não cobrada', { next_payment_date: '2026-11-06T15:00:00.000Z' }, ATIVA, { cobrada: false, expiraEm: null }],
    ['sem nada da operadora e nada anotado aqui: não cobrada', null, ATIVA, { cobrada: false, expiraEm: null }],
    ['cobrada, sem data da operadora: vale a gravada aqui', { summarized: { charged_quantity: 1 } }, ATIVA, { cobrada: true, expiraEm: VALE_ATE }],
    [
      'cobrada, a próxima a menos de um dia e nada gravado',
      { summarized: { charged_quantity: 1 }, next_payment_date: '2026-10-07T10:00:00.000Z' },
      { ...ATIVA, proxima_cobranca: null },
      { cobrada: true, expiraEm: null },
    ],
    ['pendente nunca tem período', COBRADA, { ...ATIVA, status: 'pendente' }, { cobrada: false, expiraEm: null }],
    ['pausada nunca tem período', COBRADA, { ...ATIVA, status: 'pausada' }, { cobrada: false, expiraEm: null }],
  ])('%s', (_caso, daOperadora, linha, esperado) => {
    expect(desfechoDoCancelamento(linhaDe(linha), daOperadora, false, AGORA)).toEqual(esperado)
  })

  it('já cancelada lá: a data da operadora não vale, só a gravada aqui', () => {
    const daOperadora = { status: 'cancelled', summarized: { charged_quantity: 1 }, next_payment_date: '2026-12-06T15:00:00.000Z' }
    expect(desfechoDoCancelamento(linhaDe(ATIVA), daOperadora, true, AGORA)).toEqual({ cobrada: true, expiraEm: VALE_ATE })
  })

  it('a linha sem o campo da última paga (ausente, não nulo) ou com uma data que não se lê não conta como cobrada', () => {
    expect(desfechoDoCancelamento(semUltimaPaga(ATIVA), SEM_COBRANCA_AINDA, false, AGORA)).toEqual({ cobrada: false, expiraEm: null })
    expect(desfechoDoCancelamento(linhaDe({ ...ATIVA, ultima_cobranca_paga: 'ontem' }), SEM_COBRANCA_AINDA, false, AGORA)).toEqual({ cobrada: false, expiraEm: null })
  })
})

describe('gerenciarAssinatura: o núcleo da função (spec checkout-proprio e cobranca-em-producao)', () => {
  it('401 sem sessão; 400 corpo inválido ou ação desconhecida; 409 sem assinatura paga', async () => {
    const semSessao = cenario([ATIVA])
    expect(await gerenciarAssinatura({ conta: null, corpo: { acao: 'cancelar' } }, semSessao.deps)).toEqual({
      status: 401,
      corpo: { erro: 'Entre na sua conta antes de mudar a assinatura.' },
    })
    expect(semSessao.ordem).toEqual([])

    for (const corpo of [[], null, 'cancelar']) {
      const c = cenario([ATIVA])
      expect(await gerenciarAssinatura(pedir(corpo), c.deps)).toEqual({ status: 400, corpo: { erro: 'Corpo da requisição inválido.' } })
      expect(c.ordem).toEqual([])
    }

    const desconhecida = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(pedir({ acao: 'x' }), desconhecida.deps)).toEqual({ status: 400, corpo: { erro: 'Ação desconhecida.' } })
    expect(desconhecida.pedidos).toEqual([])

    const semPaga: readonly (readonly Linha[])[] = [
      [],
      [{ nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-03-01T02:59:59.000Z' }],
      [{ ...ATIVA, preapproval_id: null }],
    ]
    for (const linhas of semPaga) {
      for (const pedido of [PREVIA, CANCELAR, TROCAR]) {
        const c = cenario(linhas, { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
        expect(await gerenciarAssinatura(pedido, c.deps)).toEqual({ status: 409, corpo: { erro: 'Esta conta não tem assinatura paga.' } })
        expect(c.ordem).toEqual(['lerDaConta'])
      }
    }
  })

  it.each([PREVIA, CANCELAR, TROCAR])('leitura do banco que falha: 502, sem falar com a operadora (%#)', async (pedido) => {
    const c = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    c.falhar('lerDaConta')
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta'])
    expect(c.log).toHaveBeenCalledWith('Não consegui ler a assinatura:', 'banco fora')
  })

  it('CA-395: prévia sem cobrança ainda: { cobrada: false, expiraEm: null }, lida na operadora naquela hora', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, SEM_COBRANCA_AINDA)] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: { cobrada: false, expiraEm: null } })
    expect(c.pedidos).toEqual([{ metodo: 'GET', caminho: '/preapproval/pre-1', corpo: undefined }])
    expect(c.ordem).not.toContain('mudar')
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
  })

  it('CA-396: prévia com cobrança: até quando vale', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, COBRADA)] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: { cobrada: true, expiraEm: VALE_ATE } })
    expect(c.ordem).toEqual(['lerDaConta', GET])
  })

  it('a prévia com a operadora já dizendo cancelada usa a data gravada aqui, como o cancelamento', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, { status: 'cancelled', summarized: { charged_quantity: 1 }, next_payment_date: '2026-12-06T15:00:00.000Z' })] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: { cobrada: true, expiraEm: VALE_ATE } })
  })

  it.each<[string, Linha, Readonly<Record<string, unknown>>]>([
    ['sem cobrança ainda', ATIVA, SEM_COBRANCA_AINDA],
    ['com cobrança', ATIVA, COBRADA],
    ['já cancelada lá', ATIVA, { status: 'cancelled', summarized: { charged_quantity: 1 }, next_payment_date: '2026-12-06T15:00:00.000Z' }],
    ['já cancelada aqui, com período (CB-93)', CANCELADA_COM_PERIODO, COBRADA],
    ['encerrada por recusa (D-80), sem período', ENCERRADA_POR_RECUSA, COBRADA],
  ])('D-81 e R11: a prévia diz o mesmo fim que o cancelamento devolve e grava (%s)', async (_caso, linha, daOperadora) => {
    const previa = cenario([linha], { [GET]: [responde(200, daOperadora)] })
    const disse = await gerenciarAssinatura(PREVIA, previa.deps)
    expect(disse.status).toBe(200)
    const cancelou = cenario([linha], { [GET]: [responde(200, daOperadora)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(CANCELAR, cancelou.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: disse.corpo['expiraEm'] } })
    expect(cancelou.assinaturas.get('u1')?.expira_em).toBe(disse.corpo['expiraEm'])
  })

  it.each<[string, Linha, Desfecho]>([
    ['com período (CB-93)', CANCELADA_COM_PERIODO, { cobrada: true, expiraEm: VALE_ATE }],
    ['encerrada por recusa depois de uma paga (D-80)', ENCERRADA_POR_RECUSA, { cobrada: true, expiraEm: null }],
    ['sem período e sem mensalidade paga', { ...ATIVA, status: 'cancelada' }, { cobrada: false, expiraEm: null }],
  ])('R11: a prévia de uma já cancelada aqui repete o cancelamento, sem perguntar à operadora (%s)', async (_caso, linha, esperado) => {
    const c = cenario([linha], { [GET]: [responde(200, COBRADA)] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: esperado })
    expect(c.pedidos).toEqual([])
  })

  it('R11: a prévia de uma já cancelada sem o campo da última paga não conta como cobrada', async () => {
    const c = cenario([ATIVA])
    c.assinaturas.set('u1', semUltimaPaga({ ...ATIVA, status: 'cancelada' }))
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: { cobrada: false, expiraEm: null } })
  })

  it.each([PREVIA, CANCELAR])('a leitura 2xx com corpo que não se lê não vale: 502, nada pedido nem gravado (%#)', async (pedido) => {
    const c = cenario([ATIVA], { [GET]: [responde(200, null)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta', GET])
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
  })

  it.each([null, responde(500), responde(401)])('CA-397: prévia sem resposta da operadora (ou 5xx, ou 401): 502, nada muda (%#)', async (resposta) => {
    const c = cenario([ATIVA], { [GET]: [resposta] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta', GET])
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
  })

  it.each(['pendente', 'pausada'])('prévia de %s: Free na hora, sem perguntar à operadora', async (status) => {
    const c = cenario([{ ...ATIVA, status }], { [GET]: [responde(200, COBRADA)] })
    expect(await gerenciarAssinatura(PREVIA, c.deps)).toEqual({ status: 200, corpo: { cobrada: false, expiraEm: null } })
    expect(c.pedidos).toEqual([])
  })

  it('CA-395: cancelar sem cobrança ainda: cancela lá e grava cancelada sem período, encerrada pela pessoa', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, SEM_COBRANCA_AINDA)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: null } })
    expect(c.pedidos).toContainEqual({ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { status: 'cancelled' } })
    expect(c.assinaturas.get('u1')).toMatchObject({
      status: 'cancelada',
      expira_em: null,
      encerrada_por: 'pessoa',
      encerrada_em: AGORA.toISOString(),
      atualizado_em: AGORA.toISOString(),
    })
  })

  it('CA-396 e CA-378: cancelar com cobrança: vale até a véspera da próxima', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: VALE_ATE } })
    expect(c.ordem).toEqual(['lerDaConta', GET, PUT, 'mudar'])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: VALE_ATE, encerrada_por: 'pessoa', encerrada_em: AGORA.toISOString() })
  })

  it('pendente ou pausada canceladas voltam ao Free na hora, mesmo com cobrança lá (sem período a respeitar, como no CB-94)', async () => {
    for (const status of ['pendente', 'pausada']) {
      const c = cenario([{ ...ATIVA, status }], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
      expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: null } })
      expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: null, encerrada_por: 'pessoa' })
    }
  })

  it('CB-93: já cancelada aqui não chama a operadora e devolve o fim gravado', async () => {
    const c = cenario([{ ...ATIVA, status: 'cancelada', expira_em: VALE_ATE }], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: VALE_ATE } })
    expect(c.pedidos).toEqual([])
    expect(c.ordem).toEqual(['lerDaConta'])
  })

  it.each([null, responde(500), responde(401)])('sem leitura da operadora não há cancelamento: 502 e nada gravado (%#)', async (leitura) => {
    const c = cenario([ATIVA], { [GET]: [leitura], [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta', GET])
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
  })

  it('CB-93: o PUT sem resposta, mas a leitura diz cancelada: grava', async () => {
    const c = cenario([ATIVA], { [PUT]: [null], [GET]: [responde(200, COBRADA), responde(200, { status: 'cancelled' })] })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: VALE_ATE } })
    expect(c.ordem).toEqual(['lerDaConta', GET, PUT, GET, 'mudar'])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: VALE_ATE, encerrada_por: 'pessoa' })
  })

  it.each<[string, Rotas, number | string]>([
    [
      'PUT recusado e a leitura diz autorizada',
      { [PUT]: [responde(400, { message: 'cc_rejected_other_reason', detalhe: 'corpo-da-operadora' }), responde(422, { message: 'corpo-da-operadora' })], [GET]: [responde(200, COBRADA)] },
      422,
    ],
    ['PUT sem resposta e a leitura diz autorizada', { [PUT]: [null], [GET]: [responde(200, COBRADA)] }, 'sem resposta'],
    ['PUT com erro do lado dela e a conferência sem resposta', { [PUT]: [responde(503, { message: 'corpo-da-operadora' })], [GET]: [responde(200, COBRADA), null] }, 503],
  ])('a operadora não cancela (%s): 502, nada gravado; o registro leva o último status do pedido, sem o corpo', async (_caso, rotas, status) => {
    const c = cenario([ATIVA], rotas)
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual(FALHOU)
    expect(c.ordem).not.toContain('mudar')
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
    expect(c.log).toHaveBeenCalledWith('A operadora não cancelou:', status, 'pre-1')
    const registros = JSON.stringify(c.log.mock.calls)
    expect(registros).not.toContain('corpo-da-operadora')
    expect(registros).not.toContain('cc_rejected')
  })

  it('a operadora já dizia cancelada: não pede de novo; o fim sai da data gravada aqui', async () => {
    const c = cenario([ATIVA], {
      [GET]: [responde(200, { status: 'cancelled', summarized: { charged_quantity: 1 }, next_payment_date: '2026-12-06T15:00:00.000Z' })],
      [PUT]: [responde(200)],
    })
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: VALE_ATE } })
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['GET'])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: VALE_ATE, encerrada_por: 'pessoa' })
  })

  it('CB-93: a gravação que falha é tentada de novo; falhando duas vezes, 502 com a frase própria', async () => {
    const umaVez = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    umaVez.falhar('mudar', 1)
    expect(await gerenciarAssinatura(CANCELAR, umaVez.deps)).toEqual({ status: 200, corpo: { status: 'cancelada', expiraEm: VALE_ATE } })
    expect(umaVez.ordem.filter((o) => o === 'mudar')).toHaveLength(2)
    expect(umaVez.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: VALE_ATE })

    const sempre = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    sempre.falhar('mudar')
    expect(await gerenciarAssinatura(CANCELAR, sempre.deps)).toEqual({ status: 502, corpo: { erro: GRAVADA_LA_SO } })
    expect(sempre.ordem.filter((o) => o === 'mudar')).toHaveLength(2)
    expect(sempre.log).toHaveBeenCalledWith('Cancelada na operadora, mas não gravada aqui:', 'pre-1', 'banco fora')
  })

  it('cancelada lá sem nenhuma linha mudada aqui (outra assinatura entrou no lugar): 502 com a frase própria e o registro anota, sem tentar de novo', async () => {
    const c = cenario([ATIVA], { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] })
    const mudar = vi.fn(async () => ({ linhas: 0, falha: null }))
    expect(await gerenciarAssinatura(CANCELAR, { ...c.deps, banco: { ...c.banco, mudar } })).toEqual({ status: 502, corpo: { erro: GRAVADA_LA_SO } })
    expect(mudar).toHaveBeenCalledTimes(1)
    expect(c.log).toHaveBeenCalledWith('Cancelada na operadora, mas nenhuma linha mudou aqui:', 'pre-1')
  })

  it('CA-379: trocar cartão manda o código novo lá antes de gravar a bandeira e o final aqui', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
    expect(c.pedidos).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { card_token_id: TOKEN } }])
    expect(c.ordem.indexOf(PUT)).toBeLessThan(c.ordem.indexOf('mudar'))
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', cartao_bandeira: 'Visa', cartao_final: '5682', atualizado_em: AGORA.toISOString() })
  })

  it('CA-379: a gravação do cartão que falha é tentada de novo uma vez', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('mudar', 1)
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
    expect(c.ordem.filter((o) => o === 'mudar')).toHaveLength(2)
    expect(c.assinaturas.get('u1')).toMatchObject({ cartao_bandeira: 'Visa', cartao_final: '5682' })
    expect(c.log).not.toHaveBeenCalled()
  })

  it('CA-379: o cartão trocado lá e não gravado aqui (duas vezes) ainda responde 200; só o registro anota', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('mudar')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
    expect(c.ordem.filter((o) => o === 'mudar')).toHaveLength(2)
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
    expect(c.log).toHaveBeenCalledWith('Cartão trocado na operadora, mas não gravado aqui:', 'pre-1', 'banco fora')
  })

  it('CA-379: o cartão trocado lá sem nenhuma linha mudada aqui responde 200 e o registro anota, sem tentar de novo', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    const mudar = vi.fn(async () => ({ linhas: 0, falha: null }))
    expect(await gerenciarAssinatura(TROCAR, { ...c.deps, banco: { ...c.banco, mudar } })).toEqual(TROCOU)
    expect(mudar).toHaveBeenCalledTimes(1)
    expect(c.log).toHaveBeenCalledWith('Cartão trocado na operadora, mas nenhuma linha mudou aqui:', 'pre-1')
  })

  it('CA-379: recusa do cartão novo vira 402 com o código; o antigo fica', async () => {
    const c = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'cc_rejected_bad_filled_security_code' } })
    expect(c.ordem).not.toContain('mudar')
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
  })

  it.each<[string, RespostaDaOperadora | null]>([
    ['401', responde(401, { message: 'cc_rejected_other_reason' })],
    ['403', responde(403, { message: 'cc_rejected_other_reason' })],
    ['429 (R8)', responde(429, { message: 'cc_rejected_other_reason' })],
    ['500', responde(500, { message: 'cc_rejected_other_reason' })],
    ['503', responde(503)],
    ['sem resposta', null],
  ])('CA-379: 401/403, 429, 5xx ou sem resposta é falha nossa: 502, nunca 402 (%s)', async (_caso, resposta) => {
    const c = cenario([ATIVA], { [PUT]: [resposta] })
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(FALHOU)
    expect(c.ordem).not.toContain('mudar')
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
  })

  it('trocar cartão só da ativa (409) e com o cartão completo (400); nada é contado nem pedido', async () => {
    for (const status of ['pendente', 'pausada', 'cancelada']) {
      const c = cenario([{ ...ATIVA, status }], { [PUT]: [responde(200)] })
      expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual({ status: 409, corpo: { erro: 'Só dá para trocar o cartão de uma assinatura ativa.' } })
      expect(c.ordem).toEqual(['lerDaConta'])
    }
    const incompletos = [
      trocarCom({ card_token_id: undefined }),
      trocarCom({ card_token_id: 'curto' }),
      trocarCom({ cartao: undefined }),
      trocarCom({ cartao: { bandeira: 'Visa', final: '12' } }),
    ]
    for (const pedido of incompletos) {
      const c = cenario([ATIVA], { [PUT]: [responde(200)] })
      expect(await gerenciarAssinatura(pedido, c.deps)).toEqual({ status: 400, corpo: { erro: 'Faltam os dados do cartão. Confira e tente de novo.' } })
      expect(c.ordem).toEqual(['lerDaConta'])
    }
  })

  it('nenhum registro leva o código do cartão nem o e-mail', async () => {
    // Um cenário por caso; os registros somados.
    const recusa = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    const segundaRecusa = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    segundaRecusa.semearTentativas('u1', recusas(1, 2))
    const semResposta = cenario([ATIVA], { [PUT]: [null] })
    const naoGravou = cenario([ATIVA], { [PUT]: [responde(200)] })
    naoGravou.falhar('mudar')
    const portaoFechado = cenario([ATIVA], { [PUT]: [responde(200)] })
    portaoFechado.semearTentativas('u1', recusas(5, 1))
    const naoContou = cenario([ATIVA], { [PUT]: [responde(200)] })
    naoContou.falhar('contarRecusas')
    const casos = [recusa, segundaRecusa, semResposta, naoGravou, portaoFechado, naoContou]
    for (const c of casos) await gerenciarAssinatura(TROCAR, c.deps)
    expect(casos.every((c) => c.log.mock.calls.length > 0)).toBe(true)
    const registros = JSON.stringify(casos.flatMap((c) => c.log.mock.calls))
    expect(registros).not.toContain(TOKEN)
    expect(registros).not.toContain('ana@exemplo.com')
  })
})

describe('trocar cartão: o limite de tentativas com cartão recusado (D-101)', () => {
  it('CA-433: com 5 recusas da conta em 24 h (um sucesso no meio não zera), responde 429 sem chamar a operadora', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.semearTentativas('u1', [...recusas(3, 23), { quando: antes(10), recusada: false }, ...recusas(2, 1)])
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', 'soltarReserva'])
    expect(c.pedidos).toEqual([])
    expect(c.tentativas).toHaveLength(6)
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
  })

  it('CA-433: 4 recusas em 24 h (a quinta tem mais de 24 h) ainda passam', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.semearTentativas('u1', [...recusas(1, 25), ...recusas(4, 2)])
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
  })

  it('CA-434: com 30 recusas na última hora somando todas as contas, a troca leva o 429', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    for (let i = 0; i < 10; i++) c.semearTentativas(`outra-${i}`, recusas(3, 0.5))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
  })

  it('CA-434: 29 recusas na última hora (a trigésima tem mais de 1 h) ainda passam', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    for (let i = 0; i < 29; i++) c.semearTentativas(`outra-${i}`, recusas(1, 0.5))
    c.semearTentativas('outra-29', recusas(1, 1.5))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
  })

  it('R5: sem conseguir contar as tentativas, responde 502 com "Nada mudou" sem chamar a operadora', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('contarRecusas')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', 'soltarReserva'])
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as tentativas de cartão:', 'banco fora')
  })

  it.each<[keyof RecusasContadas, number]>([
    ['daConta24h', Number.NaN],
    ['seguidasDaConta', Number.NaN],
    ['doSite1h', Number.POSITIVE_INFINITY],
  ])('R5: contagem fora do formato (%s = %s) também fecha: 502 sem chamar a operadora', async (campo, valor) => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    const contarRecusas = async (): Promise<RecusasContadas> => ({ daConta24h: 0, seguidasDaConta: 0, doSite1h: 0, [campo]: valor })
    expect(await gerenciarAssinatura(TROCAR, { ...c.deps, banco: { ...c.banco, contarRecusas } })).toEqual(FALHOU)
    expect(c.pedidos).toEqual([])
  })

  it('R5: o portão vem depois de validar o cartão: assinatura que não é ativa (409) e cartão incompleto (400) nem contam', async () => {
    const pendente = cenario([{ ...ATIVA, status: 'pendente' }], { [PUT]: [responde(200)] })
    pendente.semearTentativas('u1', recusas(5, 1))
    expect((await gerenciarAssinatura(TROCAR, pendente.deps)).status).toBe(409)
    const incompleto = cenario([ATIVA], { [PUT]: [responde(200)] })
    incompleto.semearTentativas('u1', recusas(5, 1))
    expect((await gerenciarAssinatura(trocarCom({ cartao: undefined }), incompleto.deps)).status).toBe(400)
    expect([...pendente.ordem, ...incompleto.ordem]).not.toContain('contarRecusas')
  })

  it.each<[string, PedidoDeGerenciar, Rotas]>([
    ['prévia', PREVIA, { [GET]: [responde(200, COBRADA)] }],
    ['cancelar', CANCELAR, { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] }],
  ])('R5: só a troca de cartão passa pelo portão; %s com o portão fechado (e a contagem fora) segue e nada anota', async (_caso, pedido, rotas) => {
    const c = cenario([ATIVA], rotas)
    c.semearTentativas('u1', recusas(5, 1))
    c.falhar('contarRecusas')
    expect((await gerenciarAssinatura(pedido, c.deps)).status).toBe(200)
    expect(c.ordem).not.toContain('contarRecusas')
    expect(c.ordem).not.toContain('anotarTentativa')
    expect(c.tentativas).toHaveLength(5)
  })

  it.each<[string, RespostaDaOperadora | null, number, readonly boolean[]]>([
    ['recusa do banco (cc_rejected_*)', RECUSA_DO_BANCO, 402, [true]],
    ['recusa sem motivo conhecido (recusado)', responde(400, { message: 'Card declined' }), 402, [true]],
    ['trocou', responde(200), 200, [false]],
    ['sem resposta', null, 502, []],
    ['5xx', responde(503), 502, []],
    ['401 (a nossa credencial)', responde(401), 502, []],
    ['403', responde(403), 502, []],
    ['429 da operadora', responde(429), 502, []],
    ['código do cartão vencido (token-invalido)', responde(400, { message: 'Invalid card_token_id' }), 402, []],
    ['outra falha (falha)', responde(400, { message: 'Invalid users involved' }), 402, []],
  ])('R4: %s responde %i e anota %j', async (_caso, resposta, status, anotadas) => {
    const c = cenario([ATIVA], { [PUT]: [resposta] })
    expect((await gerenciarAssinatura(TROCAR, c.deps)).status).toBe(status)
    expect(c.tentativas.map((t) => ({ conta: t.conta, recusada: t.recusada }))).toEqual(anotadas.map((recusada) => ({ conta: 'u1', recusada })))
    expect(c.ordem.includes('apagarTentativasAntesDe')).toBe(anotadas.length > 0)
  })

  it('R4: o sucesso é anotado depois de gravar o cartão; a recusa, sem gravar nada', async () => {
    const trocou = cenario([ATIVA], { [PUT]: [responde(200)] })
    await gerenciarAssinatura(TROCAR, trocou.deps)
    expect(trocou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', PUT, 'mudar', 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
    const recusou = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    await gerenciarAssinatura(TROCAR, recusou.deps)
    expect(recusou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', PUT, 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
  })

  it('R4: trocado lá e não gravado aqui (200) também zera as seguidas', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('mudar')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
    expect(c.tentativas.map((t) => t.recusada)).toEqual([false])
  })

  it('R7: depois de anotar, apaga as tentativas de mais de 7 dias', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(400, { message: 'cc_rejected_other_reason' })] })
    c.semearTentativas('u1', [...recusas(1, 24 * 8), { quando: antes(24 * 6), recusada: false }])
    const apagar = vi.spyOn(c.banco, 'apagarTentativasAntesDe')
    await gerenciarAssinatura(TROCAR, c.deps)
    expect(apagar).toHaveBeenCalledWith(new Date(AGORA.getTime() - 7 * UM_DIA_MS))
    expect(c.tentativas.map((t) => [t.quando.toISOString(), t.recusada])).toEqual([
      [antes(24 * 6).toISOString(), false],
      [AGORA.toISOString(), true],
    ])
  })

  it.each<[string, RespostaDaOperadora, number]>([
    ['sucesso', responde(200), 200],
    ['recusa', responde(400, { message: 'cc_rejected_other_reason' }), 402],
  ])('R4: anotar que falha não muda a resposta (%s); só vai para o registro', async (_caso, resposta, status) => {
    const c = cenario([ATIVA], { [PUT]: [resposta] })
    const deps = { ...c.deps, banco: { ...c.banco, anotarTentativa: () => Promise.reject(new Error('tentativas fora')) } }
    expect((await gerenciarAssinatura(TROCAR, deps)).status).toBe(status)
    expect(c.log).toHaveBeenCalledWith('Não consegui anotar a tentativa de cartão:', 'tentativas fora')
  })

  it('CA-435: a segunda recusa seguida usa a mensagem genérica, sem o código do banco', async () => {
    const c = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    c.semearTentativas('u1', recusas(1, 2))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'recusado' } })
    expect(c.tentativas.filter((t) => t.recusada)).toHaveLength(2)
  })

  it.each<[string, readonly { readonly quando: Date; readonly recusada: boolean }[]]>([
    ['a primeira recusa', []],
    ['um sucesso depois da recusa anterior', [...recusas(1, 3), { quando: antes(2), recusada: false }]],
    ['a recusa anterior tem mais de 24 h', recusas(1, 25)],
  ])('CA-435: %s ainda mostra o código do banco', async (_caso, passadas) => {
    const c = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    c.semearTentativas('u1', passadas)
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'cc_rejected_bad_filled_security_code' } })
  })

  it('CA-435: o que não é recusa do cartão (token-invalido) mantém o código, mesmo depois de uma recusa', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(400, { message: 'Invalid card_token_id' })] })
    c.semearTentativas('u1', recusas(1, 2))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'token-invalido' } })
  })
})

describe('trocar cartão: um pedido por vez por conta (CB-109, D-101)', () => {
  const EM_ANDAMENTO_409 = { status: 409, corpo: { erro: EM_ANDAMENTO } }
  /** A operadora do cenário, anotando o que a reserva da conta guardava em cada pedido. */
  const espiarReserva = (c: Cenario) => {
    const reservaNoPedido: unknown[] = []
    const operadora: Operadora = (metodo, caminho, corpo) => {
      reservaNoPedido.push(c.reservas.get('u1') ?? null)
      return c.operadora(metodo, caminho, corpo)
    }
    return { operadora, reservaNoPedido }
  }
  const RESERVADA = expect.objectContaining({ desde: AGORA.toISOString() })

  it('CB-109 e D-101: duas trocas ao mesmo tempo: um só PUT chega à operadora; a outra leva o 409 da assinar', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    const respostas = await Promise.all([gerenciarAssinatura(TROCAR, c.deps), gerenciarAssinatura(TROCAR, c.deps)])
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
    expect(respostas).toContainEqual(TROCOU)
    expect(respostas).toContainEqual(EM_ANDAMENTO_409)
    expect(c.reservas.size).toBe(0)
  })

  it('CB-109 e D-101: duas trocas ao mesmo tempo com cartão recusado: uma só recusa chega à operadora e é anotada', async () => {
    const c = cenario([ATIVA], { [PUT]: [RECUSA_DO_BANCO] })
    const respostas = await Promise.all([gerenciarAssinatura(TROCAR, c.deps), gerenciarAssinatura(TROCAR, c.deps)])
    expect(c.pedidos).toHaveLength(1)
    expect(respostas.map((r) => r.status).sort()).toEqual([402, 409])
    expect(c.tentativas.filter((t) => t.recusada)).toHaveLength(1)
    expect(c.reservas.size).toBe(0)
  })

  it.each<[string, RespostaDaOperadora | null, number]>([
    ['sucesso', responde(200), 200],
    ['recusa', RECUSA_DO_BANCO, 402],
    ['falha de rede', null, 502],
    ['erro do lado dela', responde(503), 502],
  ])('CB-109 e D-101: a conta fica reservada durante o pedido à operadora e livre depois (%s)', async (_caso, resposta, status) => {
    const c = cenario([ATIVA], { [PUT]: [resposta] })
    const { operadora, reservaNoPedido } = espiarReserva(c)
    expect((await gerenciarAssinatura(TROCAR, { ...c.deps, operadora })).status).toBe(status)
    expect(reservaNoPedido).toEqual([RESERVADA])
    expect(c.reservas.size).toBe(0)
    expect(c.ordem.slice(0, 4)).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas'])
    expect(c.ordem.at(-1)).toBe('soltarReserva')
  })

  it('CB-109 e D-101: a reserva é solta mesmo quando o pedido à operadora lança', async () => {
    const c = cenario([ATIVA])
    const reservaNoPedido: unknown[] = []
    const operadora: Operadora = () => {
      reservaNoPedido.push(c.reservas.get('u1') ?? null)
      return Promise.reject(new Error('quebrou'))
    }
    await expect(gerenciarAssinatura(TROCAR, { ...c.deps, operadora })).rejects.toThrow('quebrou')
    expect(reservaNoPedido).toEqual([RESERVADA])
    expect(c.reservas.size).toBe(0)
  })

  it('CB-109 e D-101: o portão fechado e a contagem que falha também soltam a reserva', async () => {
    const fechado = cenario([ATIVA], { [PUT]: [responde(200)] })
    fechado.semearTentativas('u1', recusas(5, 1))
    expect(await gerenciarAssinatura(TROCAR, fechado.deps)).toEqual(MUITAS)
    const semContagem = cenario([ATIVA], { [PUT]: [responde(200)] })
    semContagem.falhar('contarRecusas')
    expect(await gerenciarAssinatura(TROCAR, semContagem.deps)).toEqual(FALHOU)
    for (const c of [fechado, semContagem]) {
      expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', 'soltarReserva'])
      expect(c.reservas.size).toBe(0)
      expect(c.pedidos).toEqual([])
    }
  })

  it('CB-109: com outro pedido da conta em andamento, 409 sem contar nem chamar a operadora; a reserva do outro fica', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.comReserva('u1')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(EM_ANDAMENTO_409)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar'])
    expect(c.pedidos).toEqual([])
    expect(c.reservas.has('u1')).toBe(true)
  })

  it('CB-109: a reserva de uma função que morreu no meio (mais de 5 min) sai antes; a mais nova, não', async () => {
    const vencida = cenario([ATIVA], { [PUT]: [responde(200)] })
    vencida.comReserva('u1', new Date(AGORA.getTime() - 5 * 60_000 - 1).toISOString())
    expect(await gerenciarAssinatura(TROCAR, vencida.deps)).toEqual(TROCOU)
    expect(vencida.reservas.size).toBe(0)

    const recente = cenario([ATIVA], { [PUT]: [responde(200)] })
    recente.comReserva('u1', new Date(AGORA.getTime() - 5 * 60_000 + 1).toISOString())
    expect(await gerenciarAssinatura(TROCAR, recente.deps)).toEqual(EM_ANDAMENTO_409)
    expect(recente.pedidos).toEqual([])
  })

  it('CB-109: a reserva guarda o cartão novo da troca, como a da assinar guarda o do pedido', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    const { operadora, reservaNoPedido } = espiarReserva(c)
    await gerenciarAssinatura(TROCAR, { ...c.deps, operadora })
    expect(reservaNoPedido).toEqual([expect.objectContaining({ cartao_bandeira: 'Visa', cartao_final: '5682' })])
  })

  it('CB-109: reservar que falha (sem ser a reserva de outro pedido): 502 "Nada mudou", sem contar nem chamar a operadora', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('reservar')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar'])
    expect(c.log).toHaveBeenCalledWith('Não consegui reservar a troca de cartão:', 'banco fora')
  })

  it('CB-109: apagar a reserva vencida e soltar a reserva no fim, quando falham, só vão para o registro', async () => {
    const c = cenario([ATIVA], { [PUT]: [responde(200)] })
    c.falhar('soltarReservaVencida')
    c.falhar('soltarReserva')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(TROCOU)
    expect(c.log).toHaveBeenCalledWith('Não consegui apagar a reserva vencida:', 'banco fora')
    expect(c.log).toHaveBeenCalledWith('Não consegui soltar a reserva da troca de cartão (ela vence em 5 minutos):', 'banco fora')
  })

  it.each<[string, PedidoDeGerenciar, Rotas]>([
    ['prévia', PREVIA, { [GET]: [responde(200, COBRADA)] }],
    ['cancelar', CANCELAR, { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] }],
  ])('CB-109: %s não usa a reserva (segue mesmo com outro pedido em andamento)', async (_caso, pedido, rotas) => {
    const c = cenario([ATIVA], rotas)
    c.comReserva('u1')
    expect((await gerenciarAssinatura(pedido, c.deps)).status).toBe(200)
    for (const consulta of ['soltarReservaVencida', 'reservar', 'soltarReserva']) expect(c.ordem).not.toContain(consulta)
  })
})

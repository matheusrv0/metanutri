// @vitest-environment node
import { ANDAMENTO_NA_CONTA, assinar, EM_ANDAMENTO, JA_ASSINA, type PedidoDeAssinatura } from '../../supabase/functions/_shared/assinar.ts'
import { RECUSA_PADRAO, SEM_COBRANCA, UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import type { RecusasContadas, RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import { AGORA, CARTAO, cenario, responde } from './servidorFalsos.test-utils.ts'

const TOKEN = 'tok_teste_12345'
const CORPO = { plano: 'solo', ciclo: 'mensal', card_token_id: TOKEN, cartao: { bandeira: 'Mastercard', final: '6351' } }
const PEDIDO: PedidoDeAssinatura = { conta: { id: 'u1', email: 'ana@exemplo.com' }, corpo: CORPO, site: 'https://metanutri.com.br/' }
const POST = 'POST /preapproval'
const PUT = 'PUT /preapproval/pre-1'
const BUSCA = 'GET /preapproval/search?payer_email=ana%40exemplo.com&limit=50'
const CRIADA = { id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-06T15:00:00.000Z' }
/** Um resultado da busca: desta conta, Solo mensal, nascido 5 s depois do começo do pedido. */
const ACHADA = { ...CRIADA, external_reference: 'u1', date_created: '2026-10-06T15:00:05.000Z', auto_recurring: { transaction_amount: 34.9, frequency: 1 } }

const ASSINOU = { status: 200, corpo: { status: 'ativa', proximaCobranca: '2026-11-06T15:00:00.000Z', cartao: CARTAO } }
const FORA = { status: 502, corpo: { erro: SEM_COBRANCA } }
const MUITAS = { status: 429, corpo: { erro: 'Muitas tentativas com cartão recusado. Tente de novo amanhã.', codigo: 'muitas-tentativas' } }
const comCorpo = (mudanca: Readonly<Record<string, unknown>>): PedidoDeAssinatura => ({ ...PEDIDO, corpo: { ...CORPO, ...mudanca } })

const HORA_MS = 3_600_000
const antes = (horas: number) => new Date(AGORA.getTime() - horas * HORA_MS)
/** `n` recusas de cartão feitas `horas` atrás. */
const recusas = (n: number, horas: number) => Array.from({ length: n }, () => ({ quando: antes(horas), recusada: true }))

type Rotas = Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>>

describe('assinar: o núcleo da função (spec checkout-proprio e cobranca-em-producao)', () => {
  it('CA-405 e CA-375: assina com o preço da tabela, já autorizada, grava a linha e devolve só o status, a próxima cobrança e o cartão', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(comCorpo({ valor: 1, transaction_amount: 1 }), c.deps)).toEqual(ASSINOU)
    expect(c.pedidos[0]).toEqual({
      metodo: 'POST',
      caminho: '/preapproval',
      corpo: {
        reason: 'MetaNutri Solo (mensal)',
        external_reference: 'u1',
        payer_email: 'ana@exemplo.com',
        card_token_id: TOKEN,
        status: 'authorized',
        back_url: 'https://metanutri.com.br/',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 34.9, currency_id: 'BRL' },
      },
    })
    expect(c.assinaturas.get('u1')).toEqual({
      nutricionista_id: 'u1',
      plano: 'solo',
      status: 'ativa',
      preapproval_id: 'pre-1',
      valor_centavos: 3490,
      ciclo: 'mensal',
      expira_em: null,
      cartao_bandeira: 'Mastercard',
      cartao_final: '6351',
      proxima_cobranca: '2026-11-06T15:00:00.000Z',
      ultima_cobranca_paga: null,
      encerrada_por: null,
      encerrada_em: null,
      atualizado_em: AGORA.toISOString(),
    })
    expect(c.reservas.has('u1')).toBe(false)
  })

  it('Pro anual: 599 a cada 12 meses', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    expect((await assinar(comCorpo({ plano: 'pro', ciclo: 'anual' }), c.deps)).status).toBe(200)
    expect(c.pedidos[0]?.corpo).toMatchObject({
      reason: 'MetaNutri Pro (anual)',
      auto_recurring: { frequency: 12, frequency_type: 'months', transaction_amount: 599, currency_id: 'BRL' },
    })
    expect(c.assinaturas.get('u1')).toMatchObject({ plano: 'pro', ciclo: 'anual', valor_centavos: 59900 })
  })

  it('a data de hoje é a primeira cobrança: sem data depois de amanhã, a próxima é a prevista (6/11)', async () => {
    const c = cenario([], { [POST]: [responde(201, { ...CRIADA, next_payment_date: '2026-10-06T16:00:00.000Z' })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.assinaturas.get('u1')?.proxima_cobranca).toBe('2026-11-06T15:00:00.000Z')
  })

  it.each<[string, PedidoDeAssinatura, number, string]>([
    ['sem sessão', { ...PEDIDO, conta: null }, 401, 'Entre na sua conta antes de assinar.'],
    ['sem e-mail', { ...PEDIDO, conta: { id: 'u1', email: null } }, 401, 'Entre na sua conta antes de assinar.'],
    ['corpo que não era JSON', { ...PEDIDO, corpo: null }, 400, 'Corpo da requisição inválido.'],
    ['plano que sobe pelo protótipo', comCorpo({ plano: 'constructor' }), 400, 'Plano desconhecido.'],
    ['Clínica, que não se assina pelo site', comCorpo({ plano: 'clinica' }), 400, 'Plano desconhecido.'],
    ['sem o código do cartão', comCorpo({ card_token_id: undefined }), 400, 'Faltam os dados do cartão. Confira e tente de novo.'],
    ['final do cartão com 2 números', comCorpo({ cartao: { bandeira: 'Visa', final: '12' } }), 400, 'Faltam os dados do cartão. Confira e tente de novo.'],
  ])('401 sem sessão ou sem e-mail; 400 com corpo, plano ou cartão inválidos; nada é reservado nem pedido (%s)', async (_caso, pedido, status, mensagem) => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(pedido, c.deps)).toEqual({ status, corpo: { erro: mensagem } })
    expect(c.ordem).toEqual([])
  })

  it.each(['solo', 'pro', 'clinica'])('CB-91: conta com Solo, Pro ou Clínica ativa leva 409 sem chamar a operadora, e a reserva é solta (%s)', async (plano) => {
    const c = cenario([{ nutricionista_id: 'u1', plano, status: 'ativa', preapproval_id: 'pre-0' }], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 409, corpo: { erro: JA_ASSINA } })
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it.each(['pendente', 'pausada'])('pendente ou pausada do fluxo do cartão leva 409; a do fluxo antigo (sem cartão) assina (%s)', async (status) => {
    const linha = { nutricionista_id: 'u1', plano: 'solo', status, preapproval_id: 'pre-0' }
    const c = cenario([{ ...linha, cartao_final: '1111' }], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 409, corpo: { erro: ANDAMENTO_NA_CONTA } })
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    const antigo = cenario([{ ...linha, cartao_final: null }], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(PEDIDO, antigo.deps)).toEqual(ASSINOU)
  })

  it.each([
    ['cancelada no prazo', { nutricionista_id: 'u1', plano: 'pro', status: 'cancelada', preapproval_id: 'pre-0', proxima_cobranca: '2026-10-20T15:00:00.000Z' }],
    ['cancelada fora do prazo', { nutricionista_id: 'u1', plano: 'solo', status: 'cancelada', preapproval_id: 'pre-0', proxima_cobranca: '2026-09-20T15:00:00.000Z' }],
    ['Estudante ativo', { nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-03-01T02:59:59.000Z' }],
  ])('CA-380 e CB-95: cancelada (no prazo ou não) e Estudante ativo assinam; a linha nova não vence por data (%s)', async (_caso, linha) => {
    const c = cenario([linha], { [POST]: [responde(201, CRIADA)] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.assinaturas.get('u1')).toMatchObject({ plano: 'solo', status: 'ativa', preapproval_id: 'pre-1', expira_em: null })
  })

  it('C1: outra aba já reservou: 409 sem ler a assinatura nem chamar a operadora', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.comReserva('u1')
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 409, corpo: { erro: EM_ANDAMENTO } })
    expect(c.ordem).toEqual(['contarRecusas', 'soltarReservaVencida', 'reservar'])
    // A reserva é da outra aba: fica.
    expect(c.reservas.has('u1')).toBe(true)
  })

  it('C1: a reserva vencida sai antes de reservar; a ordem é soltar a vencida, reservar, ler, anotar a chamada (D-108), pedir, gravar e soltar', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.comReserva('u1', '2026-10-06T14:54:00.000Z')
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.ordem).toEqual([
      'contarRecusas',
      'soltarReservaVencida',
      'reservar',
      'lerDaConta',
      'anotarChamada',
      'apagarChamadasAntesDe',
      'POST /preapproval',
      'gravar',
      'anotarTentativa',
      'apagarTentativasAntesDe',
      'soltarReserva',
    ])
  })

  it('outra falha ao reservar: 502 sem cobrar', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.falhar('reservar')
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.pedidos).toEqual([])
  })

  it('sem conseguir ler a assinatura atual: 502 sem chamar a operadora, e a reserva é solta', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.falhar('lerDaConta')
    expect((await assinar(PEDIDO, c.deps)).status).toBe(502)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it('CA-373 e CA-405: a recusa do banco vira 402 com o código; nada é gravado e a reserva é solta', async () => {
    const c = cenario([], { [POST]: [responde(400, { message: 'cc_rejected_insufficient_amount' })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'cc_rejected_insufficient_amount' } })
    expect(c.assinaturas.size).toBe(0)
    expect(c.pedidos.filter((p) => p.metodo === 'GET')).toEqual([])
    expect(c.reservas.size).toBe(0)
    // A reserva só sai depois de anotar a recusa.
    expect(c.ordem.slice(-3)).toEqual(['anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
  })

  it.each([401, 403, 429])('401, 403 ou 429 da operadora não é o cartão: 502, sem procurar nem gravar (%i)', async (status) => {
    const c = cenario([], { [POST]: [responde(status, { message: 'cc_rejected_other_reason' })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['POST'])
    expect(c.assinaturas.size).toBe(0)
    expect(c.reservas.size).toBe(0)
  })

  it('CA-402, CB-99 e CA-405: sem resposta ao pedir, procura pelo e-mail, confere a conta, o valor e a hora, e segue com a achada', async () => {
    const c = cenario([], {
      [POST]: [null],
      [BUSCA]: [
        responde(200, {
          results: [
            { ...ACHADA, id: 'pre-outra-conta', external_reference: 'u2' },
            { ...ACHADA, id: 'pre-antiga', date_created: '2026-10-06T14:50:00.000Z' },
            { ...ACHADA, id: 'pre-outro-valor', auto_recurring: { transaction_amount: 64.9, frequency: 1 } },
            ACHADA,
          ],
        }),
      ],
    })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'pre-1', status: 'ativa', cartao_final: '6351' })
    expect(c.reservas.has('u1')).toBe(false)
  })

  it.each([responde(502), responde(201, { status: 'authorized' })])('CA-402: erro do lado da operadora (5xx) ou sucesso sem id também procuram (%#)', async (resposta) => {
    const c = cenario([], { [POST]: [resposta], [BUSCA]: [responde(200, { results: [ACHADA] })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.ordem).toContain(BUSCA)
  })

  it('CA-402: não achando, responde servidor fora (CA-374); nada é gravado e a reserva fica para o aviso adotar com o cartão', async () => {
    const c = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [] })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.assinaturas.size).toBe(0)
    expect(c.reservas.get('u1')).toMatchObject({ cartao_bandeira: 'Mastercard', cartao_final: '6351' })
    expect(c.ordem.at(-1)).not.toBe('soltarReserva')
  })

  it.each([null, responde(200, { results: 'x' }), responde(500)])('CA-402: busca sem resposta ou fora do formato conta como "não achou" (%#)', async (busca) => {
    const c = cenario([], { [POST]: [null], [BUSCA]: [busca] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.assinaturas.size).toBe(0)
  })

  it('CA-402: achar só uma assinatura já cancelada conta como "não achou": 502, a reserva fica e nada é anotado', async () => {
    const c = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [{ ...ACHADA, status: 'cancelled' }] })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.assinaturas.size).toBe(0)
    expect(c.reservas.has('u1')).toBe(true)
    expect(c.tentativas).toEqual([])
  })

  it.each([
    ['de outra conta', { ...ACHADA, external_reference: 'u2' }],
    ['com outro valor', { ...ACHADA, auto_recurring: { transaction_amount: 64.9, frequency: 1 } }],
    ['com o mesmo valor em outra frequência', { ...ACHADA, auto_recurring: { transaction_amount: 34.9, frequency: 12 } }],
    ['nascida 1 ms antes da folga de 2 min', { ...ACHADA, date_created: '2026-10-06T14:57:59.999Z' }],
  ])('CB-99: sozinha, a assinatura %s não confere: 502', async (_caso, item) => {
    const c = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [item] })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.assinaturas.size).toBe(0)
  })

  it('D-85: a nascida exatamente 2 min antes do começo do pedido ainda confere', async () => {
    const c = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [{ ...ACHADA, date_created: '2026-10-06T14:58:00.000Z' }] })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
  })

  it('entre as que conferem, vale a mais nova que não está cancelada', async () => {
    const c = cenario([], {
      [POST]: [null],
      [BUSCA]: [
        responde(200, {
          results: [
            { ...ACHADA, id: 'pre-velha', date_created: '2026-10-06T15:00:01.000Z', status: 'cancelled' },
            ACHADA,
            { ...ACHADA, id: 'pre-nova-cancelada', date_created: '2026-10-06T15:00:09.000Z', status: 'cancelled' },
            { ...ACHADA, id: 'pre-anterior', date_created: '2026-10-06T15:00:02.000Z' },
          ],
        }),
      ],
    })
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.assinaturas.get('u1')?.preapproval_id).toBe('pre-1')
  })

  it('CA-403: sucesso com a assinatura cancelada é recusa: 402, nada gravado, a reserva solta', async () => {
    const c = cenario([], { [POST]: [responde(201, { ...CRIADA, status: 'cancelled' })] })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'recusado' } })
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
    expect(c.assinaturas.size).toBe(0)
    expect(c.reservas.size).toBe(0)
    expect(c.ordem.slice(-3)).toEqual(['anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
  })

  it('CA-403: sucesso com a assinatura pausada é recusa e ela é cancelada lá', async () => {
    const c = cenario([], { [POST]: [responde(201, { ...CRIADA, status: 'paused' })], [PUT]: [responde(200)] })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'recusado' } })
    expect(c.pedidos).toContainEqual({ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { status: 'cancelled' } })
    expect(c.assinaturas.size).toBe(0)
  })

  it('o banco ainda confirmando (pendente) é gravado como pendente', async () => {
    const c = cenario([], { [POST]: [responde(201, { ...CRIADA, status: 'pending' })] })
    const resposta = await assinar(PEDIDO, c.deps)
    expect(resposta.status).toBe(200)
    expect(resposta.corpo['status']).toBe('pendente')
    expect(c.assinaturas.get('u1')?.status).toBe('pendente')
  })

  it('gravação que falha cancela lá e responde 502; se cancelar também falha, o registro grita', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)], [PUT]: [responde(200)] })
    c.falhar('gravar')
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.pedidos).toContainEqual({ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { status: 'cancelled' } })
    expect(c.reservas.size).toBe(0)

    const s = cenario([], { [POST]: [responde(201, CRIADA)] })
    s.falhar('gravar')
    expect(await assinar(PEDIDO, s.deps)).toEqual(FORA)
    expect(s.log.mock.calls.some(([primeira]) => typeof primeira === 'string' && primeira.startsWith('CANCELAMENTO FALHOU'))).toBe(true)
  })

  it('D-81 (foco 2): assinar de novo depois de uma recusa zera a última paga, quem encerrou e quando', async () => {
    const c = cenario(
      [{ nutricionista_id: 'u1', plano: 'solo', status: 'cancelada', preapproval_id: 'pre-0', encerrada_por: 'recusa', ultima_cobranca_paga: '2026-09-06T15:00:00.000Z' }],
      { [POST]: [responde(201, CRIADA)] },
    )
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'pre-1', ultima_cobranca_paga: null, encerrada_por: null, encerrada_em: null })
  })

  it('CA-388: não existe preço de fundador', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    await assinar(PEDIDO, c.deps)
    expect(Object.keys(c.assinaturas.get('u1') ?? {})).not.toContain('preco_travado')
  })

  it('nenhum registro leva o código do cartão nem o e-mail', async () => {
    // Um cenário por caso (11, 13, 15 e 21, mais o portão fechado e a contagem que falha); os registros somados.
    const recusa = cenario([], { [POST]: [responde(400, { message: 'cc_rejected_insufficient_amount' })] })
    const achou = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [ACHADA] })] })
    const naoAchou = cenario([], { [POST]: [null], [BUSCA]: [responde(200, { results: [] })] })
    const naoGravou = cenario([], { [POST]: [responde(201, CRIADA)] })
    naoGravou.falhar('gravar')
    const portaoFechado = cenario()
    portaoFechado.semearTentativas('u1', recusas(5, 1))
    const naoContou = cenario()
    naoContou.falhar('contarRecusas')
    const casos = [recusa, achou, naoAchou, naoGravou, portaoFechado, naoContou]
    for (const c of casos) await assinar(PEDIDO, c.deps)
    expect(casos.every((c) => c.log.mock.calls.length > 0)).toBe(true)
    const registros = JSON.stringify(casos.flatMap((c) => c.log.mock.calls))
    expect(registros).not.toContain(TOKEN)
    expect(registros).not.toContain('ana@exemplo.com')
    expect(registros).not.toContain('ana%40exemplo.com')
  })
})

describe('assinar: o limite de tentativas com cartão recusado (D-101)', () => {
  it('CA-433: com 5 recusas da conta em 24 h (um sucesso no meio não zera), responde 429 sem reservar nem chamar a operadora', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.semearTentativas('u1', [...recusas(3, 23), { quando: antes(10), recusada: false }, ...recusas(2, 1)])
    expect(await assinar(PEDIDO, c.deps)).toEqual(MUITAS)
    expect(c.ordem).toEqual(['contarRecusas'])
    expect(c.pedidos).toEqual([])
    expect(c.tentativas).toHaveLength(6)
  })

  it('CA-433: 4 recusas em 24 h (a quinta tem mais de 24 h) ainda passam', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.semearTentativas('u1', [...recusas(1, 25), ...recusas(4, 2)])
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
  })

  it('CA-434: com 30 recusas na última hora somando todas as contas, qualquer conta leva o 429', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    for (let i = 0; i < 10; i++) c.semearTentativas(`outra-${i}`, recusas(3, 0.5))
    expect(await assinar(PEDIDO, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it('CA-434: 29 recusas na última hora (a trigésima tem mais de 1 h) ainda passam', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    for (let i = 0; i < 29; i++) c.semearTentativas(`outra-${i}`, recusas(1, 0.5))
    c.semearTentativas('outra-29', recusas(1, 1.5))
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
  })

  it('R5: sem conseguir contar as tentativas, responde 502 sem reservar nem chamar a operadora', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.falhar('contarRecusas')
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.ordem).toEqual(['contarRecusas'])
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as tentativas de cartão:', 'banco fora')
  })

  it.each<[keyof RecusasContadas, number]>([
    ['daConta24h', Number.NaN],
    ['seguidasDaConta', Number.NaN],
    ['doSite1h', Number.POSITIVE_INFINITY],
  ])('R5: contagem fora do formato (%s = %s) também fecha: 502 sem reservar nem chamar a operadora', async (campo, valor) => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    const contarRecusas = async (): Promise<RecusasContadas> => ({ daConta24h: 0, seguidasDaConta: 0, doSite1h: 0, [campo]: valor })
    expect(await assinar(PEDIDO, { ...c.deps, banco: { ...c.banco, contarRecusas } })).toEqual(FORA)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it.each<[string, Rotas, number, readonly boolean[]]>([
    ['recusa do banco (cc_rejected_*)', { [POST]: [responde(400, { message: 'cc_rejected_bad_filled_security_code' })] }, 402, [true]],
    ['recusa sem motivo conhecido (recusado)', { [POST]: [responde(400, { message: 'Card declined' })] }, 402, [true]],
    ['D-86: sucesso com a assinatura cancelada', { [POST]: [responde(201, { ...CRIADA, status: 'cancelled' })] }, 402, [true]],
    ['D-86: sucesso com a assinatura pausada', { [POST]: [responde(201, { ...CRIADA, status: 'paused' })], [PUT]: [responde(200)] }, 402, [true]],
    ['assinou', { [POST]: [responde(201, CRIADA)] }, 200, [false]],
    ['sem resposta, mas a busca achou', { [POST]: [null], [BUSCA]: [responde(200, { results: [ACHADA] })] }, 200, [false]],
    ['sem resposta e a busca não achou', { [POST]: [null], [BUSCA]: [responde(200, { results: [] })] }, 502, []],
    ['5xx e a busca não achou', { [POST]: [responde(503)], [BUSCA]: [responde(200, { results: [] })] }, 502, []],
    ['401 (a nossa credencial)', { [POST]: [responde(401)] }, 502, []],
    ['403', { [POST]: [responde(403)] }, 502, []],
    ['429 da operadora', { [POST]: [responde(429)] }, 502, []],
    ['código do cartão vencido (token-invalido)', { [POST]: [responde(400, { message: 'Invalid card_token_id' })] }, 402, []],
    ['outra falha (falha)', { [POST]: [responde(400, { message: 'Invalid users involved' })] }, 402, []],
  ])('R4: %s responde %i e anota %j', async (_caso, rotas, status, anotadas) => {
    const c = cenario([], rotas)
    expect((await assinar(PEDIDO, c.deps)).status).toBe(status)
    expect(c.tentativas.map((t) => ({ conta: t.conta, recusada: t.recusada }))).toEqual(anotadas.map((recusada) => ({ conta: 'u1', recusada })))
    expect(c.ordem.includes('apagarTentativasAntesDe')).toBe(anotadas.length > 0)
  })

  it('R4: assinatura criada e não gravada (502) não anota', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)], [PUT]: [responde(200)] })
    c.falhar('gravar')
    expect(await assinar(PEDIDO, c.deps)).toEqual(FORA)
    expect(c.tentativas).toEqual([])
  })

  it('R7: depois de anotar, apaga as tentativas de mais de 7 dias', async () => {
    const c = cenario([], { [POST]: [responde(400, { message: 'cc_rejected_other_reason' })] })
    c.semearTentativas('u1', [...recusas(1, 24 * 8), { quando: antes(24 * 6), recusada: false }])
    const apagar = vi.spyOn(c.banco, 'apagarTentativasAntesDe')
    await assinar(PEDIDO, c.deps)
    expect(apagar).toHaveBeenCalledWith(new Date(AGORA.getTime() - 7 * UM_DIA_MS))
    expect(c.tentativas.map((t) => [t.quando.toISOString(), t.recusada])).toEqual([
      [antes(24 * 6).toISOString(), false],
      [AGORA.toISOString(), true],
    ])
  })

  it.each<[string, Rotas, number]>([
    ['sucesso', { [POST]: [responde(201, CRIADA)] }, 200],
    ['recusa', { [POST]: [responde(400, { message: 'cc_rejected_other_reason' })] }, 402],
  ])('R4: anotar que falha não muda a resposta (%s); só vai para o registro', async (_caso, rotas, status) => {
    const c = cenario([], rotas)
    const deps = { ...c.deps, banco: { ...c.banco, anotarTentativa: () => Promise.reject(new Error('tentativas fora')) } }
    expect((await assinar(PEDIDO, deps)).status).toBe(status)
    expect(c.log).toHaveBeenCalledWith('Não consegui anotar a tentativa de cartão:', 'tentativas fora')
    expect(c.reservas.size).toBe(0)
  })

  it('CA-435: a segunda recusa seguida usa a mensagem genérica, sem o código do banco', async () => {
    const c = cenario([], { [POST]: [responde(400, { message: 'cc_rejected_bad_filled_security_code' })] })
    c.semearTentativas('u1', recusas(1, 2))
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'recusado' } })
    expect(c.tentativas.filter((t) => t.recusada)).toHaveLength(2)
  })

  it.each<[string, readonly { readonly quando: Date; readonly recusada: boolean }[]]>([
    ['a primeira recusa', []],
    ['um sucesso depois da recusa anterior', [...recusas(1, 3), { quando: antes(2), recusada: false }]],
    ['a recusa anterior tem mais de 24 h', recusas(1, 25)],
  ])('CA-435: %s ainda mostra o código do banco', async (_caso, passadas) => {
    const c = cenario([], { [POST]: [responde(400, { message: 'cc_rejected_bad_filled_security_code' })] })
    c.semearTentativas('u1', passadas)
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'cc_rejected_bad_filled_security_code' } })
  })

  it('CA-435: o que não é recusa do cartão (token-invalido) mantém o código, mesmo depois de uma recusa', async () => {
    const c = cenario([], { [POST]: [responde(400, { message: 'Invalid card_token_id' })] })
    c.semearTentativas('u1', recusas(1, 2))
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 402, corpo: { erro: RECUSA_PADRAO, codigo: 'token-invalido' } })
  })
})

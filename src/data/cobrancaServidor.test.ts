// @vitest-environment node
import {
  CABECALHOS,
  codigoDaRecusa,
  dataDepoisDe,
  fimDoPeriodoPago,
  lerCartao,
  previsaoDaProximaCobranca,
  responder,
  traduzirStatus,
  UM_DIA_MS,
} from '../../supabase/functions/_shared/cobranca.ts'
import assinar from '../../supabase/functions/assinar/index.ts?raw'
import gerenciar from '../../supabase/functions/gerenciar-assinatura/index.ts?raw'
import webhook from '../../supabase/functions/webhook-mercadopago/index.ts?raw'

describe('cobrança no servidor: o que as três funções fazem igual (spec checkout-proprio)', () => {
  it('traduz o estado da operadora, com "cancelled" e com "canceled"', () => {
    expect(traduzirStatus('authorized')).toBe('ativa')
    expect(traduzirStatus('paused')).toBe('pausada')
    expect(traduzirStatus('cancelled')).toBe('cancelada')
    expect(traduzirStatus('canceled')).toBe('cancelada')
    expect(traduzirStatus('pending')).toBe('pendente')
    expect(traduzirStatus(undefined)).toBe('pendente')
  })

  it('D-70: do cartão, aceita só a bandeira e os 4 últimos números', () => {
    expect(lerCartao({ bandeira: ' Mastercard ', final: '6351' })).toEqual({ bandeira: 'Mastercard', final: '6351' })
    expect(lerCartao({ bandeira: 'American Express', final: '6885' })).toEqual({ bandeira: 'American Express', final: '6885' })
    expect(lerCartao({ bandeira: 'Visa', final: '635' })).toBeNull()
    expect(lerCartao({ bandeira: 'Visa', final: '5480832801033311' })).toBeNull()
    expect(lerCartao({ bandeira: '<script>', final: '6351' })).toBeNull()
    expect(lerCartao({ bandeira: 'x'.repeat(41), final: '6351' })).toBeNull()
    expect(lerCartao(null)).toBeNull()
  })

  it('a data só vale se for data de verdade e passar do limite', () => {
    const agora = Date.parse('2026-10-02T15:00:00Z')
    expect(dataDepoisDe('2026-11-02T15:00:00Z', agora)).toBe('2026-11-02T15:00:00.000Z')
    expect(dataDepoisDe('2026-10-02T15:30:00Z', agora + UM_DIA_MS)).toBeNull()
    expect(dataDepoisDe('amanhã', agora)).toBeNull()
    expect(dataDepoisDe(null, agora)).toBeNull()
  })

  it('CA-366: a próxima cobrança prevista é o mesmo dia, um ciclo depois', () => {
    const agora = new Date('2026-10-02T15:00:00Z')
    expect(previsaoDaProximaCobranca(agora, 'mensal')).toBe('2026-11-02T15:00:00.000Z')
    expect(previsaoDaProximaCobranca(agora, 'anual')).toBe('2027-10-02T15:00:00.000Z')
  })

  it('dia que não existe no mês seguinte vira o último dia dele, e dezembro passa para janeiro', () => {
    expect(previsaoDaProximaCobranca(new Date('2027-01-31T15:00:00Z'), 'mensal')).toBe('2027-02-28T15:00:00.000Z')
    expect(previsaoDaProximaCobranca(new Date('2026-12-15T15:00:00Z'), 'mensal')).toBe('2027-01-15T15:00:00.000Z')
  })

  it('foco 1: o calendário é o de Brasília: 01h30 UTC de 1º/11 ainda é 31/10', () => {
    // 31/10 às 22h30 em Brasília → um mês depois é 30/11 (novembro não tem 31), 22h30 em Brasília.
    expect(previsaoDaProximaCobranca(new Date('2026-11-01T01:30:00Z'), 'mensal')).toBe('2026-12-01T01:30:00.000Z')
  })

  it('CA-378 e foco 1: o plano vale até 23h59min59s de Brasília da véspera da próxima cobrança', () => {
    expect(fimDoPeriodoPago('2026-11-02T15:00:00Z')).toBe('2026-11-02T02:59:59.000Z')
    // 01h de 2/11 em Brasília (04h UTC) ainda é 2/11: vale até o fim de 1/11.
    expect(fimDoPeriodoPago('2026-11-02T04:00:00Z')).toBe('2026-11-02T02:59:59.000Z')
    // 23h30 de 1/11 em Brasília (02h30 UTC de 2/11): a cobrança é de 1/11, vale até o fim de 31/10.
    expect(fimDoPeriodoPago('2026-11-02T02:30:00Z')).toBe('2026-11-01T02:59:59.000Z')
    expect(fimDoPeriodoPago('quebrada')).toBeNull()
  })

  it('CA-373, CB-90 e foco 3: lê o motivo da recusa sem confiar no formato', () => {
    expect(codigoDaRecusa({ message: 'cc_rejected_insufficient_amount', status: 400 })).toBe('cc_rejected_insufficient_amount')
    expect(codigoDaRecusa({ cause: [{ code: 'CC_REJECTED_CARD_DISABLED', description: 'x' }] })).toBe('cc_rejected_card_disabled')
    expect(codigoDaRecusa({ cause: { code: 'cc_rejected_high_risk' } })).toBe('cc_rejected_high_risk')
    expect(codigoDaRecusa({ status_detail: 'cc_rejected_call_for_authorize' })).toBe('cc_rejected_call_for_authorize')
    expect(codigoDaRecusa({ message: 'Card token service not found', status: 404 })).toBe('token-invalido')
    expect(codigoDaRecusa({ message: 'CC_VAL_433 Credit card validation has failed', cause: [{ code: 'CC_VAL_433' }] })).toBe('recusado')
    expect(codigoDaRecusa({ message: 'Both payer and collector must be real or test users' })).toBe('falha')
    expect(codigoDaRecusa(null)).toBe('falha')
    expect(codigoDaRecusa('texto solto')).toBe('falha')
  })

  it('credencial do servidor inválida não vira "confira o cartão": só o código do cartão é token-invalido', () => {
    expect(codigoDaRecusa({ message: 'invalid access token', status: 401 })).not.toBe('token-invalido')
    expect(codigoDaRecusa({ message: 'invalid_token', status: 401 })).not.toBe('token-invalido')
    expect(codigoDaRecusa({ message: 'Card token service not found' })).toBe('token-invalido')
    expect(codigoDaRecusa({ message: 'card_token_id is invalid' })).toBe('token-invalido')
  })

  it('responde JSON com o cabeçalho que o navegador exige do supabase-js', async () => {
    const resposta = responder({ erro: 'x' }, 402)
    expect(resposta.status).toBe(402)
    expect(await resposta.json()).toEqual({ erro: 'x' })
    expect(CABECALHOS['Access-Control-Allow-Headers']).toBe('authorization, x-client-info, apikey, content-type')
  })

  it('CA-425: o navegador só recebe permissão quando a chamada vem de https://metanutri.com.br', () => {
    expect(CABECALHOS['Access-Control-Allow-Origin']).toBe('https://metanutri.com.br')
    expect(responder({ ok: true }).headers.get('Access-Control-Allow-Origin')).toBe('https://metanutri.com.br')
    for (const codigo of [assinar, gerenciar]) {
      expect(codigo).toContain("if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })")
      expect(codigo).not.toContain("'*'")
    }
  })

  it('CA-425: o webhook é chamado de servidor para servidor e não abre CORS', () => {
    expect(webhook).not.toContain('Access-Control')
    expect(webhook).not.toContain('CABECALHOS')
  })
})

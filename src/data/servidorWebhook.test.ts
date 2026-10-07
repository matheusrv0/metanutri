// @vitest-environment node
import { createHmac } from 'node:crypto'
import { UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import type { LinhaDaAssinatura, RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import {
  assinaturaConfere,
  GUARDA_DOS_AVISOS_MS,
  manifestoDoAviso,
  tratarAviso,
  type AvisoRecebido,
  type DependenciasDoWebhook,
} from '../../supabase/functions/_shared/webhook.ts'
import { AGORA, cenario, responde, type Cenario } from './servidorFalsos.test-utils.ts'

const SEGREDO = 'segredo-de-teste'
/** Calculados fora do código: HMAC-SHA256 com `openssl dgst -sha256 -hmac segredo-de-teste`, conferidos com node:crypto. São a âncora do formato. */
const ASSINADO = {
  comRequestId: '9bcf3dd498d68aa367d468eb68c2d143ff72787ba6543ba57d5223d52005787b', // id:2c938084726fca48;request-id:req-1;ts:1700000000;
  semRequestId: '865d626e3444ecbc25dff7d92ea9127fa10e10d0d566d9dbe124fd2a3cd8d6aa', // id:2c938084726fca48;ts:1700000000;
  idEmMaiusculas: 'a7a290fa1c1b4f860516daa1b16e0920e8d0e7f13137ec6fc9fabfc61e22aa29', // id:2C938084726FCA48;request-id:req-1;ts:1700000000; (errado)
  idNumerico: '96388ec824e45fce87cfb793cd29f99d8be04e81bb9dc9abc1f65a334a975ef1', // id:123456789;request-id:req-2;ts:1700000300;
}
const TS = '1700000000'

/** R3: o x-signature que a operadora mandaria, assinado aqui com node:crypto (fora do código testado). */
function xSignature(id: string, requestId: string | null, ts = TS, segredo = SEGREDO): string {
  const manifesto = `id:${id.toLowerCase()};${requestId === null ? '' : `request-id:${requestId};`}ts:${ts};`
  return `ts=${ts},v1=${createHmac('sha256', segredo).update(manifesto).digest('hex')}`
}

/** Um aviso como a operadora manda: o id na URL e no corpo, assinado com o SEGREDO pelo id da URL e pelo x-request-id. */
function aviso(topico: string, id: string | null, extra: Partial<AvisoRecebido> = {}): AvisoRecebido {
  const idNaUrl = extra.idNaUrl === undefined ? id : extra.idNaUrl
  const xRequestId = extra.xRequestId === undefined ? 'req-1' : extra.xRequestId
  return {
    corpo: { type: topico, action: 'updated', data: { id } },
    idNaUrl: id,
    tipoNaUrl: topico,
    xSignature: idNaUrl === null ? null : xSignature(idNaUrl, xRequestId),
    xRequestId: 'req-1',
    ...extra,
  }
}

const deps = (c: Cenario, segredo: string | null = SEGREDO): DependenciasDoWebhook => ({ ...c.deps, segredo })
const ASSINATURA = 'subscription_preapproval'
const PRE = 'GET /preapproval/pre1'
const PUT = 'PUT /preapproval/pre1'
const AUTORIZADA = {
  id: 'pre1',
  status: 'authorized',
  external_reference: 'u1',
  payer_email: 'ana@exemplo.com',
  next_payment_date: '2026-11-06T15:00:00.000Z',
  auto_recurring: { transaction_amount: 34.9, frequency: 1, frequency_type: 'months' },
}
/** A linha da conta u1 com a assinatura pre1. */
const LINHA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre1' }
const NADA_MUDA = ['lerDaOperadora', 'lerDaConta', 'mudar', 'gravar']

type Rotas = Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>>
type LinhaParcial = Partial<LinhaDaAssinatura> & { readonly nutricionista_id: string }

/** O aviso da assinatura pre1, com a operadora dizendo `assinatura`. */
async function avisoDaAssinatura(linhas: readonly LinhaParcial[], assinatura: Readonly<Record<string, unknown>>, rotas: Rotas = {}) {
  const c = cenario(linhas, { [PRE]: [responde(200, assinatura)], ...rotas })
  const status = await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))
  return { c, status, resultado: c.avisos[0]?.resultado }
}

describe('a assinatura do aviso (CA-399)', () => {
  it('o manifesto leva o id em minúsculas; a parte que falta sai', () => {
    expect(manifestoDoAviso('2C938084726FCA48', 'req-1', '1700000000')).toBe('id:2c938084726fca48;request-id:req-1;ts:1700000000;')
    expect(manifestoDoAviso('2C938084726FCA48', null, '1700000000')).toBe('id:2c938084726fca48;ts:1700000000;')
  })

  it('confere o HMAC do manifesto, com e sem x-request-id, aceitando espaço depois da vírgula', async () => {
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2C938084726FCA48', SEGREDO)).toBe(true)
    expect(await assinaturaConfere(`ts=1700000000, v1=${ASSINADO.semRequestId}`, null, '2c938084726fca48', SEGREDO)).toBe(true)
    expect(await assinaturaConfere(`ts=1700000300,v1=${ASSINADO.idNumerico}`, 'req-2', '123456789', SEGREDO)).toBe(true)
  })

  it('o manifesto com o id em maiúsculas (o defeito de antes) não confere', async () => {
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.idEmMaiusculas}`, 'req-1', '2C938084726FCA48', SEGREDO)).toBe(false)
  })

  it('cabeçalho sem ts ou sem v1, outro segredo, outro ts ou hash cortado não confere', async () => {
    expect(await assinaturaConfere(null, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
    expect(await assinaturaConfere(`v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
    expect(await assinaturaConfere('ts=1700000000', 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', 'outro')).toBe(false)
    expect(await assinaturaConfere(`ts=1700000001,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId.slice(0, 60)}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
  })

  it('sem segredo, nunca confere', async () => {
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', '')).toBe(false)
  })

  it('R3: o auxiliar dos testes assina igual aos vetores fixos', () => {
    expect(xSignature('2C938084726FCA48', 'req-1')).toBe(`ts=1700000000,v1=${ASSINADO.comRequestId}`)
    expect(xSignature('2c938084726fca48', null)).toBe(`ts=1700000000,v1=${ASSINADO.semRequestId}`)
    expect(xSignature('123456789', 'req-2', '1700000300')).toBe(`ts=1700000300,v1=${ASSINADO.idNumerico}`)
  })
})

describe('tratarAviso: o que se faz com cada aviso (D-84, D-102)', () => {
  it('CA-436 e R1: sem o segredo configurado, nada é processado; anota "sem segredo" e responde 500 para o aviso voltar', async () => {
    for (const segredo of [null, '', '   ']) {
      const c = cenario([{ ...LINHA, status: 'pendente' }], { [PRE]: [responde(200, AUTORIZADA)] })
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c, segredo))).toBe(500)
      expect(c.pedidos).toEqual([])
      expect(c.ordem).toEqual(['anotarAviso', 'apagarAvisosAntesDe'])
      expect(c.assinaturas.get('u1')?.status).toBe('pendente')
      expect(c.avisos).toEqual([{ topico: ASSINATURA, recurso_id: 'pre1', assinatura_confere: null, resultado: 'sem segredo' }])
      expect(c.log).toHaveBeenCalled()
    }
  })

  it('CA-399: assinatura que não confere não muda nada e fica anotada como "assinatura não confere"', async () => {
    const ruins = [
      'ts=1,v1=00',
      null,
      xSignature('pre1', 'req-1', TS, 'outro-segredo'),
      xSignature('pre2', 'req-1'),
      xSignature('pre1', 'req-9'),
      xSignature('pre1', null),
    ]
    for (const ruim of ruins) {
      const c = cenario([{ ...LINHA, status: 'pendente' }], { [PRE]: [responde(200, AUTORIZADA)] })
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1', { xSignature: ruim }), deps(c))).toBe(200)
      expect(c.pedidos).toEqual([])
      expect(c.ordem).toEqual(['anotarAviso', 'apagarAvisosAntesDe'])
      for (const consulta of NADA_MUDA) expect(c.ordem).not.toContain(consulta)
      expect(c.assinaturas.get('u1')?.status).toBe('pendente')
      expect(c.avisos).toEqual([{ topico: ASSINATURA, recurso_id: 'pre1', assinatura_confere: false, resultado: 'assinatura não confere' }])
    }
  })

  it('CA-399: o id da URL é o que vale para a assinatura; sem ele, vale o do corpo', async () => {
    const maiusculas = cenario([], { 'GET /preapproval/2C938084726FCA48': [responde(404)] })
    const comUrl = aviso(ASSINATURA, '2C938084726FCA48', { xSignature: `ts=1700000000,v1=${ASSINADO.comRequestId}`, xRequestId: 'req-1' })
    expect(await tratarAviso(comUrl, deps(maiusculas))).toBe(200)
    expect(maiusculas.avisos[0]).toMatchObject({ recurso_id: '2C938084726FCA48', assinatura_confere: true })
    expect(maiusculas.ordem[0]).toBe('GET /preapproval/2C938084726FCA48')

    // O corpo diz outro id: vale o da URL, que é o assinado.
    const outroNoCorpo = cenario([], { [PRE]: [responde(404)] })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1', { corpo: { type: ASSINATURA, data: { id: 'pre2' } } }), deps(outroNoCorpo))).toBe(200)
    expect(outroNoCorpo.avisos[0]).toMatchObject({ recurso_id: 'pre1', assinatura_confere: true })
    expect(outroNoCorpo.pedidos.map((p) => p.caminho)).toEqual(['/preapproval/pre1'])

    const soCorpo = cenario()
    const doCorpo = aviso('subscription_authorized_payment', null, {
      corpo: { type: 'subscription_authorized_payment', data: { id: 123456789 } },
      xRequestId: 'req-2',
      xSignature: `ts=1700000300,v1=${ASSINADO.idNumerico}`,
    })
    expect(await tratarAviso(doCorpo, deps(soCorpo))).toBe(200)
    expect(soCorpo.avisos[0]).toMatchObject({ topico: 'subscription_authorized_payment', recurso_id: '123456789', assinatura_confere: true })
  })

  it('CA-399: sem x-request-id, o manifesto sai sem essa parte e confere', async () => {
    const c = cenario([], { [PRE]: [responde(404)] })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1', { xRequestId: null }), deps(c))).toBe(200)
    expect(c.avisos[0]?.assinatura_confere).toBe(true)
  })

  it('o corpo que não é JSON não impede: o tipo e o id vêm da URL', async () => {
    const c = cenario([], { [PRE]: [responde(404)] })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1', { corpo: null }), deps(c))).toBe(200)
    expect(c.avisos[0]).toEqual({
      topico: ASSINATURA,
      recurso_id: 'pre1',
      assinatura_confere: true,
      resultado: 'ignorado: assinatura não existe na operadora',
    })
  })

  it('CA-398: todo aviso fica anotado (hora, tipo, código do recurso, conferência, resultado) e os de mais de 90 dias saem', async () => {
    const c = cenario()
    expect(await tratarAviso(aviso('payment', '999'), deps(c))).toBe(200)
    expect(c.pedidos).toEqual([])
    expect(c.avisos).toEqual([{ topico: 'payment', recurso_id: '999', assinatura_confere: true, resultado: 'ignorado: pagamento' }])
    expect(GUARDA_DOS_AVISOS_MS).toBe(90 * UM_DIA_MS)
    expect(c.apagadosAntesDe).toEqual(['2026-07-08T15:00:00.000Z'])
    expect(c.ordem).toEqual(['anotarAviso', 'apagarAvisosAntesDe'])
  })

  it('tópico desconhecido ou vazio e aviso sem id: 200, anotados', async () => {
    const casos: readonly [AvisoRecebido, Readonly<Record<string, unknown>>][] = [
      [aviso('subscription_preapproval_plan', 'plano1'), { topico: 'subscription_preapproval_plan', resultado: 'ignorado: tópico subscription_preapproval_plan' }],
      [aviso('', 'pre1'), { topico: '', recurso_id: 'pre1', assinatura_confere: true, resultado: 'ignorado: tópico vazio' }],
      [aviso(ASSINATURA, null), { topico: ASSINATURA, recurso_id: null, assinatura_confere: null, resultado: 'ignorado: sem id' }],
      [aviso(ASSINATURA, null, { corpo: null }), { topico: ASSINATURA, recurso_id: null, assinatura_confere: null, resultado: 'ignorado: sem id' }],
      [aviso(ASSINATURA, '  '), { recurso_id: null, assinatura_confere: null, resultado: 'ignorado: sem id' }],
    ]
    for (const [recebido, anotado] of casos) {
      const c = cenario()
      expect(await tratarAviso(recebido, deps(c))).toBe(200)
      expect(c.pedidos).toEqual([])
      expect(c.avisos[0]).toMatchObject(anotado)
    }
  })

  it('CA-437: código de recurso fora do formato (letras e números, até 64): 200, "recurso inválido", sem chamar a operadora', async () => {
    const invalidos = ['pre-1', '../preapproval/x', 'pre1?x=1', 'pre1/../x', 'pré1', ' pre1', 'pre1 ', 'pre_1', 'a'.repeat(65)]
    for (const id of invalidos) {
      // Assinado de verdade com este id: a conferência do formato vem antes da assinatura e vale sozinha.
      const c = cenario([], { [`GET /preapproval/${encodeURIComponent(id)}`]: [responde(200, AUTORIZADA)] })
      expect(await tratarAviso(aviso(ASSINATURA, id), deps(c))).toBe(200)
      expect(c.pedidos).toEqual([])
      expect(c.avisos).toEqual([{ topico: ASSINATURA, recurso_id: id, assinatura_confere: null, resultado: 'recurso inválido' }])
    }
    for (const numero of [1.5, -5, 1e21]) {
      const c = cenario()
      expect(await tratarAviso(aviso(ASSINATURA, null, { corpo: { type: ASSINATURA, data: { id: numero } } }), deps(c))).toBe(200)
      expect(c.pedidos).toEqual([])
      expect(c.avisos[0]).toMatchObject({ recurso_id: String(numero), assinatura_confere: null, resultado: 'recurso inválido' })
    }
  })

  it('CA-437: 64 letras e números ainda é um código válido', async () => {
    const c = cenario()
    const id = 'A1'.repeat(32)
    expect(await tratarAviso(aviso('payment', id), deps(c))).toBe(200)
    expect(c.avisos[0]).toMatchObject({ recurso_id: id, assinatura_confere: true, resultado: 'ignorado: pagamento' })
  })

  it('R2: a ordem das conferências é sem segredo, sem id, recurso inválido, assinatura e tópico', async () => {
    const RUIM = { xSignature: 'ts=1,v1=00' }
    const casos: readonly [string, AvisoRecebido, string | null, number, string, boolean | null][] = [
      ['sem segredo vem antes de tudo', aviso(ASSINATURA, null, RUIM), null, 500, 'sem segredo', null],
      ['sem segredo vem antes do recurso inválido', aviso(ASSINATURA, 'pre-1', RUIM), null, 500, 'sem segredo', null],
      ['sem id vem antes da assinatura', aviso(ASSINATURA, null, RUIM), SEGREDO, 200, 'ignorado: sem id', null],
      ['recurso inválido vem antes da assinatura', aviso(ASSINATURA, 'pre-1', RUIM), SEGREDO, 200, 'recurso inválido', null],
      ['a assinatura vem antes do tópico', aviso('payment', 'pay1', RUIM), SEGREDO, 200, 'assinatura não confere', false],
      ['a assinatura vem antes do tópico desconhecido', aviso('outro', 'pay1', RUIM), SEGREDO, 200, 'assinatura não confere', false],
    ]
    for (const [nome, recebido, segredo, status, resultado, confere] of casos) {
      const c = cenario()
      expect(await tratarAviso(recebido, deps(c, segredo)), nome).toBe(status)
      expect(c.pedidos, nome).toEqual([])
      expect(c.avisos[0], nome).toMatchObject({ resultado, assinatura_confere: confere })
    }
  })

  it('o registro corta o texto no tamanho da tabela', async () => {
    const longo = cenario()
    await tratarAviso(aviso('t'.repeat(120), 'pay1'), deps(longo))
    expect(longo.avisos[0]?.topico).toHaveLength(80)

    const muitoLongo = cenario()
    await tratarAviso(aviso('t'.repeat(300), 'pay1'), deps(muitoLongo))
    expect(muitoLongo.avisos[0]?.resultado).toHaveLength(200)

    const idLongo = cenario()
    await tratarAviso(aviso('payment', 'a'.repeat(100)), deps(idLongo))
    expect(idLongo.avisos[0]?.recurso_id).toHaveLength(80)

    // O corte conta caracteres, como o char_length do Postgres: um emoji na divisa não é partido ao meio.
    const emoji = cenario()
    await tratarAviso(aviso(`${'a'.repeat(79)}\u{1F600}b`, 'pay1'), deps(emoji))
    expect(emoji.avisos[0]?.topico).toBe(`${'a'.repeat(79)}\u{1F600}`)
  })

  it('falha ao anotar ou ao apagar os velhos não muda a resposta', async () => {
    const c = cenario()
    c.falhar('anotarAviso')
    c.falhar('apagarAvisosAntesDe')
    expect(await tratarAviso(aviso('payment', 'pay1'), deps(c))).toBe(200)
    expect(c.log).toHaveBeenCalledTimes(2)

    const semSegredo = cenario()
    semSegredo.falhar('anotarAviso')
    expect(await tratarAviso(aviso('payment', 'pay1'), deps(semSegredo, null))).toBe(500)

    // Mesmo se o banco lançar em vez de devolver a falha.
    const lanca = cenario()
    const banco = { ...lanca.banco, anotarAviso: () => Promise.reject(new Error('rede')), apagarAvisosAntesDe: () => Promise.reject(new Error('rede')) }
    expect(await tratarAviso(aviso('payment', 'pay1'), { ...deps(lanca), banco })).toBe(200)
    expect(lanca.log).toHaveBeenCalledTimes(2)
  })

  it('falha inesperada: responde 500 e anota "falha: erro inesperado"', async () => {
    const c = cenario()
    const operadora = () => Promise.reject(new Error('quebrou'))
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), { ...deps(c), operadora })).toBe(500)
    expect(c.avisos).toEqual([{ topico: ASSINATURA, recurso_id: 'pre1', assinatura_confere: true, resultado: 'falha: erro inesperado' }])
    expect(c.log).toHaveBeenCalled()
  })
})

describe('o aviso da assinatura (subscription_preapproval)', () => {
  it('CA-405: a assinatura ficou ativa: grava o status e a próxima cobrança, sem mexer no expira_em', async () => {
    const { c, status, resultado } = await avisoDaAssinatura(
      [{ nutricionista_id: 'u1', plano: 'solo', status: 'pendente', preapproval_id: 'pre1', expira_em: '2027-01-01T00:00:00.000Z' }],
      AUTORIZADA,
    )
    expect(status).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({
      status: 'ativa',
      proxima_cobranca: '2026-11-06T15:00:00.000Z',
      expira_em: '2027-01-01T00:00:00.000Z',
      atualizado_em: AGORA.toISOString(),
    })
    expect(resultado).toBe('assinatura ativa')
    expect(c.ordem).toEqual(['GET /preapproval/pre1', 'lerDaOperadora', 'mudar', 'anotarAviso', 'apagarAvisosAntesDe'])
    expect(c.avisos[0]).toEqual({ topico: ASSINATURA, recurso_id: 'pre1', assinatura_confere: true, resultado: 'assinatura ativa' })
  })

  it('a data de hoje (a primeira cobrança) não vira próxima cobrança; só a que passa de amanhã', async () => {
    const casos: readonly [unknown, string | null][] = [
      ['2026-10-06T16:00:00.000Z', null],
      [new Date(AGORA.getTime() + UM_DIA_MS).toISOString(), null],
      [new Date(AGORA.getTime() + UM_DIA_MS + 1000).toISOString(), '2026-10-07T15:00:01.000Z'],
      ['amanhã', null],
      [undefined, null],
    ]
    for (const [data, esperada] of casos) {
      const { c, resultado } = await avisoDaAssinatura([{ ...LINHA, status: 'pendente' }], { ...AUTORIZADA, next_payment_date: data })
      expect(resultado).toBe('assinatura ativa')
      expect(c.assinaturas.get('u1')?.proxima_cobranca).toBe(esperada)
    }
  })

  it('pausada vira pausada; cancelada pela operadora vira cancelada, encerrada pela operadora, sem período (CB-94)', async () => {
    const pausada = await avisoDaAssinatura([LINHA], { ...AUTORIZADA, status: 'paused' })
    expect(pausada.resultado).toBe('assinatura pausada')
    expect(pausada.c.assinaturas.get('u1')).toMatchObject({ status: 'pausada', encerrada_por: null, expira_em: null, proxima_cobranca: null })

    for (const palavra of ['cancelled', 'canceled']) {
      const cancelada = await avisoDaAssinatura([LINHA], { ...AUTORIZADA, status: palavra })
      expect(cancelada.status).toBe(200)
      expect(cancelada.resultado).toBe('assinatura cancelada')
      expect(cancelada.c.assinaturas.get('u1')).toMatchObject({
        status: 'cancelada',
        encerrada_por: 'operadora',
        encerrada_em: AGORA.toISOString(),
        expira_em: null,
        proxima_cobranca: null,
      })
    }

    const pendente = await avisoDaAssinatura([LINHA], { ...AUTORIZADA, status: 'pending' })
    expect(pendente.resultado).toBe('assinatura pendente')
    expect(pendente.c.assinaturas.get('u1')).toMatchObject({ status: 'pendente', encerrada_por: null })
  })

  it('cancelada é final: aviso de "autorizada" atrasado não devolve o plano nem troca quem encerrou', async () => {
    const linha = { ...LINHA, status: 'cancelada', encerrada_por: 'recusa', expira_em: null }
    const { c, status, resultado } = await avisoDaAssinatura([linha], AUTORIZADA)
    expect(status).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', encerrada_por: 'recusa', proxima_cobranca: null })
    expect(c.ordem).not.toContain('mudar')
    expect(resultado).toBe('sem mudança: já cancelada')

    const pelaPessoa = await avisoDaAssinatura([{ ...LINHA, status: 'cancelada', encerrada_por: 'pessoa', expira_em: '2026-11-05T02:59:59.000Z' }], {
      ...AUTORIZADA,
      status: 'cancelled',
    })
    expect(pelaPessoa.c.ordem).not.toContain('mudar')
    expect(pelaPessoa.c.assinaturas.get('u1')).toMatchObject({ encerrada_por: 'pessoa', expira_em: '2026-11-05T02:59:59.000Z' })
  })

  it('linha com este id de outra conta: nada muda', async () => {
    const { c, status, resultado } = await avisoDaAssinatura([{ ...LINHA, nutricionista_id: 'u2', status: 'pendente' }], AUTORIZADA)
    expect(status).toBe(200)
    expect(resultado).toBe('ignorado: conta não confere')
    expect(c.assinaturas.get('u2')?.status).toBe('pendente')
    expect(c.assinaturas.has('u1')).toBe(false)
    for (const consulta of ['mudar', 'gravar', 'lerDaConta']) expect(c.ordem).not.toContain(consulta)
    expect(c.log).toHaveBeenCalledWith(expect.any(String), 'pre1')
  })

  it('assinatura sem conta na operadora (sem external_reference): nada muda', async () => {
    for (const dono of [undefined, '', '  ', 42]) {
      const { c, status, resultado } = await avisoDaAssinatura([], { ...AUTORIZADA, external_reference: dono })
      expect(status).toBe(200)
      expect(resultado).toBe('ignorado: assinatura sem conta')
      expect(c.ordem).toEqual(['GET /preapproval/pre1', 'anotarAviso', 'apagarAvisosAntesDe'])
    }
  })

  it('CA-405: operadora sem resposta (ou 5xx, ou 429) responde 500 para o aviso voltar; 401/403 também; 404 é ignorado com 200', async () => {
    const casos: readonly [RespostaDaOperadora | null, number, string][] = [
      [null, 500, 'falha: operadora fora'],
      [responde(500), 500, 'falha: operadora fora'],
      [responde(502), 500, 'falha: operadora fora'],
      [responde(503, null), 500, 'falha: operadora fora'],
      [responde(429), 500, 'falha: operadora fora'],
      [responde(401), 500, 'falha: credencial recusada'],
      [responde(403), 500, 'falha: credencial recusada'],
      [responde(404), 200, 'ignorado: assinatura não existe na operadora'],
      [responde(400, { message: 'invalid id' }), 200, 'ignorado: assinatura não existe na operadora'],
      [responde(200, null), 500, 'falha: resposta ilegível'],
    ]
    for (const [resposta, esperado, resultado] of casos) {
      const c = cenario([{ ...LINHA, status: 'pendente' }], { [PRE]: [resposta] })
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c)), resultado).toBe(esperado)
      expect(c.avisos[0]?.resultado).toBe(resultado)
      for (const consulta of NADA_MUDA) expect(c.ordem).not.toContain(consulta)
      expect(c.assinaturas.get('u1')?.status).toBe('pendente')
    }
  })

  it('falha do banco ao ler ou gravar responde 500', async () => {
    const casos: readonly [Parameters<Cenario['falhar']>[0], readonly LinhaParcial[]][] = [
      ['lerDaOperadora', [LINHA]],
      ['mudar', [{ ...LINHA, status: 'pendente' }]],
      ['lerDaConta', []],
      ['gravar', []],
    ]
    for (const [consulta, linhas] of casos) {
      const c = cenario(linhas, { [PRE]: [responde(200, AUTORIZADA)] })
      c.falhar(consulta)
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c)), consulta).toBe(500)
      expect(c.avisos[0]?.resultado, consulta).toBe('falha: banco')
      expect(c.log, consulta).toHaveBeenCalledWith(expect.any(String), 'banco fora')
      expect(c.pedidos.filter((p) => p.metodo === 'PUT'), consulta).toEqual([])
    }
  })

  it('o mesmo aviso de novo depois de uma falha refaz o trabalho sem repetir nada', async () => {
    const c = cenario([], { [PRE]: [responde(200, AUTORIZADA)] })
    c.falhar('gravar', 1)
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(500)
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: banco', 'adotada: solo mensal', 'assinatura ativa'])
    expect(c.assinaturas.get('u1')).toMatchObject({ plano: 'solo', status: 'ativa', preapproval_id: 'pre1' })
  })
})

describe('a assinatura sem dono (D-85)', () => {
  it('CA-400: assinatura autorizada sem linha e conta sem outra paga ativa: adota (plano e ciclo pelo valor, cartão da reserva, próxima cobrança)', async () => {
    const c = cenario([{ nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-07-31T23:59:59.000Z' }], { [PRE]: [responde(200, AUTORIZADA)] })
    c.comReserva('u1')
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(c.assinaturas.get('u1')).toEqual({
      nutricionista_id: 'u1',
      plano: 'solo',
      status: 'ativa',
      preapproval_id: 'pre1',
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
    expect(c.avisos[0]?.resultado).toBe('adotada: solo mensal')
    expect(c.ordem).toEqual(['GET /preapproval/pre1', 'lerDaOperadora', 'lerDaConta', 'lerReserva', 'gravar', 'anotarAviso', 'apagarAvisosAntesDe'])
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
  })

  it('CA-400: sem reserva, adota sem o cartão; Pro anual pelo valor 599 a cada 12 meses', async () => {
    const proAnual = { ...AUTORIZADA, next_payment_date: '2027-10-06T15:00:00.000Z', auto_recurring: { transaction_amount: 599, frequency: 12, frequency_type: 'months' } }
    const { c, status, resultado } = await avisoDaAssinatura([], proAnual)
    expect(status).toBe(200)
    expect(resultado).toBe('adotada: pro anual')
    expect(c.assinaturas.get('u1')).toMatchObject({
      plano: 'pro',
      ciclo: 'anual',
      valor_centavos: 59900,
      cartao_bandeira: null,
      cartao_final: null,
      proxima_cobranca: '2027-10-06T15:00:00.000Z',
    })
  })

  it('CA-400: sem data depois de amanhã, a próxima cobrança é a prevista pelo ciclo', async () => {
    const mensal = await avisoDaAssinatura([], { ...AUTORIZADA, next_payment_date: '2026-10-06T16:00:00.000Z' })
    expect(mensal.c.assinaturas.get('u1')?.proxima_cobranca).toBe('2026-11-06T15:00:00.000Z')

    const anual = await avisoDaAssinatura([], { ...AUTORIZADA, next_payment_date: null, auto_recurring: { transaction_amount: 299, frequency: 12 } })
    expect(anual.resultado).toBe('adotada: solo anual')
    expect(anual.c.assinaturas.get('u1')?.proxima_cobranca).toBe('2027-10-06T15:00:00.000Z')
  })

  it('CA-400: a conta cancelada no prazo (assinou de novo e a resposta se perdeu) também adota', async () => {
    const contas: readonly LinhaParcial[] = [
      { nutricionista_id: 'u1', plano: 'solo', status: 'cancelada', preapproval_id: 'preVelha', expira_em: '2026-10-20T02:59:59.000Z', encerrada_por: 'pessoa', ultima_cobranca_paga: '2026-09-20T15:00:00.000Z' },
      { nutricionista_id: 'u1', plano: 'pro', status: 'pausada', preapproval_id: 'preVelha' },
      { nutricionista_id: 'u1', plano: 'free', status: 'pendente' },
    ]
    for (const conta of contas) {
      const { c, status, resultado } = await avisoDaAssinatura([conta], AUTORIZADA)
      expect(status).toBe(200)
      expect(resultado).toBe('adotada: solo mensal')
      expect(c.assinaturas.get('u1')).toMatchObject({
        plano: 'solo',
        status: 'ativa',
        preapproval_id: 'pre1',
        expira_em: null,
        encerrada_por: null,
        encerrada_em: null,
        ultima_cobranca_paga: null,
      })
      expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
    }
  })

  it('CA-401: a conta já paga outra assinatura ativa: esta é a sobra e é cancelada lá; a linha de quem paga não muda', async () => {
    const pagantes: readonly LinhaParcial[] = [
      { nutricionista_id: 'u1', plano: 'pro', status: 'ativa', preapproval_id: 'prePaga' },
      { nutricionista_id: 'u1', plano: 'clinica', status: 'ativa' },
    ]
    for (const pagante of pagantes) {
      const { c, status, resultado } = await avisoDaAssinatura([pagante], AUTORIZADA, { [PUT]: [responde(200)] })
      expect(status).toBe(200)
      expect(resultado).toBe('cancelada: sobra')
      expect(c.assinaturas.get('u1')).toMatchObject({ plano: pagante.plano, status: 'ativa', preapproval_id: pagante.preapproval_id ?? null })
      expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
      for (const consulta of ['gravar', 'mudar', 'lerReserva']) expect(c.ordem).not.toContain(consulta)
    }
  })

  it('CA-401: a resposta do cancelamento se perdeu, mas a operadora já diz cancelada: conta como cancelada', async () => {
    const { status, resultado } = await avisoDaAssinatura([{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', preapproval_id: 'prePaga' }], AUTORIZADA, {
      [PRE]: [responde(200, AUTORIZADA), responde(200, { ...AUTORIZADA, status: 'cancelled' })],
    })
    expect(status).toBe(200)
    expect(resultado).toBe('cancelada: sobra')
  })

  it('CA-401: a sobra que não cancela lá responde 500 para tentar de novo', async () => {
    const { c, status, resultado } = await avisoDaAssinatura([{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', preapproval_id: 'prePaga' }], AUTORIZADA, {
      [PUT]: [responde(500)],
    })
    expect(status).toBe(500)
    expect(resultado).toBe('falha: sobra não cancelada')
    expect(c.assinaturas.get('u1')).toMatchObject({ plano: 'pro', preapproval_id: 'prePaga' })
    expect(c.log).toHaveBeenCalledWith(expect.stringContaining('CANCELAMENTO FALHOU'), 'pre1')
  })

  it('R-39: valor sem plano único não adota: cancela lá e anota "cancelada: valor desconhecido"', async () => {
    const recorrencias: readonly unknown[] = [
      { transaction_amount: 10, frequency: 1, frequency_type: 'months' },
      { transaction_amount: 34.9, frequency: 3, frequency_type: 'months' },
      { transaction_amount: 34.9, frequency: 1, frequency_type: 'days' },
      { transaction_amount: '34.9', frequency: 1 },
      undefined,
    ]
    for (const auto_recurring of recorrencias) {
      const { c, status, resultado } = await avisoDaAssinatura([], { ...AUTORIZADA, auto_recurring }, { [PUT]: [responde(200)] })
      expect(status).toBe(200)
      expect(resultado).toBe('cancelada: valor desconhecido')
      expect(c.assinaturas.has('u1')).toBe(false)
      expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    }

    const naoCancelou = await avisoDaAssinatura([], { ...AUTORIZADA, auto_recurring: { transaction_amount: 10, frequency: 1 } }, { [PUT]: [null] })
    expect(naoCancelou.status).toBe(500)
    expect(naoCancelou.resultado).toBe('falha: valor desconhecido não cancelada')
    expect(naoCancelou.c.assinaturas.has('u1')).toBe(false)
  })

  it('assinatura sem linha que não está ativa não é adotada', async () => {
    for (const [palavra, status] of [
      ['pending', 'pendente'],
      ['paused', 'pausada'],
      ['cancelled', 'cancelada'],
    ] as const) {
      const { c, resultado } = await avisoDaAssinatura([], { ...AUTORIZADA, status: palavra })
      expect(resultado).toBe(`ignorado: assinatura ${status} sem linha`)
      expect(c.assinaturas.has('u1')).toBe(false)
      for (const consulta of ['lerDaConta', 'gravar', 'mudar']) expect(c.ordem).not.toContain(consulta)
      expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
    }
  })

  it('o registro da função nunca leva o e-mail nem o corpo da operadora', async () => {
    const registros: unknown[] = []
    const cenarios = [
      await avisoDaAssinatura([], AUTORIZADA),
      await avisoDaAssinatura([{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', preapproval_id: 'prePaga' }], AUTORIZADA, { [PUT]: [responde(500)] }),
      await avisoDaAssinatura([{ ...LINHA, nutricionista_id: 'u2' }], AUTORIZADA),
    ]
    for (const { c } of cenarios) registros.push(...c.log.mock.calls.flat())
    expect(registros.length).toBeGreaterThan(0)
    const texto = JSON.stringify(registros)
    expect(texto).not.toContain('ana@exemplo.com')
    expect(texto).not.toContain('authorized')
  })
})

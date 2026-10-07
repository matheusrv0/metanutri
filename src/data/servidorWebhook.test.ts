// @vitest-environment node
import { createHmac } from 'node:crypto'
import { daLinhaAssinatura } from '@/domain/assinatura.ts'
import { UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import type { LinhaDaAssinatura, Operadora, RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import {
  assinaturaConfere,
  GUARDA_DOS_AVISOS_MS,
  manifestoDoAviso,
  situacaoDaMensalidade,
  tratarAviso,
  type AvisoRecebido,
  type DependenciasDoWebhook,
  type StatusDoAviso,
} from '../../supabase/functions/_shared/webhook.ts'
import { AGORA, cenario, linhaDe, responde, type Cenario } from './servidorFalsos.test-utils.ts'

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
    expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', ' \n')).toBe(false)
  })

  it('o segredo colado com espaço ou quebra de linha nas pontas ainda confere', async () => {
    for (const segredo of [`${SEGREDO}\n`, `${SEGREDO}\r\n`, ` ${SEGREDO} `]) {
      expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', segredo)).toBe(true)
    }
  })

  it('o cabeçalho vale em qualquer ordem, com os nomes em maiúsculas e com partes a mais', async () => {
    const v1 = `v1=${ASSINADO.comRequestId}`
    const aceitos = [
      `${v1},ts=1700000000`,
      `TS=1700000000,V1=${ASSINADO.comRequestId}`,
      `Ts=1700000000, V1=${ASSINADO.comRequestId}`,
      `ts=1700000000,${v1},v2=abc`,
      `foo=bar,ts=1700000000,${v1}`,
      `ts=1700000000,,sem-igual,${v1}`,
    ]
    for (const cabecalho of aceitos) expect(await assinaturaConfere(cabecalho, 'req-1', '2c938084726fca48', SEGREDO), cabecalho).toBe(true)
    // A parte a mais não substitui as que contam.
    expect(await assinaturaConfere(`ts=1700000000,v2=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
    expect(await assinaturaConfere(`t=1700000000,${v1}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
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

    const soCorpo = cenario([], { 'GET /authorized_payments/123456789': [responde(404)] })
    const doCorpo = aviso('subscription_authorized_payment', null, {
      corpo: { type: 'subscription_authorized_payment', data: { id: 123456789 } },
      xRequestId: 'req-2',
      xSignature: `ts=1700000300,v1=${ASSINADO.idNumerico}`,
    })
    expect(await tratarAviso(doCorpo, deps(soCorpo))).toBe(200)
    expect(soCorpo.avisos[0]).toMatchObject({ topico: 'subscription_authorized_payment', recurso_id: '123456789', assinatura_confere: true })
    expect(soCorpo.pedidos.map((p) => p.caminho)).toEqual(['/authorized_payments/123456789'])
  })

  it('o segredo configurado com espaço ou quebra de linha no fim ainda confere o aviso', async () => {
    for (const segredo of [`${SEGREDO}\n`, ` ${SEGREDO} `]) {
      const c = cenario([], { [PRE]: [responde(404)] })
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c, segredo))).toBe(200)
      expect(c.avisos[0]).toMatchObject({ assinatura_confere: true, resultado: 'ignorado: assinatura não existe na operadora' })
    }
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
      // D-27: a autorização muda o status; o plano escolhido continua.
      plano: 'solo',
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

  it('pausada vira pausada; cancelada pela operadora vira cancelada, encerrada pela operadora, sem período (CB-94); pendente não tira o plano (D-27)', async () => {
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

    // D-27 e CA-169: o aviso de "pendente" muda só o status; o plano escolhido continua na linha.
    const pendente = await avisoDaAssinatura([LINHA], { ...AUTORIZADA, status: 'pending' })
    expect(pendente.resultado).toBe('assinatura pendente')
    expect(pendente.c.assinaturas.get('u1')).toMatchObject({ plano: 'solo', ciclo: 'mensal', status: 'pendente', encerrada_por: null })
  })

  it('CB-94: a cancelada pela operadora numa linha ativa com data de fim deixa o expira_em como está', async () => {
    const { c, resultado } = await avisoDaAssinatura([{ ...LINHA, expira_em: '2027-01-01T00:00:00.000Z' }], { ...AUTORIZADA, status: 'cancelled' })
    expect(resultado).toBe('assinatura cancelada')
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', encerrada_por: 'operadora', expira_em: '2027-01-01T00:00:00.000Z' })
  })

  it('a linha que mudou entre ler e gravar (0 linhas): 500, e na volta do aviso a assinatura é adotada ou cancelada como sobra', async () => {
    const casos: readonly [LinhaParcial, string, string][] = [
      [{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', preapproval_id: 'preNovo' }, 'cancelada: sobra', 'preNovo'],
      [{ nutricionista_id: 'u1', plano: 'free', status: 'pendente' }, 'adotada: solo mensal', 'pre1'],
    ]
    for (const [novaLinha, depois, assinaturaQueFica] of casos) {
      const c = cenario([{ ...LINHA, status: 'pendente' }], { [PRE]: [responde(200, AUTORIZADA)], [PUT]: [responde(200)] })
      // Entre a leitura e a gravação, a linha da conta deixou de ter esta assinatura (a pessoa assinou de novo).
      const banco: DependenciasDoWebhook['banco'] = {
        ...c.banco,
        mudar: async (conta, id, mudanca) => {
          c.assinaturas.set('u1', linhaDe(novaLinha))
          return c.banco.mudar(conta, id, mudanca)
        },
      }
      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), { ...deps(c), banco })).toBe(500)
      expect(c.avisos[0]?.resultado).toBe('falha: linha mudou')
      expect(c.log).toHaveBeenCalledWith(expect.any(String), 'pre1')

      expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
      expect(c.avisos[1]?.resultado).toBe(depois)
      expect(c.assinaturas.get('u1')?.preapproval_id).toBe(assinaturaQueFica)
    }
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

  it.each<[string, Parameters<Cenario['falhar']>[0], string, string]>([
    ['a conta não existe mais: a gravação falha com 23503 (chave estrangeira)', 'gravar', '23503', 'insert or update on table "assinaturas" violates foreign key constraint'],
    ['o código da conta não é um uuid: a leitura da conta falha com 22P02', 'lerDaConta', '22P02', 'invalid input syntax for type uuid'],
    ['o código da conta não é um uuid: a gravação falha com 22P02', 'gravar', '22P02', 'invalid input syntax for type uuid'],
  ])('CB-111: %s; a assinatura é cancelada lá e o registro anota a sobra, com 200', async (_caso, consulta, codigo, mensagem) => {
    const c = cenario([], { [PRE]: [responde(200, AUTORIZADA)], [PUT]: [responde(200)] })
    c.falhar(consulta, Number.POSITIVE_INFINITY, { mensagem, codigo })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(c.avisos[0]?.resultado).toBe('cancelada: sobra')
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    expect(c.assinaturas.size).toBe(0)
    expect(c.log).toHaveBeenCalledWith(expect.stringContaining('conta que não existe'), 'pre1')

    // Na volta do mesmo aviso, a operadora já diz cancelada: nada a cancelar de novo.
    const volta = cenario([], { [PRE]: [responde(200, { ...AUTORIZADA, status: 'cancelled' })], [PUT]: [responde(200)] })
    volta.falhar(consulta, Number.POSITIVE_INFINITY, { mensagem, codigo })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(volta))).toBe(200)
    expect(volta.avisos[0]?.resultado).toBe('ignorado: assinatura cancelada sem linha')
  })

  it('CB-111: o cancelamento lá que não pega responde 500 para o aviso voltar', async () => {
    const c = cenario([], { [PRE]: [responde(200, AUTORIZADA)], [PUT]: [responde(500)] })
    c.falhar('gravar', Number.POSITIVE_INFINITY, { mensagem: 'violates foreign key constraint', codigo: '23503' })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(500)
    expect(c.avisos[0]?.resultado).toBe('falha: sobra não cancelada')
    expect(c.log).toHaveBeenCalledWith(expect.stringContaining('CANCELAMENTO FALHOU'), 'pre1')
  })

  it.each<[Parameters<Cenario['falhar']>[0], string | null]>([
    ['lerDaConta', null],
    ['lerDaConta', '08006'],
    ['gravar', null],
    ['gravar', '23505'],
    ['gravar', '23514'],
  ])('CB-111: as outras falhas do banco na adoção (%s, código %s) continuam passageiras: 500, sem cancelar nada', async (consulta, codigo) => {
    const c = cenario([], { [PRE]: [responde(200, AUTORIZADA)], [PUT]: [responde(200)] })
    c.falhar(consulta, Number.POSITIVE_INFINITY, { mensagem: 'banco fora', codigo })
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(500)
    expect(c.avisos[0]?.resultado).toBe('falha: banco')
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
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

const MENSALIDADE = 'subscription_authorized_payment'
const AP = 'GET /authorized_payments/777'
const PAGA = {
  id: 777,
  preapproval_id: 'pre1',
  status: 'processed',
  debit_date: '2026-11-06T13:00:00.000Z',
  payment: { id: 1, status: 'approved', status_detail: 'accredited' },
}
const RECUSADA = { ...PAGA, status: 'recycling', retry_attempt: 1, payment: { id: 2, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' } }
/** Um mês depois de AGORA, uma hora depois da cobrança de 6/11. */
const NO_DIA = new Date('2026-11-06T14:00:00.000Z')
const ATIVA_PRE1 = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre1', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const depsNoDia = (c: Cenario): DependenciasDoWebhook => ({ ...deps(c), agora: () => NO_DIA })
const CORTADA = 'cortada: recusa (cc_rejected_insufficient_amount)'
/** O que a linha cortada por recusa guarda (CA-392). */
const CORTADA_NA_LINHA = { status: 'cancelada', expira_em: null, encerrada_por: 'recusa', encerrada_em: '2026-11-06T13:00:00.000Z' }

/** O aviso da mensalidade 777 no dia da cobrança. */
async function avisoDaMensalidade(linhas: readonly LinhaParcial[], rotas: Rotas) {
  const c = cenario(linhas, rotas)
  const status = await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))
  return { c, status, resultado: c.avisos[0]?.resultado }
}

const puts = (c: Cenario) => c.pedidos.filter((p) => p.metodo === 'PUT')

describe('situacaoDaMensalidade (D-83)', () => {
  it.each([
    ['processed', 'approved', 'paga'],
    ['processed', 'rejected', 'recusada'],
    ['recycling', 'rejected', 'recusada'],
    ['recycling', undefined, 'recusada'],
    ['scheduled', undefined, 'outra'],
    ['processed', 'in_process', 'outra'],
  ] as const)('%s / %s: %s', (status, doPagamento, situacao) => {
    expect(situacaoDaMensalidade(status, doPagamento)).toBe(situacao)
  })
})

describe('a mensalidade paga (subscription_authorized_payment)', () => {
  it('CA-394: mensalidade paga grava a data dela e a próxima cobrança da operadora', async () => {
    const { c, status, resultado } = await avisoDaMensalidade([ATIVA_PRE1], {
      [AP]: [responde(200, PAGA)],
      [PRE]: [responde(200, { status: 'authorized', next_payment_date: '2026-12-06T13:00:00.000Z' })],
    })
    expect(status).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({
      status: 'ativa',
      ultima_cobranca_paga: '2026-11-06T13:00:00.000Z',
      proxima_cobranca: '2026-12-06T13:00:00.000Z',
      atualizado_em: NO_DIA.toISOString(),
    })
    expect(resultado).toBe('mensalidade paga')
    expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, 'mudar', 'anotarAviso', 'apagarAvisosAntesDe'])
    expect(puts(c)).toEqual([])
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('solo')
    expect(c.avisos[0]).toEqual({ topico: MENSALIDADE, recurso_id: '777', assinatura_confere: true, resultado: 'mensalidade paga' })
  })

  it('CA-394: sem a leitura da assinatura, a próxima é a prevista a partir do dia da cobrança', async () => {
    const leituras: readonly (RespostaDaOperadora | null)[] = [
      null,
      responde(500),
      responde(404),
      responde(200, null),
      responde(200, { status: 'authorized' }),
      // A data de hoje (a cobrança que acabou de cair) não serve: só a que passa de amanhã.
      responde(200, { status: 'authorized', next_payment_date: '2026-11-06T13:00:00.000Z' }),
    ]
    for (const leitura of leituras) {
      const { c, resultado } = await avisoDaMensalidade([ATIVA_PRE1], { [AP]: [responde(200, PAGA)], [PRE]: [leitura] })
      expect(resultado).toBe('mensalidade paga')
      expect(c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-12-06T13:00:00.000Z' })
    }

    const anual = await avisoDaMensalidade([{ ...ATIVA_PRE1, ciclo: 'anual' }], { [AP]: [responde(200, PAGA)] })
    expect(anual.c.assinaturas.get('u1')?.proxima_cobranca).toBe('2027-11-06T13:00:00.000Z')

    // Sem ciclo conhecido, não há previsão: só a data da paga.
    const semCiclo = await avisoDaMensalidade([{ ...ATIVA_PRE1, ciclo: null }], { [AP]: [responde(200, PAGA)] })
    expect(semCiclo.c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-11-06T15:00:00.000Z' })
  })

  it('mensalidade paga mais velha que a anotada não volta a data', async () => {
    const anotada = { ...ATIVA_PRE1, ultima_cobranca_paga: '2026-12-06T13:00:00.000Z', proxima_cobranca: '2027-01-06T13:00:00.000Z' }
    const comLeitura = await avisoDaMensalidade([anotada], {
      [AP]: [responde(200, PAGA)],
      [PRE]: [responde(200, { status: 'authorized', next_payment_date: '2027-01-06T13:00:00.000Z' })],
    })
    expect(comLeitura.resultado).toBe('mensalidade paga')
    expect(comLeitura.c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-12-06T13:00:00.000Z', proxima_cobranca: '2027-01-06T13:00:00.000Z' })

    // Sem a leitura, a previsão a partir da paga velha (ou da mesma) não entra: nada a gravar.
    for (const linha of [anotada, { ...anotada, ultima_cobranca_paga: '2026-11-06T13:00:00.000Z' }]) {
      const semLeitura = await avisoDaMensalidade([linha], { [AP]: [responde(200, PAGA)] })
      expect(semLeitura.resultado).toBe('sem mudança: mensalidade já anotada')
      expect(semLeitura.c.ordem).not.toContain('mudar')
      expect(semLeitura.c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: linha.ultima_cobranca_paga, proxima_cobranca: '2027-01-06T13:00:00.000Z' })
    }
  })

  it('a data anotada que não é data não impede gravar a da paga', async () => {
    const { c } = await avisoDaMensalidade([{ ...ATIVA_PRE1, ultima_cobranca_paga: 'ontem' }], { [AP]: [responde(200, PAGA)] })
    expect(c.assinaturas.get('u1')?.ultima_cobranca_paga).toBe('2026-11-06T13:00:00.000Z')
  })

  it('sem debit_date que seja data, a paga vale como de agora', async () => {
    const { c } = await avisoDaMensalidade([{ ...ATIVA_PRE1, status: 'pendente' }], { [AP]: [responde(200, { ...PAGA, debit_date: 'ontem' })] })
    expect(c.assinaturas.get('u1')?.ultima_cobranca_paga).toBe(NO_DIA.toISOString())
  })

  it('CB-97: paga depois de a pessoa cancelar: a linha continua cancelada, só a data da última paga é gravada', async () => {
    const cancelada = { ...ATIVA_PRE1, status: 'cancelada', encerrada_por: 'pessoa', expira_em: null }
    const c = cenario([cancelada], { [AP]: [responde(200, PAGA)], [PRE]: [responde(200, { status: 'cancelled', next_payment_date: '2026-12-06T13:00:00.000Z' })] })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({
      status: 'cancelada',
      expira_em: null,
      encerrada_por: 'pessoa',
      ultima_cobranca_paga: '2026-11-06T13:00:00.000Z',
      proxima_cobranca: '2026-11-06T15:00:00.000Z',
    })
    expect(c.pedidos.map((p) => `${p.metodo} ${p.caminho}`)).toEqual([AP])
    // Resultado próprio e uma linha no registro da função (só o id da assinatura), para o dono ver se cabe devolver.
    expect(c.avisos[0]?.resultado).toBe('mensalidade paga (assinatura já cancelada)')
    expect(c.log.mock.calls).toEqual([[expect.stringContaining('já cancelada'), 'pre1']])

    // O mesmo aviso de novo: nada a gravar, e o registro não repete.
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos[1]?.resultado).toBe('sem mudança: mensalidade já anotada')
    expect(c.ordem.filter((o) => o === 'mudar')).toHaveLength(1)
    expect(c.log).toHaveBeenCalledTimes(1)

    // A cortada por recusa que a operadora acabou cobrando também é sinalizada.
    const cortada = await avisoDaMensalidade([{ ...ATIVA_PRE1, ...CORTADA_NA_LINHA }], { [AP]: [responde(200, PAGA)] })
    expect(cortada.resultado).toBe('mensalidade paga (assinatura já cancelada)')
    expect(cortada.c.assinaturas.get('u1')).toMatchObject({ ...CORTADA_NA_LINHA, ultima_cobranca_paga: '2026-11-06T13:00:00.000Z' })

    // Pendente ou pausada também: só a data (o status vem pelo aviso da assinatura), sem sinal.
    for (const status of ['pendente', 'pausada']) {
      const outra = await avisoDaMensalidade([{ ...ATIVA_PRE1, status }], { [AP]: [responde(200, PAGA)] })
      expect(outra.resultado).toBe('mensalidade paga')
      expect(outra.c.assinaturas.get('u1')).toMatchObject({ status, ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-11-06T15:00:00.000Z' })
      expect(outra.c.pedidos).toHaveLength(1)
      expect(outra.c.log).not.toHaveBeenCalled()
    }
  })

  it('CB-110 (D-85): paga sem linha, a assinatura autorizada lá e a conta sem outra paga: adota e grava a paga na linha adotada', async () => {
    const c = cenario([{ nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-07-31T23:59:59.000Z' }], {
      [AP]: [responde(200, PAGA)],
      [PRE]: [responde(200, { ...AUTORIZADA, next_payment_date: '2026-12-06T13:00:00.000Z' })],
    })
    c.comReserva('u1')
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos[0]?.resultado).toBe('adotada: solo mensal; mensalidade paga')
    expect(c.assinaturas.get('u1')).toMatchObject({
      plano: 'solo',
      status: 'ativa',
      ciclo: 'mensal',
      preapproval_id: 'pre1',
      expira_em: null,
      cartao_bandeira: 'Mastercard',
      cartao_final: '6351',
      ultima_cobranca_paga: '2026-11-06T13:00:00.000Z',
      proxima_cobranca: '2026-12-06T13:00:00.000Z',
      atualizado_em: NO_DIA.toISOString(),
    })
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('solo')
    expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, 'lerDaConta', 'lerReserva', 'gravar', PRE, 'mudar', 'anotarAviso', 'apagarAvisosAntesDe'])
    expect(puts(c)).toEqual([])

    // O aviso da assinatura que chegar depois acha a linha e não muda o que a paga gravou.
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), depsNoDia(c))).toBe(200)
    expect(c.avisos[1]?.resultado).toBe('assinatura ativa')
    expect(c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-12-06T13:00:00.000Z' })
  })

  it('CB-110 (D-85): paga sem linha, a assinatura autorizada lá e a conta já paga outra: a sobra é cancelada lá; a linha de quem paga não muda', async () => {
    const { c, status, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], {
      [AP]: [responde(200, PAGA)],
      [PRE]: [responde(200, AUTORIZADA)],
      [PUT]: [responde(200)],
    })
    expect(status).toBe(200)
    expect(resultado).toBe('cancelada: sobra')
    expect(puts(c)).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', preapproval_id: 'preNovo', ultima_cobranca_paga: null })
    for (const consulta of ['gravar', 'mudar']) expect(c.ordem).not.toContain(consulta)
    // A mensalidade foi paga numa assinatura que sobrou: o registro da função leva só o id, para o dono ver se cabe devolver.
    expect(c.log).toHaveBeenCalledWith(expect.stringContaining('conferir se cabe devolver'), 'pre1')
  })

  it('CB-110: paga sem linha e a sobra que não cancela lá responde 500 para o aviso voltar', async () => {
    const { c, status, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], {
      [AP]: [responde(200, PAGA)],
      [PRE]: [responde(200, AUTORIZADA)],
      [PUT]: [responde(500)],
    })
    expect(status).toBe(500)
    expect(resultado).toBe('falha: sobra não cancelada')
    expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'preNovo', ultima_cobranca_paga: null })
  })

  it('CB-110: paga sem linha e a assinatura lá sem valer (cancelada, pausada, pendente), sem conta ou que não existe: ignorada, sem PUT', async () => {
    const leituras: readonly RespostaDaOperadora[] = [
      responde(200, { ...AUTORIZADA, status: 'cancelled' }),
      responde(200, { ...AUTORIZADA, status: 'paused' }),
      responde(200, { ...AUTORIZADA, status: 'pending' }),
      responde(200, { ...AUTORIZADA, external_reference: undefined }),
      responde(404),
    ]
    for (const leitura of leituras) {
      const { c, status, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], {
        [AP]: [responde(200, PAGA)],
        [PRE]: [leitura],
        [PUT]: [responde(200)],
      })
      expect(status).toBe(200)
      expect(resultado).toBe('ignorado: mensalidade paga sem linha')
      expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, 'anotarAviso', 'apagarAvisosAntesDe'])
      expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'preNovo', ultima_cobranca_paga: null })
    }
  })

  it('CB-110: paga sem linha e a leitura da assinatura falha: 500, como no aviso da assinatura; nada gravado nem cancelado', async () => {
    const casos: readonly [RespostaDaOperadora | null, string][] = [
      [null, 'falha: operadora fora'],
      [responde(503), 'falha: operadora fora'],
      [responde(429), 'falha: operadora fora'],
      [responde(401), 'falha: credencial recusada'],
      [responde(200, null), 'falha: resposta ilegível'],
    ]
    for (const [leitura, esperado] of casos) {
      const { c, status, resultado } = await avisoDaMensalidade([], { [AP]: [responde(200, PAGA)], [PRE]: [leitura], [PUT]: [responde(200)] })
      expect(status, esperado).toBe(500)
      expect(resultado).toBe(esperado)
      expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, 'anotarAviso', 'apagarAvisosAntesDe'])
      expect(c.assinaturas.has('u1')).toBe(false)
    }
  })

  it('CB-110 e CB-111: a mensalidade paga sem linha de uma conta que não existe mais também cancela a assinatura lá', async () => {
    const c = cenario([], { [AP]: [responde(200, PAGA)], [PRE]: [responde(200, AUTORIZADA)], [PUT]: [responde(200)] })
    c.falhar('gravar', Number.POSITIVE_INFINITY, { mensagem: 'violates foreign key constraint', codigo: '23503' })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos[0]?.resultado).toBe('cancelada: sobra')
    expect(puts(c)).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    expect(c.assinaturas.size).toBe(0)
  })

  it('CB-110: a paga que não grava na linha adotada responde 500; na volta, a linha já existe e a paga entra como numa linha comum', async () => {
    const c = cenario([], { [AP]: [responde(200, PAGA)], [PRE]: [responde(200, { ...AUTORIZADA, next_payment_date: '2026-12-06T13:00:00.000Z' })] })
    c.falhar('mudar', 1)
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(500)
    expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'pre1', status: 'ativa', ultima_cobranca_paga: null })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: banco', 'mensalidade paga'])
    expect(c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-12-06T13:00:00.000Z' })
    expect(c.ordem.filter((o) => o === 'gravar')).toHaveLength(1)
  })

  it('falha do banco ao ler ou gravar a paga responde 500; linha que mudou no meio também', async () => {
    for (const consulta of ['lerDaOperadora', 'mudar'] as const) {
      const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, PAGA)] })
      c.falhar(consulta)
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c)), consulta).toBe(500)
      expect(c.avisos[0]?.resultado, consulta).toBe('falha: banco')
    }

    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, PAGA)] })
    const banco: DependenciasDoWebhook['banco'] = { ...c.banco, mudar: () => Promise.resolve({ linhas: 0, falha: null }) }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), banco })).toBe(500)
    expect(c.avisos[0]?.resultado).toBe('falha: linha mudou')
  })
})

describe('a mensalidade recusada (D-80)', () => {
  it('CA-392 e CA-405: mensalidade recusada cancela lá e, só depois, aqui: cancelada, sem período, encerrada por recusa no dia da cobrança', async () => {
    const c = cenario([{ ...ATIVA_PRE1, expira_em: '2026-12-01T02:59:59.000Z' }], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)] })
    const linhaNoCancelamento: unknown[] = []
    const operadora: Operadora = (metodo, caminho, corpo) => {
      if (metodo === 'PUT') linhaNoCancelamento.push(c.assinaturas.get('u1'))
      return c.operadora(metodo, caminho, corpo)
    }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), operadora })).toBe(200)
    // Antes de cancelar lá, a linha só ganha quem está encerrando; o plano pago continua até a operadora parar.
    expect(c.ordem).toEqual([AP, 'lerDaOperadora', 'mudar', PUT, 'mudar', 'anotarAviso', 'apagarAvisosAntesDe'])
    expect(linhaNoCancelamento).toEqual([expect.objectContaining({ status: 'ativa', encerrada_por: 'recusa', expira_em: '2026-12-01T02:59:59.000Z' })])
    expect(daLinhaAssinatura(linhaNoCancelamento[0], NO_DIA).plano).toBe('solo')
    expect(puts(c)).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    expect(c.assinaturas.get('u1')).toMatchObject({ ...CORTADA_NA_LINHA, atualizado_em: NO_DIA.toISOString() })
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('free')
    expect(c.avisos[0]?.resultado).toBe(CORTADA)
  })

  it('sem motivo nem dia da cobrança: encerrada agora, e o resultado sem parênteses', async () => {
    const { c, resultado } = await avisoDaMensalidade([ATIVA_PRE1], {
      [AP]: [responde(200, { ...RECUSADA, debit_date: null, payment: { id: 2, status: 'rejected' } })],
      [PUT]: [responde(200)],
    })
    expect(resultado).toBe('cortada: recusa')
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', encerrada_por: 'recusa', encerrada_em: NO_DIA.toISOString() })
  })

  it('pendente com a primeira mensalidade recusada também é cortada', async () => {
    const primeira = { ...RECUSADA, status: 'processed', retry_attempt: 0 }
    for (const status of ['pendente', 'pausada']) {
      const { c, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, status, proxima_cobranca: null }], { [AP]: [responde(200, primeira)], [PUT]: [responde(200)] })
      expect(resultado).toBe(CORTADA)
      expect(c.assinaturas.get('u1')).toMatchObject(CORTADA_NA_LINHA)
      expect(puts(c)).toHaveLength(1)
    }
  })

  it('CB-96: o mesmo aviso de recusa de novo não muda nada nem cancela de novo', async () => {
    const outraTentativa = { ...RECUSADA, retry_attempt: 2, debit_date: '2026-11-08T13:00:00.000Z' }
    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA), responde(200, RECUSADA), responde(200, outraTentativa)], [PUT]: [responde(200)] })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    const depois = { ...depsNoDia(c), agora: () => new Date('2026-11-08T14:00:00.000Z') }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depois)).toBe(200)
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depois)).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual([CORTADA, 'sem mudança: já cancelada', 'sem mudança: já cancelada'])
    expect(puts(c)).toHaveLength(1)
    expect(c.ordem.filter((o) => o === 'mudar')).toHaveLength(2)
    expect(c.assinaturas.get('u1')).toMatchObject({ ...CORTADA_NA_LINHA, atualizado_em: NO_DIA.toISOString() })
  })

  it('D-80: recusa numa assinatura que a pessoa já cancelou com período à frente: o período cai e quem encerrou passa a ser a recusa, sem cancelar de novo', async () => {
    const comPeriodo = { ...ATIVA_PRE1, status: 'cancelada', expira_em: '2026-12-06T02:59:59.000Z' }
    for (const encerrada_por of ['pessoa', 'operadora', null]) {
      const linha = { ...comPeriodo, encerrada_por, encerrada_em: '2026-11-01T12:00:00.000Z' }
      expect(daLinhaAssinatura(linhaDe(linha), NO_DIA).plano).toBe('solo')
      const c = cenario([linha], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)] })
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
      expect(c.avisos[0]?.resultado).toBe('sem período: recusa (cc_rejected_insufficient_amount)')
      expect(c.assinaturas.get('u1')).toMatchObject({ ...CORTADA_NA_LINHA, atualizado_em: NO_DIA.toISOString() })
      expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('free')
      expect(c.ordem).toEqual([AP, 'lerDaOperadora', 'mudar', 'anotarAviso', 'apagarAvisosAntesDe'])

      // CB-96: o mesmo aviso de novo não muda nada.
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
      expect(c.avisos[1]?.resultado).toBe('sem mudança: já cancelada')
      expect(c.ordem.filter((o) => o === 'mudar')).toHaveLength(1)
      expect(puts(c)).toEqual([])
    }
  })

  it('recusa numa cancelada sem período à frente, ou mais velha que a última paga: nada muda', async () => {
    const pelaPessoa = { ...ATIVA_PRE1, status: 'cancelada', encerrada_por: 'pessoa', encerrada_em: '2026-11-01T12:00:00.000Z' }
    const linhas = [
      { ...pelaPessoa, expira_em: null },
      { ...pelaPessoa, expira_em: '2026-11-06T02:59:59.000Z' },
      // A paga de dezembro já foi anotada: a recusa de novembro (que chega atrasada) não tira o período pago.
      { ...pelaPessoa, expira_em: '2027-01-06T02:59:59.000Z', ultima_cobranca_paga: '2026-12-06T13:00:00.000Z' },
      // CB-96: a já encerrada pela recusa nunca muda, nem com uma data de fim à frente.
      { ...pelaPessoa, encerrada_por: 'recusa', expira_em: '2027-01-06T02:59:59.000Z' },
    ]
    for (const linha of linhas) {
      const { c, resultado } = await avisoDaMensalidade([linha], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)] })
      expect(resultado).toBe('sem mudança: já cancelada')
      expect(c.ordem).not.toContain('mudar')
      expect(puts(c)).toEqual([])
      expect(c.assinaturas.get('u1')).toMatchObject({ encerrada_por: linha.encerrada_por, encerrada_em: linha.encerrada_em, expira_em: linha.expira_em })
    }
  })

  it('CB-98: recusa de uma assinatura que a pessoa já trocou por outra: só aquela é afetada, e só lá', async () => {
    for (const leitura of [null, responde(500), responde(200, { ...AUTORIZADA, status: 'authorized' })]) {
      const { c, status, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], {
        [AP]: [responde(200, RECUSADA)],
        [PRE]: [leitura],
        [PUT]: [responde(200)],
      })
      expect(status).toBe(200)
      expect(resultado).toBe('cancelada: recusa sem linha')
      expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', preapproval_id: 'preNovo', encerrada_por: null })
      expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, PUT, 'anotarAviso', 'apagarAvisosAntesDe'])
      expect(puts(c)).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre1', corpo: { status: 'cancelled' } }])
    }

    const naoCancelou = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], { [AP]: [responde(200, RECUSADA)] })
    expect(naoCancelou.status).toBe(500)
    expect(naoCancelou.resultado).toBe('falha: recusa sem cancelar')
  })

  it('CB-98: a assinatura sem linha que a operadora já diz cancelada não é cancelada de novo', async () => {
    for (const palavra of ['cancelled', 'canceled']) {
      const { c, status, resultado } = await avisoDaMensalidade([{ ...ATIVA_PRE1, preapproval_id: 'preNovo' }], {
        [AP]: [responde(200, RECUSADA)],
        [PRE]: [responde(200, { ...AUTORIZADA, status: palavra })],
        [PUT]: [responde(200)],
      })
      expect(status).toBe(200)
      expect(resultado).toBe('sem mudança: já cancelada lá')
      expect(puts(c)).toEqual([])
      expect(c.ordem).toEqual([AP, 'lerDaOperadora', PRE, 'anotarAviso', 'apagarAvisosAntesDe'])
    }
  })

  it('D-80: o cancelamento lá não pega: 500, a conta continua no plano pago e o aviso volta', async () => {
    for (const recusaDoPut of [null, responde(500), responde(401)]) {
      const { c, status, resultado } = await avisoDaMensalidade([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [recusaDoPut] })
      expect(status).toBe(500)
      expect(resultado).toBe('falha: recusa sem cancelar')
      // Só fica anotado quem está encerrando (para o aviso de "cancelada" que chegar depois); o status não muda.
      expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', expira_em: null, proxima_cobranca: '2026-11-06T15:00:00.000Z', encerrada_por: 'recusa' })
      expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('solo')
      expect(c.log).toHaveBeenCalledWith(expect.stringContaining('CANCELAMENTO FALHOU'), 'pre1', recusaDoPut?.status ?? null)
    }
  })

  it('D-80: a operadora tentou de novo e a mensalidade passou antes de o corte pegar: a conta segue no plano', async () => {
    const c = cenario([ATIVA_PRE1], {
      [AP]: [responde(200, RECUSADA), responde(200, { ...PAGA, debit_date: '2026-11-07T13:00:00.000Z' })],
      [PRE]: [null, responde(200, { status: 'authorized', next_payment_date: '2026-12-06T13:00:00.000Z' })],
    })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(500)
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: recusa sem cancelar', 'mensalidade paga'])
    expect(c.assinaturas.get('u1')).toMatchObject({
      status: 'ativa',
      ultima_cobranca_paga: '2026-11-07T13:00:00.000Z',
      proxima_cobranca: '2026-12-06T13:00:00.000Z',
      encerrada_por: null,
      encerrada_em: null,
    })
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('solo')
  })

  it('D-80: a anotação da recusa que sobrou sai com a paga; a cancelada que a operadora mandar depois é dela', async () => {
    const c = cenario([ATIVA_PRE1], {
      // A tentativa de novo da mesma mensalidade passou, no mesmo dia da cobrança recusada.
      [AP]: [responde(200, RECUSADA), responde(200, PAGA)],
      [PRE]: [null, responde(200, { status: 'authorized', next_payment_date: '2026-12-06T13:00:00.000Z' }), responde(200, { ...AUTORIZADA, status: 'cancelled' })],
    })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(500)
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', encerrada_por: 'recusa', encerrada_em: '2026-11-06T13:00:00.000Z' })

    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', encerrada_por: null, encerrada_em: null, ultima_cobranca_paga: '2026-11-06T13:00:00.000Z' })

    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: recusa sem cancelar', 'mensalidade paga', 'assinatura cancelada'])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', encerrada_por: 'operadora', encerrada_em: AGORA.toISOString() })
  })

  it('a paga mais velha que a recusa anotada não tira a anotação; só a ativa perde a anotação', async () => {
    const marcada = { ...ATIVA_PRE1, encerrada_por: 'recusa', encerrada_em: '2026-11-06T13:00:00.000Z' }
    const velha = await avisoDaMensalidade([marcada], { [AP]: [responde(200, { ...PAGA, debit_date: '2026-10-06T13:00:00.000Z' })] })
    expect(velha.resultado).toBe('mensalidade paga')
    expect(velha.c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-10-06T13:00:00.000Z', encerrada_por: 'recusa', encerrada_em: '2026-11-06T13:00:00.000Z' })

    const pendente = await avisoDaMensalidade([{ ...marcada, status: 'pendente' }], { [AP]: [responde(200, PAGA)] })
    expect(pendente.c.assinaturas.get('u1')).toMatchObject({ ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', encerrada_por: 'recusa' })

    // A mesma paga já anotada, de novo: a anotação ainda sai (nada mais a gravar não impede).
    const jaAnotada = await avisoDaMensalidade([{ ...marcada, ultima_cobranca_paga: '2026-11-06T13:00:00.000Z' }], { [AP]: [responde(200, PAGA)] })
    expect(jaAnotada.resultado).toBe('mensalidade paga')
    expect(jaAnotada.c.assinaturas.get('u1')).toMatchObject({ encerrada_por: null, encerrada_em: null, proxima_cobranca: '2026-11-06T15:00:00.000Z' })
  })

  it('D-80: o banco falha antes de cancelar lá: 500 e nada sai para a operadora; na volta, corta', async () => {
    for (const consulta of ['lerDaOperadora', 'mudar'] as const) {
      const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)] })
      c.falhar(consulta, 1)
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c)), consulta).toBe(500)
      expect(c.avisos[0]?.resultado, consulta).toBe('falha: banco')
      expect(puts(c), consulta).toEqual([])
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c)), consulta).toBe(200)
      expect(c.avisos[1]?.resultado, consulta).toBe(CORTADA)
      expect(c.assinaturas.get('u1'), consulta).toMatchObject(CORTADA_NA_LINHA)
    }
  })

  it('D-80: cancelou lá e o banco falhou: 500; na volta do aviso, termina sem erro', async () => {
    const c = cenario([ATIVA_PRE1], {
      [AP]: [responde(200, RECUSADA)],
      [PUT]: [responde(200), responde(400)],
      [PRE]: [responde(200, { ...AUTORIZADA, status: 'cancelled' })],
    })
    let falhasQueRestam = 1
    // Só a gravação do corte (a que muda o status) falha, uma vez.
    const banco: DependenciasDoWebhook['banco'] = {
      ...c.banco,
      mudar: (conta, id, mudanca) =>
        mudanca.status === 'cancelada' && falhasQueRestam-- > 0
          ? Promise.resolve({ linhas: 0, falha: { mensagem: 'banco fora', codigo: null } })
          : c.banco.mudar(conta, id, mudanca),
    }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), banco })).toBe(500)
    expect(c.assinaturas.get('u1')?.status).toBe('ativa')
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), banco })).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: banco', CORTADA])
    expect(c.assinaturas.get('u1')).toMatchObject(CORTADA_NA_LINHA)
    // Na volta, o PUT é recusado (já cancelada lá), a leitura confirma e o corte é gravado.
    expect(puts(c).map((p) => p.corpo)).toEqual([{ status: 'cancelled' }, { status: 'cancelled' }, { status: 'canceled' }])
  })

  it('a linha que mudou entre ler e gravar (0 linhas): 500, e na volta vale o CB-98', async () => {
    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)] })
    const banco: DependenciasDoWebhook['banco'] = {
      ...c.banco,
      mudar: async (conta, id, mudanca) => {
        c.assinaturas.set('u1', linhaDe({ ...ATIVA_PRE1, preapproval_id: 'preNovo' }))
        return c.banco.mudar(conta, id, mudanca)
      },
    }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), banco })).toBe(500)
    expect(c.avisos[0]?.resultado).toBe('falha: linha mudou')
    expect(puts(c)).toEqual([])
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos[1]?.resultado).toBe('cancelada: recusa sem linha')
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'ativa', preapproval_id: 'preNovo', encerrada_por: null })
  })

  it('CA-405: mensalidade sem resposta da operadora responde 500; 404 é ignorado com 200', async () => {
    const casos: readonly [RespostaDaOperadora | null, number, string][] = [
      [null, 500, 'falha: operadora fora'],
      [responde(500), 500, 'falha: operadora fora'],
      [responde(503, null), 500, 'falha: operadora fora'],
      [responde(429), 500, 'falha: operadora fora'],
      [responde(401), 500, 'falha: credencial recusada'],
      [responde(403), 500, 'falha: credencial recusada'],
      [responde(404), 200, 'ignorado: mensalidade não existe na operadora'],
      [responde(400, { message: 'invalid id' }), 200, 'ignorado: mensalidade não existe na operadora'],
      [responde(200, null), 500, 'falha: resposta ilegível'],
    ]
    for (const [resposta, esperado, resultado] of casos) {
      const c = cenario([ATIVA_PRE1], { [AP]: [resposta], [PUT]: [responde(200)] })
      expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c)), resultado).toBe(esperado)
      expect(c.avisos[0]?.resultado).toBe(resultado)
      expect(c.ordem).toEqual([AP, 'anotarAviso', 'apagarAvisosAntesDe'])
      expect(c.assinaturas.get('u1')?.status).toBe('ativa')
    }
  })

  it('mensalidade agendada ou em análise é anotada e não muda nada', async () => {
    const casos: readonly [Readonly<Record<string, unknown>>, string][] = [
      [{ ...PAGA, status: 'scheduled', payment: undefined }, 'ignorado: mensalidade scheduled/?'],
      [{ ...PAGA, payment: { id: 1, status: 'in_process' } }, 'ignorado: mensalidade processed/in_process'],
      [{ ...PAGA, status: 'pending', payment: { status: 'pending' } }, 'ignorado: mensalidade pending/pending'],
      [{ ...PAGA, status: { x: 1 }, payment: null }, 'ignorado: mensalidade ?/?'],
    ]
    for (const [mensalidade, resultado] of casos) {
      const { c, status, resultado: anotado } = await avisoDaMensalidade([ATIVA_PRE1], { [AP]: [responde(200, mensalidade)], [PUT]: [responde(200)] })
      expect(status).toBe(200)
      expect(anotado).toBe(resultado)
      expect(c.ordem).toEqual([AP, 'anotarAviso', 'apagarAvisosAntesDe'])
    }
  })

  it('mensalidade sem preapproval_id é ignorada', async () => {
    for (const preapproval_id of [undefined, '', '  ', 42]) {
      const { c, status, resultado } = await avisoDaMensalidade([ATIVA_PRE1], { [AP]: [responde(200, { ...RECUSADA, preapproval_id })], [PUT]: [responde(200)] })
      expect(status).toBe(200)
      expect(resultado).toBe('ignorado: mensalidade sem assinatura')
      expect(c.ordem).toEqual([AP, 'anotarAviso', 'apagarAvisosAntesDe'])
    }
  })

  it('o registro da função nunca leva o corpo da operadora', async () => {
    const naoCancelou = await avisoDaMensalidade([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(500)] })
    const texto = JSON.stringify(naoCancelou.c.log.mock.calls)
    expect(naoCancelou.c.log).toHaveBeenCalled()
    expect(texto).not.toContain('cc_rejected')
    expect(texto).not.toContain('recycling')
  })
})

/** Uma promessa e quem a cumpre: põe dois avisos em paralelo na ordem que o teste escolhe. */
function sinal() {
  let cumprir: () => void = () => undefined
  const pronto = new Promise<void>((resolver) => {
    cumprir = () => resolver()
  })
  return { pronto, cumprir: () => cumprir() }
}

describe('a recusa e o aviso de "cancelada" da operadora que se cruzam (D-80, CA-393)', () => {
  const CANCELADA_LA = responde(200, { ...AUTORIZADA, status: 'cancelled' })

  it('o aviso de "cancelada" lê a linha antes de o corte gravar e grava depois dele: quem encerrou continua sendo a recusa', async () => {
    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)], [PRE]: [CANCELADA_LA] })
    const outroAvisoLeu = sinal()
    const corteTerminou = sinal()
    // O outro aviso (o da assinatura) chega à gravação e espera o corte terminar para gravar.
    const bancoDoOutroAviso: DependenciasDoWebhook['banco'] = {
      ...c.banco,
      mudar: async (conta, id, mudanca) => {
        outroAvisoLeu.cumprir()
        await corteTerminou.pronto
        return c.banco.mudar(conta, id, mudanca)
      },
    }
    const outros: Promise<StatusDoAviso>[] = []
    // Assim que a operadora cancela, ela manda o aviso da assinatura, tratado em paralelo.
    const operadora: Operadora = async (metodo, caminho, corpo) => {
      const resposta = await c.operadora(metodo, caminho, corpo)
      if (metodo === 'PUT' && outros.length === 0) {
        const outro = tratarAviso(aviso(ASSINATURA, 'pre1'), { ...deps(c), banco: bancoDoOutroAviso })
        outros.push(outro)
        await Promise.race([outroAvisoLeu.pronto, outro])
      }
      return resposta
    }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), operadora })).toBe(200)
    corteTerminou.cumprir()
    expect(await Promise.all(outros)).toEqual([200])
    expect(c.assinaturas.get('u1')).toMatchObject(CORTADA_NA_LINHA)
    expect(c.avisos.map((a) => a.resultado)).toEqual([CORTADA, 'assinatura cancelada (recusa)'])
  })

  it('o aviso de "cancelada" grava inteiro antes de o corte gravar: quem encerrou continua sendo a recusa', async () => {
    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], [PUT]: [responde(200)], [PRE]: [CANCELADA_LA] })
    const operadora: Operadora = async (metodo, caminho, corpo) => {
      const resposta = await c.operadora(metodo, caminho, corpo)
      if (metodo === 'PUT') expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
      return resposta
    }
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), { ...depsNoDia(c), operadora })).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject({ ...CORTADA_NA_LINHA, atualizado_em: NO_DIA.toISOString() })
    expect(c.avisos.map((a) => a.resultado)).toEqual(['assinatura cancelada (recusa)', CORTADA])
  })

  it('a resposta do cancelamento se perdeu (500 aqui) e o aviso de "cancelada" chega antes da volta: encerrada por recusa, sem período', async () => {
    const c = cenario([{ ...ATIVA_PRE1, expira_em: '2026-12-01T02:59:59.000Z' }], {
      [AP]: [responde(200, RECUSADA)],
      [PUT]: [null],
      // A confirmação do corte também se perde; a leitura do aviso da assinatura, não.
      [PRE]: [null, CANCELADA_LA],
    })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(500)
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c))).toBe(200)
    expect(c.assinaturas.get('u1')).toMatchObject(CORTADA_NA_LINHA)
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), AGORA).plano).toBe('free')
    // A volta do aviso da mensalidade não muda nada.
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.avisos.map((a) => a.resultado)).toEqual(['falha: recusa sem cancelar', 'assinatura cancelada (recusa)', 'sem mudança: já cancelada'])
    expect(c.assinaturas.get('u1')).toMatchObject(CORTADA_NA_LINHA)
  })
})

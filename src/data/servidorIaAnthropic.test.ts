// @vitest-environment node
// A porta da Anthropic (spec assistente-ia, D-1317; CA-2312 a CA-2316), com um fetch de mentira: o corpo e os cabeçalhos
// do pedido, a leitura do fluxo e o que cada falha vira.
import {
  API_DA_ANTHROPIC,
  BETA_DA_TROCA,
  criarModeloAnthropic,
  esforcoDoAmbiente,
  MAX_TOKENS,
  modeloDoAmbiente,
  montarMensagemDoFluxo,
  PRAZO_DA_IA_MS,
  VERSAO_DA_API,
} from '../../supabase/functions/_shared/iaAnthropic.ts'
import { CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import type { ChamadaDaIa } from '../../supabase/functions/_shared/iaPortas.ts'
import { ESQUEMA_RESPOSTA, REGRAS_IA } from '../../supabase/functions/_shared/iaPrompt.ts'
import { fluxoSse } from './servidorIaFalsos.test-utils.ts'

const CHAMADA: ChamadaDaIa = {
  modelo: 'claude-opus-5-5',
  esforco: 'medium',
  mensagem: '<pedido modo="gerar">…</pedido>',
  usuario: 'a1b2c3',
  naoUsar: [],
  refeicoes: [],
  modo: 'gerar',
}

interface Pedido {
  readonly url: string
  readonly init: RequestInit
}

function buscarQueResponde(resposta: () => Response | Promise<Response>): { readonly buscar: typeof fetch; readonly pedidos: Pedido[] } {
  const pedidos: Pedido[] = []
  const buscar = (async (url: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(url), init: init ?? {} })
    return resposta()
  }) as typeof fetch
  return { buscar, pedidos }
}

const JSON_OK = '{"refeicoes":[],"mudancas":[],"pontosAConfirmar":[]}'

describe('CA-2312: o pedido à API', () => {
  it('POST com a chave, a versão, o fluxo, o esquema, os EUA, o cache no catálogo e a troca automática', async () => {
    const { buscar, pedidos } = buscarQueResponde(() => new Response(fluxoSse({ texto: JSON_OK })))
    await criarModeloAnthropic('chave-de-teste', { prazoMs: 1000 }, buscar)(CHAMADA)
    expect(pedidos).toHaveLength(1)
    const [pedido] = pedidos
    expect(pedido?.url).toBe(API_DA_ANTHROPIC)
    expect(pedido?.init.method).toBe('POST')
    expect(pedido?.init.headers).toEqual({ 'content-type': 'application/json', 'x-api-key': 'chave-de-teste', 'anthropic-version': VERSAO_DA_API, 'anthropic-beta': BETA_DA_TROCA })
    expect(pedido?.init.signal).toBeInstanceOf(AbortSignal)
    const corpo = JSON.parse(String(pedido?.init.body)) as Record<string, unknown>
    expect(corpo).toEqual({
      model: 'claude-opus-5-5',
      max_tokens: MAX_TOKENS,
      stream: true,
      system: [
        { type: 'text', text: REGRAS_IA },
        { type: 'text', text: CATALOGO_IA, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: CHAMADA.mensagem }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: JSON.parse(JSON.stringify(ESQUEMA_RESPOSTA)) } },
      inference_geo: 'us',
      metadata: { user_id: 'a1b2c3' },
      fallbacks: 'default',
    })
    expect(MAX_TOKENS).toBe(32_000)
    expect(PRAZO_DA_IA_MS).toBe(110_000)
    expect(corpo).not.toHaveProperty('thinking')
    expect(corpo).not.toHaveProperty('temperature')
  })

  it('no Haiku não vão a troca automática nem o cabeçalho dela; o esforço low vai como veio', async () => {
    const { buscar, pedidos } = buscarQueResponde(() => new Response(fluxoSse({ texto: JSON_OK })))
    await criarModeloAnthropic('k', { prazoMs: 1000 }, buscar)({ ...CHAMADA, modelo: 'claude-haiku-5-5', esforco: 'low' })
    const corpo = JSON.parse(String(pedidos[0]?.init.body)) as Record<string, unknown>
    expect(corpo).not.toHaveProperty('fallbacks')
    expect(corpo['output_config']).toMatchObject({ effort: 'low' })
    expect(pedidos[0]?.init.headers).not.toHaveProperty('anthropic-beta')
  })

  it('IA_MODELO aceita só os três modelos; IA_ESFORCO só low e medium', () => {
    expect(modeloDoAmbiente(undefined)).toBe('claude-opus-5-5')
    expect(modeloDoAmbiente(' claude-sonnet-5-5 ')).toBe('claude-sonnet-5-5')
    expect(modeloDoAmbiente('claude-haiku-5-5')).toBe('claude-haiku-5-5')
    expect(modeloDoAmbiente('claude-opus-4-1')).toBe('claude-opus-5-5')
    expect(esforcoDoAmbiente('low')).toBe('low')
    expect(esforcoDoAmbiente('max')).toBe('medium')
    expect(esforcoDoAmbiente(undefined)).toBe('medium')
  })
})

describe('a leitura do fluxo', () => {
  it('junta o texto dos blocos text (o pensamento e o bloco da troca ficam de fora) e soma os tokens do início e do fim', () => {
    const m = montarMensagemDoFluxo(fluxoSse({ texto: JSON_OK, pensamento: true, partes: 3 }), 'claude-opus-5-5')
    expect(m.texto).toBe(JSON_OK)
    expect(m.stopReason).toBe('end_turn')
    expect(m.erro).toBeNull()
    expect(m.tokens).toEqual([{ modelo: 'claude-opus-5-5', entrada: 1500, cacheGravados: 0, cacheLidos: 10_000, saida: 6000 }])
  })

  it('CB-1316: com a troca automática, um item de tokens por modelo que rodou', () => {
    const m = montarMensagemDoFluxo(
      fluxoSse({
        texto: JSON_OK,
        modelo: 'claude-opus-5',
        iteracoes: [
          { type: 'message', input_tokens: 11_500, output_tokens: 0 },
          { type: 'fallback_message', input_tokens: 11_500, output_tokens: 5000, cache_read_input_tokens: 0 },
        ],
      }),
      'claude-opus-5-5',
    )
    expect(m.modelo).toBe('claude-opus-5')
    expect(m.tokens).toEqual([
      { modelo: 'claude-opus-5-5', entrada: 11_500, cacheGravados: 0, cacheLidos: 0, saida: 0 },
      { modelo: 'claude-opus-5', entrada: 11_500, cacheGravados: 0, cacheLidos: 0, saida: 5000 },
    ])
  })
})

describe('o que cada fim vira', () => {
  const chamar = (resposta: () => Response | Promise<Response>) => criarModeloAnthropic('k', { prazoMs: 1000 }, buscarQueResponde(resposta).buscar)(CHAMADA)

  it('end_turn: ok, com o texto e o modelo', async () => {
    expect(await chamar(() => new Response(fluxoSse({ texto: JSON_OK })))).toMatchObject({ tipo: 'ok', texto: JSON_OK, modelo: 'claude-opus-5-5' })
  })

  it('CA-2313: refusal vira recusa, com a categoria e os tokens', async () => {
    const r = await chamar(() => new Response(fluxoSse({ texto: '', parada: 'refusal', categoria: 'bio' })))
    expect(r).toMatchObject({ tipo: 'recusa', categoria: 'bio' })
  })

  it('CA-2314: max_tokens vira cortada', async () => {
    expect(await chamar(() => new Response(fluxoSse({ texto: '{"refeicoes":[', parada: 'max_tokens' })))).toMatchObject({ tipo: 'cortada', motivo: 'max_tokens' })
  })

  it('CA-2316: evento de erro no meio do fluxo, ou fluxo sem fim, vira erro-fluxo', async () => {
    expect(await chamar(() => new Response(fluxoSse({ texto: '{"ref', erroNoMeio: 'overloaded_error' })))).toMatchObject({ tipo: 'erro-fluxo', erro: 'overloaded_error' })
    expect(await chamar(() => new Response(fluxoSse({ texto: '{"ref', semFim: true })))).toMatchObject({ tipo: 'erro-fluxo', erro: 'fluxo incompleto' })
  })

  it('CA-2316: erro HTTP vira erro-http com o status e só o tipo do erro', async () => {
    const corpo = JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'detalhe que não vai para o registro' } })
    expect(await chamar(() => new Response(corpo, { status: 429 }))).toEqual({ tipo: 'erro-http', status: 429, erro: 'rate_limit_error' })
    expect(await chamar(() => new Response('não é json', { status: 529 }))).toEqual({ tipo: 'erro-http', status: 529, erro: null })
  })

  it('CA-2315: o prazo estourado vira demorou; a rede caída, sem-rede', async () => {
    expect(await chamar(() => Promise.reject(new DOMException('tempo', 'TimeoutError')))).toEqual({ tipo: 'demorou' })
    expect(await chamar(() => Promise.reject(new TypeError('fetch failed')))).toEqual({ tipo: 'sem-rede' })
  })

  it('CA-2315: o prazo vale também enquanto o fluxo é lido', async () => {
    const lento = new ReadableStream<Uint8Array>({ start() {} })
    const r = await criarModeloAnthropic('k', { prazoMs: 30 }, buscarQueResponde(() => new Response(lento)).buscar)(CHAMADA)
    expect(r).toEqual({ tipo: 'demorou' })
  })
})

// A porta do modelo de verdade: a Messages API da Anthropic, chamada por `fetch`, sem o SDK (spec assistente-ia, D-1317:
// decisão do dono, nenhuma dependência nova). Usa só o fetch e o AbortSignal padrão: roda no Deno e no Node, e o Vitest
// testa com um fetch de mentira (src/data/servidorIaAnthropic.test.ts). A chave chega de fora e só vai no cabeçalho.
//
// O pedido vai com `stream: true`: o fluxo mantém a conexão viva enquanto o modelo pensa, e a função lê aos poucos e
// junta a mensagem no fim (DP-IA-5). Prazo de 110 s, sem nova tentativa. O que foi visto do fluxo serve para estimar o
// custo quando a chamada é cortada (D-1329). O sinal do pedido, se a plataforma o abortar, para a chamada (D-1330).
import { MAX_TOKENS, tokensDoCorte } from './iaCusto.ts'
import { CATALOGO_DO_PROMPT, ESQUEMA_RESPOSTA, REGRAS_IA } from './iaPrompt.ts'
import type { ChamadaDaIa, EsforcoDaIa, ModeloDaIa, ModeloDeIa, RespostaDoModelo, TokensDoModelo } from './iaPortas.ts'

export { MAX_TOKENS }

export const API_DA_ANTHROPIC = 'https://api.anthropic.com/v1/messages'
export const VERSAO_DA_API = '2026-10-21'
/** A troca automática por outro modelo quando o filtro recusa por engano (`fallbacks: "default"`). */
export const BETA_DA_TROCA = 'server-side-fallback-2026-07-01'
export const PRAZO_DA_IA_MS = 110_000

export const MODELOS_ACEITOS: readonly ModeloDeIa[] = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']
export const MODELO_PADRAO: ModeloDeIa = 'claude-opus-5-5'
export const ESFORCO_PADRAO: EsforcoDaIa = 'medium'

/** `IA_MODELO`: só os três da lista; qualquer outro valor (ou nenhum) usa o padrão. */
export const modeloDoAmbiente = (valor: string | undefined): ModeloDeIa => MODELOS_ACEITOS.find((m) => m === valor?.trim()) ?? MODELO_PADRAO

/** `IA_ESFORCO`: `low` ou `medium`; outro valor usa o padrão. */
export const esforcoDoAmbiente = (valor: string | undefined): EsforcoDaIa => (valor?.trim() === 'low' ? 'low' : ESFORCO_PADRAO)

/** O Haiku não tem a troca automática do servidor (D-1317). */
export const temTrocaAutomatica = (modelo: ModeloDeIa): boolean => modelo !== 'claude-haiku-5-5'

/** O corpo do pedido (CA-2312): regras e catálogo fixos, com o cache no fim do catálogo; o pedido do paciente depois. */
export function corpoDoPedido(chamada: ChamadaDaIa): Readonly<Record<string, unknown>> {
  return {
    model: chamada.modelo,
    max_tokens: MAX_TOKENS,
    stream: true,
    system: [
      { type: 'text', text: REGRAS_IA },
      { type: 'text', text: CATALOGO_DO_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: chamada.mensagem }],
    output_config: { effort: chamada.esforco, format: { type: 'json_schema', schema: ESQUEMA_RESPOSTA } },
    inference_geo: 'us',
    metadata: { user_id: chamada.usuario },
    ...(temTrocaAutomatica(chamada.modelo) ? { fallbacks: 'default' } : {}),
  }
}

export function cabecalhosDoPedido(chave: string, modelo: ModeloDeIa): Readonly<Record<string, string>> {
  return {
    'content-type': 'application/json',
    'x-api-key': chave,
    'anthropic-version': VERSAO_DA_API,
    ...(temTrocaAutomatica(modelo) ? { 'anthropic-beta': BETA_DA_TROCA } : {}),
  }
}

// ---------- O fluxo (SSE) ----------

const objeto = (v: unknown): Readonly<Record<string, unknown>> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const inteiro = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0)
const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null)

/** Os eventos do fluxo, na ordem: cada um é o JSON do `data:`. Linha que não é JSON é ignorada. */
export function eventosDoFluxo(corpo: string): readonly Readonly<Record<string, unknown>>[] {
  const eventos: Readonly<Record<string, unknown>>[] = []
  for (const bloco of corpo.split(/\r?\n\r?\n/)) {
    const dados = bloco
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n')
    if (dados === '') continue
    try {
      const evento = objeto(JSON.parse(dados))
      if (evento) eventos.push(evento)
    } catch {
      // Um pedaço que não é JSON (comentário, linha quebrada) não muda a mensagem.
    }
  }
  return eventos
}

interface UsoBruto {
  readonly entrada: number
  readonly cacheGravados: number
  readonly cacheLidos: number
  readonly saida: number
}

const usoDe = (u: Readonly<Record<string, unknown>>): UsoBruto => ({
  entrada: inteiro(u['input_tokens']),
  cacheGravados: inteiro(u['cache_creation_input_tokens']),
  cacheLidos: inteiro(u['cache_read_input_tokens']),
  saida: inteiro(u['output_tokens']),
})

export interface MensagemDoFluxo {
  readonly modelo: string | null
  readonly texto: string
  readonly stopReason: string | null
  readonly categoriaDaRecusa: string | null
  readonly tokens: readonly TokensDoModelo[]
  /** O tipo do erro do evento `error`, ou "fluxo incompleto" sem `message_stop`; nulo quando terminou bem. */
  readonly erro: string | null
}

/**
 * A mensagem montada a partir dos eventos: o modelo que respondeu, o texto dos blocos `text`, o motivo da parada e os
 * tokens. Com `usage.iterations` (a troca automática rodou), um item por modelo que rodou: `message` é o modelo pedido,
 * `fallback_message` o que respondeu, quando o item não diz o modelo.
 *
 * D-1333: com a troca no meio do fluxo, o `message_start` nomeia o modelo pedido. Vale o `model` do último
 * `fallback_message` de `usage.iterations`; sem ele, o `to.model` do último bloco `fallback`; sem os dois, o do início.
 */
export function montarMensagemDoFluxo(corpo: string, modeloPedido: string): MensagemDoFluxo {
  let modelo: string | null = null
  let trocaPara: string | null = null
  let stopReason: string | null = null
  let categoria: string | null = null
  let erro: string | null = null
  let terminou = false
  let usoInicio: Readonly<Record<string, unknown>> = {}
  let usoFim: Readonly<Record<string, unknown>> = {}
  const blocos = new Map<number, { tipo: string; texto: string }>()

  for (const evento of eventosDoFluxo(corpo)) {
    switch (evento['type']) {
      case 'message_start': {
        const mensagem = objeto(evento['message'])
        modelo = texto(mensagem?.['model']) ?? modelo
        usoInicio = objeto(mensagem?.['usage']) ?? {}
        break
      }
      case 'content_block_start': {
        const bloco = objeto(evento['content_block'])
        blocos.set(inteiro(evento['index']), { tipo: texto(bloco?.['type']) ?? '', texto: texto(bloco?.['text']) ?? '' })
        if (bloco?.['type'] === 'fallback') trocaPara = texto(objeto(bloco['to'])?.['model']) ?? trocaPara
        break
      }
      case 'content_block_delta': {
        const delta = objeto(evento['delta'])
        const bloco = blocos.get(inteiro(evento['index']))
        if (bloco && bloco.tipo === 'text' && delta?.['type'] === 'text_delta') bloco.texto += texto(delta['text']) ?? ''
        break
      }
      case 'message_delta': {
        const delta = objeto(evento['delta'])
        stopReason = texto(delta?.['stop_reason']) ?? stopReason
        categoria = texto(objeto(delta?.['stop_details'])?.['category']) ?? categoria
        usoFim = { ...usoFim, ...(objeto(evento['usage']) ?? {}) }
        break
      }
      case 'message_stop':
        terminou = true
        break
      case 'error':
        erro = texto(objeto(evento['error'])?.['type']) ?? 'erro'
        break
      default:
        break
    }
  }

  const uso = { ...usoInicio, ...usoFim }
  const iteracoes = Array.isArray(uso['iterations']) ? uso['iterations'].map(objeto).filter((i): i is Readonly<Record<string, unknown>> => i !== null) : []
  const daTroca = [...iteracoes].reverse().find((i) => i['type'] === 'fallback_message')
  modelo = texto(daTroca?.['model']) ?? trocaPara ?? modelo
  const quemRespondeu = modelo ?? modeloPedido
  const tokens: TokensDoModelo[] =
    iteracoes.length > 0
      ? iteracoes.map((i) => ({ modelo: texto(i['model']) ?? (i['type'] === 'fallback_message' ? quemRespondeu : modeloPedido), ...usoDe(i) }))
      : [{ modelo: quemRespondeu, ...usoDe(uso) }]
  const textoFinal = [...blocos.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, b]) => b.tipo === 'text')
    .map(([, b]) => b.texto)
    .join('')

  return { modelo, texto: textoFinal, stopReason, categoriaDaRecusa: categoria, tokens, erro: erro ?? (terminou ? null : 'fluxo incompleto') }
}

/** O fim da mensagem vira a resposta do modelo: a recusa e a parada fora do fim vêm antes do texto. */
export function respostaDoFluxo(mensagem: MensagemDoFluxo, modeloPedido: string): RespostaDoModelo {
  const modelo = mensagem.modelo ?? modeloPedido
  if (mensagem.stopReason === 'refusal') return { tipo: 'recusa', modelo, tokens: mensagem.tokens, categoria: mensagem.categoriaDaRecusa }
  if (mensagem.erro !== null) return { tipo: 'erro-fluxo', erro: mensagem.erro, modelo: mensagem.modelo, tokens: mensagem.tokens }
  if (mensagem.stopReason !== 'end_turn' && mensagem.stopReason !== 'stop_sequence') {
    return { tipo: 'cortada', modelo, tokens: mensagem.tokens, motivo: mensagem.stopReason ?? 'sem motivo' }
  }
  return { tipo: 'ok', texto: mensagem.texto, modelo, tokens: mensagem.tokens }
}

export interface OpcoesDoModelo {
  readonly prazoMs: number
  /** O relógio em ms, para medir quanto o fluxo correu antes de um corte (D-1329); padrão `performance.now`. */
  readonly relogio?: () => number
}

/** A rejeição de um sinal abortado: o motivo dele, ou o erro de prazo. */
const motivoDoSinal = (sinal: AbortSignal): Error => (sinal.reason instanceof Error ? sinal.reason : new DOMException('Prazo da IA', 'TimeoutError'))

/**
 * D-1329: lê o fluxo aos poucos e entrega cada pedaço a `guardar`, para o que já chegou valer mesmo se a leitura for
 * cortada. O sinal (prazo ou cancelamento) vale durante toda a leitura: abortado, para de ler e rejeita.
 */
async function lerFluxo(resposta: Response, sinal: AbortSignal, guardar: (pedaco: string) => void): Promise<void> {
  const corpo = resposta.body
  if (!corpo) {
    guardar(await resposta.text())
    return
  }
  const leitor = corpo.getReader()
  const decodificador = new TextDecoder()
  let parar: () => void = () => undefined
  const abortado = new Promise<never>((_, rejeitar) => {
    parar = () => rejeitar(motivoDoSinal(sinal))
    if (sinal.aborted) parar()
    else sinal.addEventListener('abort', parar, { once: true })
  })
  abortado.catch(() => undefined)
  try {
    for (;;) {
      const { done, value } = await Promise.race([leitor.read(), abortado])
      if (done) break
      guardar(decodificador.decode(value, { stream: true }))
    }
    guardar(decodificador.decode())
  } finally {
    sinal.removeEventListener('abort', parar)
    if (sinal.aborted) leitor.cancel().catch(() => undefined)
  }
}

const ehPrazo = (erro: unknown): boolean => erro instanceof Error && (erro.name === 'TimeoutError' || erro.name === 'AbortError')

/**
 * CA-2312 a CA-2316, CA-2382 e CA-2383: o pedido à API e a leitura do fluxo. Nunca lança: o que deu errado vira um tipo.
 * No corte (prazo, rede, erro no fluxo ou cancelamento pelo navegador), os tokens são os vistos mais a estimativa.
 */
export function criarModeloAnthropic(chave: string, opcoes: OpcoesDoModelo = { prazoMs: PRAZO_DA_IA_MS }, buscar: typeof fetch = fetch): ModeloDaIa {
  const relogio = opcoes.relogio ?? (() => performance.now())
  return async (chamada) => {
    const prazo = AbortSignal.timeout(opcoes.prazoMs)
    // D-1330: o sinal do pedido abortado e o prazo param a chamada do mesmo jeito.
    const sinal = chamada.sinal ? AbortSignal.any([chamada.sinal, prazo]) : prazo
    let corpo = ''
    let inicioDoFluxo: number | null = null
    const tokensAteAqui = (vistos: readonly TokensDoModelo[] | null): readonly TokensDoModelo[] =>
      tokensDoCorte({ vistos, modelo: chamada.modelo, mensagem: chamada.mensagem, msDeFluxo: inicioDoFluxo === null ? 0 : relogio() - inicioDoFluxo })
    try {
      const resposta = await buscar(API_DA_ANTHROPIC, {
        method: 'POST',
        headers: { ...cabecalhosDoPedido(chave, chamada.modelo) },
        body: JSON.stringify(corpoDoPedido(chamada)),
        signal: sinal,
      })
      if (!resposta.ok) {
        const erro: unknown = await resposta.json().catch(() => null)
        return { tipo: 'erro-http', status: resposta.status, erro: texto(objeto(objeto(erro)?.['error'])?.['type']) }
      }
      inicioDoFluxo = relogio()
      await lerFluxo(resposta, sinal, (pedaco) => {
        corpo += pedaco
      })
      const r = respostaDoFluxo(montarMensagemDoFluxo(corpo, chamada.modelo), chamada.modelo)
      return r.tipo === 'erro-fluxo' ? { ...r, tokens: tokensAteAqui(r.tokens) } : r
    } catch (erro) {
      const visto = montarMensagemDoFluxo(corpo, chamada.modelo)
      const corte = { modelo: visto.modelo ?? chamada.modelo, tokens: tokensAteAqui(visto.modelo !== null ? visto.tokens : null) }
      if (chamada.sinal?.aborted) return { tipo: 'cancelada', ...corte }
      return { tipo: ehPrazo(erro) || prazo.aborted ? 'demorou' : 'sem-rede', ...corte }
    }
  }
}

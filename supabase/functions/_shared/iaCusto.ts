// O custo das chamadas à IA (spec assistente-ia, D-1319, D-1329 e D-1334): a tabela de preços da página oficial e a
// estimativa conservadora da chamada cortada (prazo, rede, erro no fluxo ou cancelamento), para o teto do dia enxergar
// também o que não chegou inteiro. Puro: sem Deno, sem rede e sem relógio.
import type { TokensDoModelo } from './iaPortas.ts'
import { CATALOGO_DO_PROMPT, REGRAS_IA } from './iaPrompt.ts'

/** O EUA custa 10% a mais (`inference_geo: "us"`, D-1317), em todas as categorias de token. */
export const FATOR_DOS_EUA = 1.1

export interface PrecoDoModelo {
  /** Dólares por milhão de tokens. */
  readonly entrada: number
  /** Gravação do cache de 5 minutos. */
  readonly cacheGravacao: number
  readonly cacheLeitura: number
  readonly saida: number
}

/**
 * D-1334: os preços da página oficial (platform.claude.com/docs/en/about-claude/pricing), conferidos em 03/11/2026. A
 * leitura de cache do Opus 5.5 e do Sonnet 5.5 é 0,05× da entrada; nos outros, 0,1×. O Opus 5, o Opus 4.8 e o Sonnet 5
 * são os que a troca automática usa. Modelo fora da tabela usa o mais caro dela.
 */
export const PRECOS: Readonly<Record<string, PrecoDoModelo>> = {
  'claude-opus-5-5': { entrada: 4, cacheGravacao: 5, cacheLeitura: 0.2, saida: 20 },
  'claude-sonnet-5-5': { entrada: 2, cacheGravacao: 2.5, cacheLeitura: 0.1, saida: 10 },
  'claude-sonnet-5': { entrada: 2, cacheGravacao: 2.5, cacheLeitura: 0.2, saida: 10 },
  'claude-haiku-5-5': { entrada: 0.1, cacheGravacao: 0.125, cacheLeitura: 0.01, saida: 0.5 },
  'claude-opus-5': { entrada: 5, cacheGravacao: 6.25, cacheLeitura: 0.5, saida: 25 },
  'claude-opus-4-8': { entrada: 5, cacheGravacao: 6.25, cacheLeitura: 0.5, saida: 25 },
}
const PRECO_DESCONHECIDO: PrecoDoModelo = { entrada: 5, cacheGravacao: 6.25, cacheLeitura: 0.5, saida: 25 }

/**
 * CA-2319: o custo em microdólares. Tokens × dólares por milhão dá microdólares; soma cada modelo que rodou e põe os
 * 10% dos EUA. O modo falso (modelo "falso") não custa nada.
 */
export function custoEmMicrodolares(tokens: readonly TokensDoModelo[]): number {
  let total = 0
  for (const t of tokens) {
    if (t.modelo === 'falso') continue
    const p = PRECOS[t.modelo] ?? PRECO_DESCONHECIDO
    total += t.entrada * p.entrada + t.cacheGravados * p.cacheGravacao + t.cacheLidos * p.cacheLeitura + t.saida * p.saida
  }
  return Math.round(total * FATOR_DOS_EUA)
}

/** O `max_tokens` do pedido (D-1317): a saída estimada nunca passa dele. */
export const MAX_TOKENS = 32_000
/** D-1329: a saída estimada de uma chamada cortada, por segundo de fluxo. Acima do que os modelos escrevem: superestima. */
export const SAIDA_ESTIMADA_POR_SEGUNDO = 150
/** D-1329: sem o `message_start`, a entrada é estimada pelo tamanho do texto, a 3 caracteres por token (superestima). */
export const CARACTERES_POR_TOKEN = 3

/** A entrada estimada do pedido inteiro (regras, catálogo e a mensagem), sem cache. */
export function entradaEstimada(mensagem: string): number {
  return Math.ceil((REGRAS_IA.length + CATALOGO_DO_PROMPT.length + mensagem.length) / CARACTERES_POR_TOKEN)
}

export interface CorteDaChamada {
  /** Os tokens que o fluxo mostrou antes do corte (o `message_start` e, se veio, o `message_delta`); nulo sem eles. */
  readonly vistos: readonly TokensDoModelo[] | null
  readonly modelo: string
  readonly mensagem: string
  /** Quanto tempo o fluxo correu antes do corte, em ms (0 se nem começou). */
  readonly msDeFluxo: number
}

/**
 * D-1329 e CA-2382: os tokens de uma chamada cortada, nunca zero. A entrada e o cache são os vistos (ou a estimativa pelo
 * tamanho); a saída é a maior entre a vista e 150 tokens por segundo de fluxo, até o `max_tokens`.
 */
export function tokensDoCorte(c: CorteDaChamada): readonly TokensDoModelo[] {
  const vistos = c.vistos && c.vistos.some((t) => t.entrada + t.cacheGravados + t.cacheLidos > 0) ? c.vistos : null
  const base: TokensDoModelo[] = vistos ? vistos.map((t) => ({ ...t })) : [{ modelo: c.modelo, entrada: entradaEstimada(c.mensagem), cacheGravados: 0, cacheLidos: 0, saida: 0 }]
  const saidaEstimada = Math.min(MAX_TOKENS, Math.ceil((Math.max(0, c.msDeFluxo) / 1000) * SAIDA_ESTIMADA_POR_SEGUNDO))
  const ultimo = base[base.length - 1]
  if (ultimo) base[base.length - 1] = { ...ultimo, saida: Math.max(ultimo.saida, saidaEstimada) }
  return base
}

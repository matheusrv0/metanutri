// O que o núcleo da função sugerir-plano recebe de fora (spec assistente-ia, D-1316): o banco, o modelo, o relógio e o
// registro. O index.ts liga os de verdade (iaSupabase.ts e iaAnthropic.ts, ou iaFalsa.ts no modo falso); os testes, os
// de mentira (src/data/servidorIaFalsos.test-utils.ts). Só tipos: sem Deno e sem rede.
import type { ModoIa } from './iaContrato.ts'

// ---------- O modelo ----------

export type ModeloDeIa = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'
export type EsforcoDaIa = 'low' | 'medium'

export interface ChamadaDaIa {
  readonly modelo: ModeloDeIa
  readonly esforco: EsforcoDaIa
  /** A mensagem do usuário, montada do pedido limpo (iaPrompt.ts). */
  readonly mensagem: string
  /** O resumo da conta para `metadata.user_id`: nunca o id. */
  readonly usuario: string
  /** Só no modo falso: os ids que o pedido proíbe e as refeições, para a resposta pronta. */
  readonly naoUsar: readonly number[]
  readonly refeicoes: readonly { readonly nome: string; readonly horario: string }[]
  readonly modo: ModoIa
  /** D-1330: o sinal do pedido; se a plataforma o abortar, a chamada à IA para (hoje o edge-runtime não aborta). */
  readonly sinal?: AbortSignal
}

/** Os tokens de um modelo que rodou na chamada (com a troca automática, pode ser mais de um). */
export interface TokensDoModelo {
  readonly modelo: string
  readonly entrada: number
  readonly cacheGravados: number
  readonly cacheLidos: number
  readonly saida: number
}

export type RespostaDoModelo =
  | { readonly tipo: 'ok'; readonly texto: string; readonly modelo: string; readonly tokens: readonly TokensDoModelo[] }
  | { readonly tipo: 'recusa'; readonly modelo: string; readonly tokens: readonly TokensDoModelo[]; readonly categoria: string | null }
  /** Cortada no `max_tokens` (ou parada por outro motivo que não é o fim): o JSON não vale. */
  | { readonly tipo: 'cortada'; readonly modelo: string; readonly tokens: readonly TokensDoModelo[]; readonly motivo: string }
  /** A API respondeu com erro HTTP antes do fluxo. Só o tipo do erro, nunca a mensagem inteira. */
  | { readonly tipo: 'erro-http'; readonly status: number; readonly erro: string | null }
  /** O fluxo trouxe um evento de erro ou terminou no meio. */
  /** O fluxo trouxe um evento de erro ou terminou no meio; os tokens já vêm com a estimativa do corte (D-1329). */
  | { readonly tipo: 'erro-fluxo'; readonly erro: string; readonly modelo: string | null; readonly tokens: readonly TokensDoModelo[] }
  /**
   * D-1329 e D-1330: a chamada cortada pelo prazo, pela rede ou pelo sinal do pedido (`cancelada`). A porta de verdade manda os
   * tokens vistos mais a estimativa; sem eles, o núcleo estima pelo tamanho do pedido e pela duração.
   */
  | { readonly tipo: 'demorou' | 'sem-rede' | 'cancelada'; readonly modelo?: string; readonly tokens?: readonly TokensDoModelo[] }

export type ModeloDaIa = (chamada: ChamadaDaIa) => Promise<RespostaDoModelo>

// ---------- O banco ----------

export interface ContaParaIa {
  /** A linha de perfis; nula sem perfil. */
  readonly perfil: { readonly situacao: string; readonly crnStatus: string | null } | null
  /** Estudante: tem um pedido de estudante aprovado. */
  readonly pedidoAprovado: boolean
  /** A linha de assinaturas; nula sem assinatura. */
  readonly assinatura: { readonly plano: string; readonly status: string; readonly expiraEm: string | null } | null
}

export type Reserva = { readonly reserva: number } | { readonly motivo: 'limite-mes' | 'limite-hora' }

export interface ConclusaoDoUso {
  readonly status: 'ok' | 'recusa' | 'erro'
  readonly modelo: string | null
  readonly entrada: number
  readonly cacheGravados: number
  readonly cacheLidos: number
  readonly saida: number
  readonly custoMicrodolares: number
  readonly duracaoMs: number
  /** D-1329: o custo é estimado (chamada cortada), não o que a API devolveu. */
  readonly custoEstimado: boolean
}

/**
 * As consultas da função. As leituras e a reserva rejeitam quando o banco não responde (a função responde que a IA está
 * indisponível, sem chamar a IA); `concluir` não rejeita: a falha só vai para o registro.
 */
export interface BancoDaIa {
  lerConta(conta: string): Promise<ContaParaIa>
  /** D-1347: a ficha `pacienteId` da cópia da conta tem a autorização para o uso de IA (só o sim ou não). */
  consentimentoNaFicha(conta: string, pacienteId: string): Promise<boolean>
  reservar(conta: string, modo: ModoIa, limiteMes: number, inicioDoMes: Date, limiteHora: number): Promise<Reserva>
  concluir(reserva: number, conclusao: ConclusaoDoUso): Promise<void>
  usosNoMes(conta: string, inicioDoMes: Date): Promise<number>
  /** O custo, em microdólares, de todas as contas desde `desde`. */
  custoDesde(desde: Date): Promise<number>
}

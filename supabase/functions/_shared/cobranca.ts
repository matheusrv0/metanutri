// O que as funções de cobrança (assinar, gerenciar-assinatura e webhook-mercadopago)
// fazem igual: traduzir o estado da operadora, ler o cartão que o navegador manda,
// calcular as datas, entender a recusa (spec checkout-proprio), guardar a tabela de preços
// e fazer as leituras de dado de fora (spec cobranca-em-producao).
//
// Tudo aqui é puro, sem Deno e sem rede, para o Vitest conferir direto
// (src/data/cobrancaServidor.test.ts). O navegador importa as duas contas de data, para a
// tela dizer a mesma data que a função grava (src/domain/assinaturaTextos.ts).
// A pasta começa com "_": o Supabase não publica como função, só empacota junto.

export type StatusDaAssinatura = 'ativa' | 'pausada' | 'cancelada' | 'pendente'

/** Estado do Mercado Pago → o que o MetaNutri grava. A documentação em português escreve "canceled"; a API, "cancelled". Os dois valem. */
export function traduzirStatus(status: unknown): StatusDaAssinatura {
  if (status === 'authorized') return 'ativa'
  if (status === 'paused') return 'pausada'
  if (status === 'cancelled' || status === 'canceled') return 'cancelada'
  return 'pendente'
}

export interface CartaoInformado {
  readonly bandeira: string
  readonly final: string
}

/** D-70: a bandeira e os 4 últimos números que o navegador manda. Qualquer outra coisa é recusada. */
export function lerCartao(valor: unknown): CartaoInformado | null {
  if (typeof valor !== 'object' || valor === null) return null
  const { bandeira, final } = valor as { readonly bandeira?: unknown; readonly final?: unknown }
  if (typeof bandeira !== 'string' || typeof final !== 'string') return null
  const limpa = bandeira.trim()
  if (limpa.length < 1 || limpa.length > 40 || !/^[\p{L}\p{N} .&-]+$/u.test(limpa)) return null
  if (!/^\d{4}$/.test(final)) return null
  return { bandeira: limpa, final }
}

/** O valor, se for um objeto JSON (não lista); senão nulo. Tudo o que vem da operadora passa por aqui. */
export const objeto = (valor: unknown): Readonly<Record<string, unknown>> | null =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null

/** A data em ISO, se for data de verdade; senão nulo. */
export function dataOuNula(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const ms = Date.parse(valor)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** O código de uso único do cartão, se tiver o formato que a operadora usa. */
export const tokenDoCartao = (valor: unknown): string | null => (typeof valor === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(valor) ? valor : null)

export type PlanoAssinavel = 'solo' | 'pro'
export type CicloDaAssinatura = 'mensal' | 'anual'
export const ehCicloDaAssinatura = (valor: unknown): valor is CicloDaAssinatura => valor === 'mensal' || valor === 'anual'

/**
 * Os planos que se assina pelo site, com o preço que o servidor considera verdade (CA-375). Igual à
 * página de Preços (src/domain/conta.ts): um teste confere.
 */
export const PLANOS_DO_SERVIDOR: Readonly<Record<PlanoAssinavel, { readonly nome: string; readonly mensal: number; readonly anual: number }>> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}

/** O plano, só se for chave da própria tabela: "constructor" ou "toString" não sobem pelo protótipo. */
export const planoAssinavel = (valor: unknown): PlanoAssinavel | null =>
  typeof valor === 'string' && Object.hasOwn(PLANOS_DO_SERVIDOR, valor) ? (valor as PlanoAssinavel) : null

/** A frequência, em meses, que a operadora usa para cada ciclo. */
export const FREQUENCIA: Readonly<Record<CicloDaAssinatura, 1 | 12>> = { mensal: 1, anual: 12 }

/** Os planos que se paga: com um deles ativo, a conta já tem assinatura paga. */
export const PAGOS: readonly string[] = ['solo', 'pro', 'clinica']

/**
 * D-85 e R-39: o plano e o ciclo de uma assinatura pelo valor e pela frequência. Só acha se um único
 * plano da tabela tiver esse valor nesse ciclo; nenhum ou mais de um é nulo (não adota por palpite).
 */
export function planoPeloValor(valor: unknown, frequencia: unknown, tipoDaFrequencia: unknown): { readonly plano: PlanoAssinavel; readonly ciclo: CicloDaAssinatura } | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null
  if (tipoDaFrequencia !== undefined && tipoDaFrequencia !== 'months') return null
  const ciclo: CicloDaAssinatura | null = frequencia === 1 ? 'mensal' : frequencia === 12 ? 'anual' : null
  if (!ciclo) return null
  const centavos = Math.round(valor * 100)
  const achados = (Object.keys(PLANOS_DO_SERVIDOR) as PlanoAssinavel[]).filter((p) => Math.round(PLANOS_DO_SERVIDOR[p][ciclo] * 100) === centavos)
  const [plano] = achados
  return achados.length === 1 && plano ? { plano, ciclo } : null
}

export const UM_DIA_MS = 24 * 60 * 60 * 1000
/** Brasília é UTC−3 o ano todo: o Brasil não tem horário de verão desde 2019. */
const BRASILIA_MS = 3 * 60 * 60 * 1000

/** A data em ISO, se for data de verdade e passar do limite; senão nulo. */
export function dataDepoisDe(valor: unknown, limiteMs: number): string | null {
  if (typeof valor !== 'string') return null
  const ms = Date.parse(valor)
  return Number.isNaN(ms) || ms <= limiteMs ? null : new Date(ms).toISOString()
}

/**
 * A próxima cobrança prevista: o mesmo dia, um ciclo depois, no calendário de Brasília.
 * Dia que não existe no mês do alvo (31 de fevereiro) vira o último dia dele.
 */
export function previsaoDaProximaCobranca(agora: Date, ciclo: 'mensal' | 'anual'): string {
  const local = new Date(agora.getTime() - BRASILIA_MS)
  const ano = local.getUTCFullYear()
  const mes = local.getUTCMonth()
  const meses = ciclo === 'anual' ? 12 : 1
  const ultimoDia = new Date(Date.UTC(ano, mes + meses + 1, 0)).getUTCDate()
  const alvo = Date.UTC(ano, mes + meses, Math.min(local.getUTCDate(), ultimoDia), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds())
  return new Date(alvo + BRASILIA_MS).toISOString()
}

/** CA-378: o plano pago vale até 23h59min59s, em Brasília, do dia anterior à próxima cobrança. */
export function fimDoPeriodoPago(proximaCobranca: string): string | null {
  const ms = Date.parse(proximaCobranca)
  if (Number.isNaN(ms)) return null
  const diaEmBrasilia = Math.floor((ms - BRASILIA_MS) / UM_DIA_MS)
  return new Date(diaEmBrasilia * UM_DIA_MS + BRASILIA_MS - 1000).toISOString()
}

/**
 * O motivo de uma recusa da operadora, lido sem confiar no formato (não confirmado na
 * documentação): junta `message`, `status_detail`, `error`, `code` e cada `cause`.
 *  - `cc_rejected_*`: o código do banco, como veio, em minúsculas;
 *  - `token-invalido`: o código de uso único do cartão venceu ou já foi usado (CB-90);
 *  - `recusado`: recusa do cartão sem motivo conhecido;
 *  - `falha`: outra coisa (configuração, conta de teste). Quem chama registra.
 */
export function codigoDaRecusa(corpo: unknown): string {
  const textos: string[] = []
  const juntar = (valor: unknown) => {
    if (typeof valor === 'string') textos.push(valor)
    else if (typeof valor === 'number') textos.push(String(valor))
  }
  if (typeof corpo === 'object' && corpo !== null) {
    const o = corpo as Record<string, unknown>
    for (const chave of ['message', 'status_detail', 'error', 'code']) juntar(o[chave])
    const causa = o['cause']
    for (const item of Array.isArray(causa) ? causa : causa === undefined ? [] : [causa]) {
      if (typeof item === 'object' && item !== null) {
        juntar((item as Record<string, unknown>)['code'])
        juntar((item as Record<string, unknown>)['description'])
      } else {
        juntar(item)
      }
    }
  }
  const tudo = textos.join(' ')
  const doBanco = /cc_rejected_[a-z_]+/i.exec(tudo)
  if (doBanco) return doBanco[0].toLowerCase()
  if (/card[\s_-]*token/i.test(tudo)) return 'token-invalido'
  if (/CC_VAL_\d+|rejected|declined|card/i.test(tudo)) return 'recusado'
  return 'falha'
}

/** A frase de reserva; a tela troca pela do código (src/domain/cartao.ts). */
export const RECUSA_PADRAO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
/** CA-374: a operadora não respondeu. */
export const SEM_COBRANCA = 'Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.'

/**
 * D-97: o navegador só deixa o site do MetaNutri chamar as funções. O supabase-js manda
 * `apikey` e `x-client-info` em todo pedido: sem eles aqui, o navegador barra antes.
 */
export const CABECALHOS = {
  'Access-Control-Allow-Origin': 'https://metanutri.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
} as const

export const responder = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status, headers: CABECALHOS })

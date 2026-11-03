// O núcleo da função sugerir-plano (spec assistente-ia, D-1316 a D-1320). Puro: o banco, o modelo, o relógio e o
// registro chegam de fora (src/data/servidorIa.test.ts). Ordem de cada pedido:
//   1. sessão; 2. formato e autorização do paciente; 3. quem pode usar e o plano da assinatura; 4. o modo `uso` responde
//   o contador; 5. o teto de gasto do dia; 6. a reserva atômica do uso (mês e hora); 7. a chamada à IA; 8. a conferência
//   do JSON; 9. a conclusão do uso, com tokens e custo.
// O registro nunca leva o corpo do pedido, o texto da resposta nem o id da conta (CA-2320).
import { IDS_DO_CATALOGO_IA } from './iaCatalogo.ts'
import {
  conferirResposta,
  inicioDoMesEmBrasilia,
  LIMITE_DE_SUGESTOES_IA,
  LIMITE_DE_SUGESTOES_IA_POR_HORA,
  limparPedido,
  renovaEm,
  textoDoLimite,
  type PedidoDeSugestao,
  type PlanoDaConta,
  type UsoDoMes,
} from './iaContrato.ts'
import type { BancoDaIa, ConclusaoDoUso, ContaParaIa, EsforcoDaIa, ModeloDaIa, ModeloDeIa, RespostaDoModelo, TokensDoModelo } from './iaPortas.ts'
import { montarMensagem } from './iaPrompt.ts'
import { PEDIDO_INVALIDO, respostaDeErro as erro, type ContaQuePede, type Registro, type RespostaDaFuncao } from './portas.ts'

export const SEM_SESSAO_IA = 'Entre na sua conta para usar a IA.'
export const SEM_CONSENTIMENTO = 'Registre na ficha a autorização do paciente.'
export const SEM_PERFIL_IA = 'Complete o cadastro da conta para usar a IA.'
export const SEM_CRN_IA = 'A IA está bloqueada até você corrigir o CRN, no painel.'
export const ESTUDANTE_SEM_APROVACAO = 'A IA abre quando o pedido de estudante for aprovado.'
export const RECUSA_DA_IA = 'A IA não respondeu a este pedido. Mude o texto do pedido e tente de novo.'
export const IA_DEMOROU = 'A sugestão demorou demais. Tente de novo; esta não conta no limite.'
export const IA_INDISPONIVEL = 'As sugestões com IA estão indisponíveis agora. Tente mais tarde.'
export const MUITAS_SUGESTOES = 'Muitas sugestões seguidas. Espere alguns minutos e tente de novo.'

const UM_DIA_MS = 24 * 60 * 60 * 1000
/** O EUA custa 10% a mais (`inference_geo: "us"`, D-1317). */
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
 * DP-IA-6: os preços da página oficial, conferidos pela skill da API em 03/11/2026. O Opus 5 e o Opus 4.8 são os que a
 * troca automática usa. Modelo fora da tabela usa o mais caro dela.
 */
export const PRECOS: Readonly<Record<string, PrecoDoModelo>> = {
  'claude-opus-5-5': { entrada: 4, cacheGravacao: 5, cacheLeitura: 0.2, saida: 20 },
  'claude-sonnet-5-5': { entrada: 2, cacheGravacao: 2.5, cacheLeitura: 0.2, saida: 10 },
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

/** `IA_TETO_DIARIO_USD`: um número maior que zero; sem ele, ou inválido, US$ 5 (D-1318). */
export function tetoDoAmbiente(valor: string | undefined): number {
  const n = Number(valor?.trim() || Number.NaN)
  return Number.isFinite(n) && n > 0 ? n : 5
}

const somar = (tokens: readonly TokensDoModelo[], campo: 'entrada' | 'cacheGravados' | 'cacheLidos' | 'saida'): number => tokens.reduce((s, t) => s + t[campo], 0)

/** CA-2307: o plano que vale, como no limite de links: ativo e não vencido, ou pago cancelado ainda no período. */
export function planoVigente(assinatura: ContaParaIa['assinatura'], agora: Date): PlanoDaConta {
  if (!assinatura || !Object.hasOwn(LIMITE_DE_SUGESTOES_IA, assinatura.plano)) return 'free'
  const plano = assinatura.plano as PlanoDaConta
  const expira = assinatura.expiraEm === null ? null : Date.parse(assinatura.expiraEm)
  if (assinatura.status === 'ativa' && (expira === null || expira >= agora.getTime())) return plano
  if (assinatura.status === 'cancelada' && ['solo', 'pro', 'clinica'].includes(plano) && expira !== null && expira > agora.getTime()) return plano
  return 'free'
}

/** D-1305: quem pode usar. Nulo quando pode; senão, a resposta 403. */
export function quemNaoPode(conta: ContaParaIa): RespostaDaFuncao | null {
  const perfil = conta.perfil
  if (perfil === null) return erro(SEM_PERFIL_IA, 403, 'sem-perfil')
  if (perfil.situacao === 'nutricionista') {
    return perfil.crnStatus === 'em_conferencia' || perfil.crnStatus === 'conferido' ? null : erro(SEM_CRN_IA, 403, 'sem-crn')
  }
  if (perfil.situacao === 'estudante') return conta.pedidoAprovado ? null : erro(ESTUDANTE_SEM_APROVACAO, 403, 'estudante-sem-aprovacao')
  return erro(SEM_PERFIL_IA, 403, 'sem-perfil')
}

/** O resumo da conta que vai em `metadata.user_id`: a Anthropic trata abuso sem saber quem é (D-1317). */
export async function resumoDaConta(conta: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`metanutri-ia:${conta}`))
  return [...new Uint8Array(bytes)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface PedidoDaIa {
  readonly conta: ContaQuePede | null
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
}

export interface DependenciasDaIa {
  readonly banco: BancoDaIa
  readonly modelo: ModeloDaIa
  readonly modeloId: ModeloDeIa
  readonly esforco: EsforcoDaIa
  /** `IA_TETO_DIARIO_USD`: o gasto de todas as contas nas últimas 24 h que deixa a IA indisponível. */
  readonly tetoDiarioUsd: number
  readonly agora: () => Date
  readonly log: Registro
}

const mensagemDe = (falha: unknown): string => (falha instanceof Error ? falha.message : String(falha))

const IDS_DO_CATALOGO: ReadonlySet<number> = new Set(IDS_DO_CATALOGO_IA)

export async function sugerirPlano(pedido: PedidoDaIa, dep: DependenciasDaIa): Promise<RespostaDaFuncao> {
  if (!pedido.conta) return erro(SEM_SESSAO_IA, 401, 'sem-sessao')
  const conta = pedido.conta.id

  const lido = limparPedido(pedido.corpo)
  if (!lido.ok) return lido.codigo === 'sem-consentimento' ? erro(SEM_CONSENTIMENTO, 403, 'sem-consentimento') : erro(PEDIDO_INVALIDO, 400, 'pedido-invalido')

  let dados: ContaParaIa
  try {
    dados = await dep.banco.lerConta(conta)
  } catch (falha) {
    dep.log('IA: não consegui ler a conta:', mensagemDe(falha))
    return erro(IA_INDISPONIVEL, 503, 'indisponivel')
  }
  const barrado = quemNaoPode(dados)
  if (barrado) return barrado

  const agora = dep.agora()
  const limite = LIMITE_DE_SUGESTOES_IA[planoVigente(dados.assinatura, agora)]
  const inicio = inicioDoMesEmBrasilia(agora)
  const usoCom = (usados: number): UsoDoMes => ({ usados, limite, renovaEm: renovaEm(agora) })

  if (lido.pedido.modo === 'uso') {
    try {
      return { status: 200, corpo: { uso: usoCom(await dep.banco.usosNoMes(conta, inicio)) } }
    } catch (falha) {
      dep.log('IA: não consegui contar o uso do mês:', mensagemDe(falha))
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    }
  }
  const sugestao: PedidoDeSugestao = lido.pedido

  // CA-2310: o teto de gasto do dia, de todas as contas, antes de reservar.
  try {
    const gasto = await dep.banco.custoDesde(new Date(agora.getTime() - UM_DIA_MS))
    if (gasto >= dep.tetoDiarioUsd * 1_000_000) {
      dep.log('IA: teto de gasto do dia atingido; a IA não foi chamada. Gasto em microdólares:', gasto)
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    }
  } catch (falha) {
    dep.log('IA: não consegui somar o gasto do dia:', mensagemDe(falha))
    return erro(IA_INDISPONIVEL, 503, 'indisponivel')
  }

  // CA-2308, CA-2309 e CA-2323: contar e anotar num passo só, no banco.
  let reserva: number
  try {
    const r = await dep.banco.reservar(conta, sugestao.modo, limite, inicio, LIMITE_DE_SUGESTOES_IA_POR_HORA)
    if ('motivo' in r) {
      dep.log('IA: limite da conta; a IA não foi chamada. Motivo:', r.motivo)
      return r.motivo === 'limite-mes'
        ? { status: 429, corpo: { erro: textoDoLimite(limite, agora), codigo: 'limite-mes', uso: usoCom(limite) } }
        : erro(MUITAS_SUGESTOES, 429, 'limite-hora')
    }
    reserva = r.reserva
  } catch (falha) {
    dep.log('IA: não consegui reservar o uso:', mensagemDe(falha))
    return erro(IA_INDISPONIVEL, 503, 'indisponivel')
  }

  const inicioDaChamada = dep.agora().getTime()
  const resposta: RespostaDoModelo = await dep.modelo({
    modelo: dep.modeloId,
    esforco: dep.esforco,
    mensagem: montarMensagem(sugestao),
    usuario: await resumoDaConta(conta),
    naoUsar: sugestao.naoUsar,
    refeicoes: sugestao.refeicoes,
    modo: sugestao.modo,
  })
  const duracaoMs = Math.max(0, dep.agora().getTime() - inicioDaChamada)

  const concluir = async (status: ConclusaoDoUso['status'], modelo: string | null, tokens: readonly TokensDoModelo[]) => {
    const conclusao: ConclusaoDoUso = {
      status,
      modelo,
      entrada: somar(tokens, 'entrada'),
      cacheGravados: somar(tokens, 'cacheGravados'),
      cacheLidos: somar(tokens, 'cacheLidos'),
      saida: somar(tokens, 'saida'),
      custoMicrodolares: custoEmMicrodolares(tokens),
      duracaoMs,
    }
    // CA-2320: só o modo, o resultado, o modelo, os tokens e a duração.
    dep.log('IA:', sugestao.modo, status, modelo ?? '-', `entrada ${conclusao.entrada}`, `cache lido ${conclusao.cacheLidos}`, `saída ${conclusao.saida}`, `${duracaoMs} ms`)
    await dep.banco.concluir(reserva, conclusao)
  }

  switch (resposta.tipo) {
    case 'recusa':
      await concluir('recusa', resposta.modelo, resposta.tokens)
      dep.log('IA: recusa. Categoria:', resposta.categoria ?? '-')
      return erro(RECUSA_DA_IA, 422, 'recusa')
    case 'cortada':
      await concluir('erro', resposta.modelo, resposta.tokens)
      dep.log('IA: resposta parada antes do fim:', resposta.motivo)
      return erro(IA_INDISPONIVEL, 502, 'resposta-invalida')
    case 'erro-http':
      await concluir('erro', null, [])
      dep.log('IA: a API respondeu', resposta.status, resposta.erro ?? '-')
      return resposta.status === 429 ? erro(MUITAS_SUGESTOES, 429, 'ocupado') : erro(IA_INDISPONIVEL, 503, 'indisponivel')
    case 'erro-fluxo':
      await concluir('erro', resposta.modelo, resposta.tokens)
      dep.log('IA: o fluxo falhou:', resposta.erro)
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    case 'demorou':
      await concluir('erro', null, [])
      return erro(IA_DEMOROU, 504, 'demorou')
    case 'sem-rede':
      await concluir('erro', null, [])
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    case 'ok':
      break
  }

  const conferida = conferirResposta(resposta.texto, {
    modo: sugestao.modo,
    refeicoes: sugestao.refeicoes.length,
    idsPermitidos: new Set([...IDS_DO_CATALOGO, ...sugestao.meusAlimentos.map((a) => a.id)]),
    plano: sugestao.plano,
  })
  if (!conferida.ok) {
    await concluir('erro', resposta.modelo, resposta.tokens)
    dep.log('IA: o JSON não passou:', conferida.motivo)
    return erro(IA_INDISPONIVEL, 502, 'resposta-invalida')
  }

  await concluir('ok', resposta.modelo, resposta.tokens)
  const corpo = { resposta: conferida.resposta, foraDaBase: conferida.foraDaBase }
  try {
    return { status: 200, corpo: { ...corpo, uso: usoCom(await dep.banco.usosNoMes(conta, inicio)) } }
  } catch (falha) {
    // A sugestão vale; o navegador relê o contador pelo modo uso.
    dep.log('IA: não consegui contar o uso do mês:', mensagemDe(falha))
    return { status: 200, corpo }
  }
}

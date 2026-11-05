// O núcleo da função sugerir-plano (spec assistente-ia, D-1316 a D-1320). Puro: o banco, o modelo, o relógio e o
// registro chegam de fora (src/data/servidorIa.test.ts). Ordem de cada pedido:
//   1. sessão; 2. formato e autorização declarada; 3. quem pode usar e o plano da assinatura; 4. o modo `uso` responde
//   o contador; 5. a autorização gravada na ficha (D-1347); 6. o teto de gasto do dia; 7. a reserva atômica do uso (mês
//   e hora); 8. a chamada à IA; 9. a conferência do JSON; 10. a conclusão do uso, com tokens e custo.
// O registro nunca leva o corpo do pedido, o texto da resposta nem o id da conta (CA-2320).
import { IDS_DO_CATALOGO_IA } from './iaCatalogo.ts'
import { custoEmMicrodolares, tokensDoCorte } from './iaCusto.ts'
import {
  conferirResposta,
  ESTUDANTE_SEM_APROVACAO,
  IA_CANCELADA,
  IA_DEMOROU,
  IA_INDISPONIVEL,
  MUITAS_SUGESTOES,
  RECUSA_DA_IA,
  SEM_CONSENTIMENTO,
  SEM_CRN_IA,
  SEM_PERFIL_IA,
  SEM_SESSAO_IA,
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

export { custoEmMicrodolares, FATOR_DOS_EUA, PRECOS, type PrecoDoModelo } from './iaCusto.ts'
export { ESTUDANTE_SEM_APROVACAO, IA_CANCELADA, IA_DEMOROU, IA_INDISPONIVEL, MUITAS_SUGESTOES, RECUSA_DA_IA, SEM_CONSENTIMENTO, SEM_CRN_IA, SEM_PERFIL_IA, SEM_SESSAO_IA }

const UM_DIA_MS = 24 * 60 * 60 * 1000
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
  /** D-1330: o sinal do pedido (`req.signal`). Se a plataforma o abortar, a chamada à IA para; o edge-runtime de hoje não aborta. */
  readonly sinal?: AbortSignal
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

  // CA-2399 e D-1347: a autorização gravada na ficha do paciente, na cópia da conta, antes de gastar qualquer coisa.
  const pacienteId = 'pacienteId' in lido ? lido.pacienteId : null
  if (pacienteId === null) return erro(SEM_CONSENTIMENTO, 403, 'sem-consentimento')
  try {
    if (!(await dep.banco.consentimentoNaFicha(conta, pacienteId))) {
      dep.log('IA: a ficha não tem a autorização do paciente; a IA não foi chamada.')
      return erro(SEM_CONSENTIMENTO, 403, 'sem-consentimento')
    }
  } catch (falha) {
    dep.log('IA: não consegui ler a autorização da ficha:', mensagemDe(falha))
    return erro(IA_INDISPONIVEL, 503, 'indisponivel')
  }

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

  const mensagem = montarMensagem(sugestao)
  const inicioDaChamada = dep.agora().getTime()
  const resposta: RespostaDoModelo = await dep.modelo({
    modelo: dep.modeloId,
    esforco: dep.esforco,
    mensagem,
    usuario: await resumoDaConta(conta),
    naoUsar: sugestao.naoUsar,
    refeicoes: sugestao.refeicoes,
    modo: sugestao.modo,
    ...(pedido.sinal ? { sinal: pedido.sinal } : {}),
  })
  const duracaoMs = Math.max(0, dep.agora().getTime() - inicioDaChamada)

  const concluir = async (status: ConclusaoDoUso['status'], modelo: string | null, tokens: readonly TokensDoModelo[], custoEstimado = false) => {
    const conclusao: ConclusaoDoUso = {
      status,
      modelo,
      entrada: somar(tokens, 'entrada'),
      cacheGravados: somar(tokens, 'cacheGravados'),
      cacheLidos: somar(tokens, 'cacheLidos'),
      saida: somar(tokens, 'saida'),
      custoMicrodolares: custoEmMicrodolares(tokens),
      duracaoMs,
      custoEstimado,
    }
    // CA-2320: só o modo, o resultado, o modelo, os tokens e a duração.
    dep.log('IA:', sugestao.modo, status, modelo ?? '-', `entrada ${conclusao.entrada}`, `cache lido ${conclusao.cacheLidos}`, `saída ${conclusao.saida}`, `${duracaoMs} ms`, custoEstimado ? 'custo estimado' : '')
    await dep.banco.concluir(reserva, conclusao)
  }

  /** D-1329: os tokens da chamada cortada; sem os da porta, a estimativa pelo pedido e pela duração. */
  const doCorte = (tokens: readonly TokensDoModelo[] | undefined): readonly TokensDoModelo[] =>
    tokens && tokens.length > 0 ? tokens : tokensDoCorte({ vistos: null, modelo: dep.modeloId, mensagem, msDeFluxo: duracaoMs })

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
      await concluir('erro', resposta.modelo ?? dep.modeloId, doCorte(resposta.tokens), true)
      dep.log('IA: o fluxo falhou:', resposta.erro)
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    // CA-2382: o corte gasta e é anotado com a estimativa; não conta no mês.
    case 'demorou':
      await concluir('erro', resposta.modelo ?? dep.modeloId, doCorte(resposta.tokens), true)
      return erro(IA_DEMOROU, 504, 'demorou')
    case 'sem-rede':
      await concluir('erro', resposta.modelo ?? dep.modeloId, doCorte(resposta.tokens), true)
      return erro(IA_INDISPONIVEL, 503, 'indisponivel')
    // D-1330: a plataforma abortou o sinal do pedido (hoje não acontece, D-1342); ninguém lê a resposta.
    case 'cancelada':
      await concluir('erro', resposta.modelo ?? dep.modeloId, doCorte(resposta.tokens), true)
      dep.log('IA: cancelada pelo navegador.')
      return erro(IA_CANCELADA, 499, 'cancelada')
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

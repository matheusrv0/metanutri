// Assina com o cartão, dentro do site (spec checkout-proprio, D-65 a D-68; spec
// cobranca-em-producao, D-85, D-86 e D-101). Puro: a operadora, o banco, o relógio e o registro chegam
// de fora (o index.ts liga os de verdade; src/data/servidorAssinar.test.ts, os de mentira).
//
// O preço sai de PLANOS_DO_SERVIDOR, nunca do navegador (CA-375). O número do cartão nunca passa por
// aqui: chega o código de uso único, mais a bandeira e os 4 últimos números para mostrar (D-70).
import {
  codigoDaRecusa,
  dataDepoisDe,
  FREQUENCIA,
  lerCartao,
  objeto,
  PAGOS,
  planoAssinavel,
  PLANOS_DO_SERVIDOR,
  previsaoDaProximaCobranca,
  RECUSA_PADRAO,
  SEM_COBRANCA,
  tokenDoCartao,
  traduzirStatus,
  UM_DIA_MS,
  type CicloDaAssinatura,
} from './cobranca.ts'
import { cancelarNaOperadora } from './operadora.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type ContaQuePede, type Operadora, type Registro, type RespostaDaFuncao } from './portas.ts'
import { anotarTentativaDeCartao, conferirTentativas, ehRecusaDoCartao, type BancoDasTentativas } from './tentativas.ts'

/** A reserva de uma função que morreu no meio vence em 5 minutos (008). */
export const RESERVA_VENCE_MS = 5 * 60_000
/** D-85: a assinatura procurada nasceu depois do começo do pedido, com esta folga para o relógio da operadora. */
export const FOLGA_DA_BUSCA_MS = 2 * 60_000
export const EM_ANDAMENTO = 'Já estamos confirmando uma assinatura desta conta. Confira em Conta e plano em um minuto.'
export const JA_ASSINA = 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.'
export const ANDAMENTO_NA_CONTA = 'Você já tem uma assinatura em andamento. Confira em Conta e plano.'

export interface PedidoDeAssinatura {
  /** Quem pede, lido do token da sessão; nulo sem sessão. */
  readonly conta: ContaQuePede | null
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
  /** Para onde a operadora devolveria a pessoa (back_url). */
  readonly site: string
}

export interface DependenciasDeAssinar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'gravar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas
  readonly agora: () => Date
  readonly log: Registro
}

export interface AssinaturaNaOperadora {
  readonly id: string
  readonly dados: Readonly<Record<string, unknown>>
}

export interface AlvoDaBusca {
  readonly email: string
  readonly conta: string
  readonly valor: number
  readonly frequencia: 1 | 12
  /** Em ms: a assinatura procurada nasceu depois disto. */
  readonly desde: number
}

/**
 * D-85 e CB-99: a assinatura que este pedido acabou de criar, pela busca da operadora. A busca não
 * filtra pela conta: filtra pelo e-mail, e cada resultado é conferido (a conta, o valor, a frequência
 * e a hora em que nasceu). A já cancelada não conta como achada (CA-402): sem a resposta do pedido, não
 * se sabe se foi o cartão. Entre as que conferem, vale a mais nova.
 */
export async function procurarAssinaturaRecente(operadora: Operadora, alvo: AlvoDaBusca): Promise<AssinaturaNaOperadora | null> {
  const busca = await operadora('GET', `/preapproval/search?payer_email=${encodeURIComponent(alvo.email)}&limit=50`)
  const resultados = busca?.ok ? busca.dados?.['results'] : undefined
  const lista: readonly unknown[] = Array.isArray(resultados) ? resultados : []
  const conferem: { readonly achada: AssinaturaNaOperadora; readonly nasceu: number }[] = []
  for (const item of lista) {
    const dados = objeto(item)
    if (!dados) continue
    const id = dados['id']
    const recorrencia = objeto(dados['auto_recurring'])
    const valor = recorrencia?.['transaction_amount']
    const criada = dados['date_created']
    const nasceu = typeof criada === 'string' ? Date.parse(criada) : Number.NaN
    if (typeof id !== 'string' || dados['external_reference'] !== alvo.conta) continue
    if (recorrencia?.['frequency'] !== alvo.frequencia || typeof valor !== 'number' || Math.round(valor * 100) !== Math.round(alvo.valor * 100)) continue
    if (!(nasceu >= alvo.desde) || traduzirStatus(dados['status']) === 'cancelada') continue
    conferem.push({ achada: { id, dados }, nasceu })
  }
  conferem.sort((a, b) => b.nasceu - a.nasceu)
  return conferem[0]?.achada ?? null
}

export async function assinar(pedido: PedidoDeAssinatura, deps: DependenciasDeAssinar): Promise<RespostaDaFuncao> {
  const conta = pedido.conta
  const email = conta?.email
  if (!conta || !email) return erro('Entre na sua conta antes de assinar.', 401)
  const corpo = objeto(pedido.corpo)
  if (!corpo) return erro('Corpo da requisição inválido.', 400)
  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const plano = planoAssinavel(corpo['plano'])
  if (!plano) return erro('Plano desconhecido.', 400)
  const ciclo: CicloDaAssinatura = corpo['ciclo'] === 'anual' ? 'anual' : 'mensal'
  const valor = PLANOS_DO_SERVIDOR[plano][ciclo]
  const cartaoToken = tokenDoCartao(corpo['card_token_id'])
  const cartao = lerCartao(corpo['cartao'])
  if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

  const uid = conta.id
  const inicio = deps.agora()
  // D-101: quem testa cartão roubado não chega à operadora. Antes da reserva: o portão fechado não prende a conta.
  const portao = await conferirTentativas(deps.banco, uid, inicio, deps.log)
  if (!portao.passa) return portao.resposta
  const seguidas = portao.seguidas

  // C1 (008): duas abas mandando juntas passariam as duas pela conferência abaixo. A reserva, uma
  // linha por conta, deixa um pedido só passar; a de uma função que morreu no meio vence em 5 minutos.
  const vencida = await deps.banco.soltarReservaVencida(uid, new Date(inicio.getTime() - RESERVA_VENCE_MS).toISOString())
  if (vencida) deps.log('Não consegui apagar a reserva vencida:', vencida.mensagem)
  const reserva = await deps.banco.reservar(uid, cartao)
  if (reserva) {
    if (reserva.codigo === '23505') return erro(EM_ANDAMENTO, 409)
    deps.log('Não consegui reservar a assinatura:', reserva.mensagem)
    return erro(SEM_COBRANCA, 502)
  }

  /** A recusa (402). R4: só a do cartão é anotada. CA-435: da segunda seguida em diante, sem o motivo do banco. */
  const recusar = async (codigo: string): Promise<RespostaDaFuncao> => {
    if (!ehRecusaDoCartao(codigo)) return erro(RECUSA_PADRAO, 402, codigo)
    await anotarTentativaDeCartao(deps.banco, uid, true, inicio, deps.log)
    return erro(RECUSA_PADRAO, 402, seguidas >= 1 ? 'recusado' : codigo)
  }

  // Sem resposta da operadora e sem achar a assinatura, a reserva fica até vencer: o aviso que adotar a
  // assinatura (D-85) lê o cartão dela, e um pedido novo nesse meio-tempo leva o 409 em vez de criar outra.
  let soltar = true
  try {
    const { linha: atual, falha } = await deps.banco.lerDaConta(uid)
    if (falha) {
      deps.log('Não consegui conferir a assinatura atual:', falha.mensagem)
      return erro('Não consegui conferir sua assinatura agora. Tente de novo em alguns minutos.', 502)
    }
    // CB-91: quem já paga não assina de novo por aqui. A cancelada, mesmo no prazo, pode (CA-380).
    if (atual?.status === 'ativa' && PAGOS.includes(atual.plano)) return erro(JA_ASSINA, 409)
    // Pendente ou pausada do fluxo do cartão também existe na operadora: assinar de novo criaria uma segunda.
    if (atual && (atual.status === 'pendente' || atual.status === 'pausada') && atual.preapproval_id && atual.cartao_final !== null) return erro(ANDAMENTO_NA_CONTA, 409)

    const frequencia = FREQUENCIA[ciclo]
    const resposta = await deps.operadora('POST', '/preapproval', {
      reason: `${PLANOS_DO_SERVIDOR[plano].nome} (${ciclo})`,
      external_reference: uid,
      payer_email: email,
      card_token_id: cartaoToken,
      // D-68: criada já autorizada; o banco confere o cartão agora e a primeira cobrança cai em até uma hora (D-82).
      status: 'authorized',
      back_url: pedido.site,
      auto_recurring: { frequency: frequencia, frequency_type: 'months', transaction_amount: valor, currency_id: 'BRL' },
    })

    if (resposta && !resposta.ok && resposta.status < 500) {
      const codigo = codigoDaRecusa(resposta.dados)
      deps.log('A operadora recusou a assinatura:', resposta.status, codigo)
      // 401/403 é a nossa credencial; 429, excesso de pedidos. Falha nossa, nunca recusa do cartão (402).
      if (resposta.status === 401 || resposta.status === 403 || resposta.status === 429) return erro(SEM_COBRANCA, 502)
      return await recusar(codigo)
    }

    let criada: AssinaturaNaOperadora | null = null
    const idDaResposta = resposta?.dados?.['id']
    if (resposta?.ok && resposta.dados && typeof idDaResposta === 'string') criada = { id: idDaResposta, dados: resposta.dados }
    else {
      // D-85 (CA-402): sem resposta, erro do lado dela ou sucesso sem id. A assinatura pode ter nascido lá.
      deps.log('Resposta incerta ao assinar; procurando a assinatura na operadora:', resposta?.status ?? 'sem resposta')
      criada = await procurarAssinaturaRecente(deps.operadora, { email, conta: uid, valor, frequencia, desde: inicio.getTime() - FOLGA_DA_BUSCA_MS })
      if (!criada) {
        soltar = false
        return erro(SEM_COBRANCA, 502)
      }
    }

    const { id, dados } = criada
    const status = traduzirStatus(dados['status'])
    // D-86 (CA-403): sucesso com a assinatura cancelada ou pausada não vale. Conta como recusa, e a
    // pausada sai da operadora para não voltar a cobrar sozinha.
    if (status === 'cancelada' || status === 'pausada') {
      deps.log('A operadora devolveu a assinatura sem valer:', status, id)
      if (status === 'pausada' && !(await cancelarNaOperadora(deps.operadora, id))) deps.log('CANCELAMENTO FALHOU: assinatura pausada ficou na operadora; cancelar à mão:', id)
      return await recusar('recusado')
    }

    // A data de hoje é a primeira cobrança, ainda por cair: a próxima é a do ciclo seguinte.
    const proxima = dataDepoisDe(dados['next_payment_date'], inicio.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(inicio, ciclo)
    const falhaGravar = await deps.banco.gravar({
      nutricionista_id: uid,
      plano,
      status,
      preapproval_id: id,
      valor_centavos: Math.round(valor * 100),
      ciclo,
      // CB-95: assinatura paga não vence por data, então substitui o Estudante na hora.
      expira_em: null,
      cartao_bandeira: cartao.bandeira,
      cartao_final: cartao.final,
      proxima_cobranca: proxima,
      // Assinatura nova: nada da anterior vale (a recusa, o fim e a última mensalidade paga, D-81).
      ultima_cobranca_paga: null,
      encerrada_por: null,
      encerrada_em: null,
      atualizado_em: inicio.toISOString(),
    })
    if (falhaGravar) {
      // A assinatura existe lá e não aqui: cancela lá para ninguém pagar sem ter o plano.
      deps.log('Assinatura criada e não gravada; cancelando na operadora:', id, falhaGravar.mensagem)
      if (!(await cancelarNaOperadora(deps.operadora, id))) deps.log('CANCELAMENTO FALHOU: assinatura ficou ativa na operadora sem plano aqui; cancelar à mão:', id)
      return erro(SEM_COBRANCA, 502)
    }
    // R4: o sucesso zera as recusas seguidas. Anotado depois de gravar, para não atrasar a gravação.
    await anotarTentativaDeCartao(deps.banco, uid, false, inicio, deps.log)
    return { status: 200, corpo: { status, proximaCobranca: proxima, cartao } }
  } finally {
    if (soltar) {
      const naoSoltou = await deps.banco.soltarReserva(uid)
      if (naoSoltou) deps.log('Não consegui soltar a reserva da assinatura (ela vence em 5 minutos):', naoSoltou.mensagem)
    }
  }
}

// Diz o que vai acontecer se cancelar, cancela e troca o cartão, sem sair do site (spec
// checkout-proprio, D-69; spec cobranca-em-producao, D-81 e D-101). Puro: a operadora, o banco, o
// relógio e o registro chegam de fora (src/data/servidorGerenciar.test.ts).
//
// D-81: só ganha "vale até o fim do período" quem já teve ao menos uma mensalidade cobrada. A prévia
// (que a janela de cancelar mostra) e o cancelamento usam a mesma conta, desfechoDoCancelamento.
// D-101: só a troca de cartão passa pelo portão das tentativas; a prévia e o cancelamento, não.
import {
  codigoDaRecusa,
  dataDepoisDe,
  dataOuNula,
  fimDoPeriodoPago,
  lerCartao,
  objeto,
  PAGOS,
  RECUSA_PADRAO,
  tokenDoCartao,
  traduzirStatus,
  UM_DIA_MS,
} from './cobranca.ts'
import { cancelarNaOperadora } from './operadora.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type ContaQuePede, type LinhaDaAssinatura, type Operadora, type Registro, type RespostaDaFuncao } from './portas.ts'
import { anotarTentativaDeCartao, conferirTentativas, ehRecusaDoCartao, type BancoDasTentativas } from './tentativas.ts'

/** A operadora não respondeu: nada mudou lá nem aqui. */
export const FORA = 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.'
export const GRAVADA_LA_SO = 'A assinatura foi cancelada, mas não consegui mostrar aqui. Abra Conta e plano de novo em alguns minutos.'

export interface PedidoDeGerenciar {
  /** Quem pede, lido do token da sessão; nulo sem sessão. */
  readonly conta: ContaQuePede | null
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
}

export interface DependenciasDeGerenciar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar'> & BancoDasTentativas
  readonly agora: () => Date
  readonly log: Registro
}

export interface Desfecho {
  /** Já houve ao menos uma mensalidade cobrada. */
  readonly cobrada: boolean
  /** Até quando o plano pago vale depois de cancelar; nulo é Free na hora. */
  readonly expiraEm: string | null
}

/**
 * D-81: o que cancelar agora faz. "Cobrada" vale se a operadora disser (`charged_quantity` ou
 * `last_charged_date`) ou se o aviso de uma mensalidade paga já foi anotado aqui (D-83). Cobrada,
 * vale até a véspera da próxima cobrança: a da operadora (se ela ainda não tinha cancelado) ou a
 * gravada aqui. Como na assinar e no webhook, a data só conta se passar de amanhã.
 */
export function desfechoDoCancelamento(linha: LinhaDaAssinatura, daOperadora: Readonly<Record<string, unknown>> | null, jaCanceladaLa: boolean, agora: Date): Desfecho {
  // Pendente e pausada não pagaram período: voltam ao Free na hora.
  if (linha.status !== 'ativa') return { cobrada: false, expiraEm: null }
  const resumo = objeto(daOperadora?.['summarized'])
  const quantas = resumo?.['charged_quantity']
  const cobrada = (typeof quantas === 'number' && quantas >= 1) || dataOuNula(resumo?.['last_charged_date']) !== null || linha.ultima_cobranca_paga !== null
  if (!cobrada) return { cobrada: false, expiraEm: null }
  const limite = agora.getTime() + UM_DIA_MS
  const proxima = (jaCanceladaLa ? null : dataDepoisDe(daOperadora?.['next_payment_date'], limite)) ?? dataDepoisDe(linha.proxima_cobranca, limite)
  return { cobrada: true, expiraEm: proxima ? fimDoPeriodoPago(proxima) : null }
}

export async function gerenciarAssinatura(pedido: PedidoDeGerenciar, deps: DependenciasDeGerenciar): Promise<RespostaDaFuncao> {
  if (!pedido.conta) return erro('Entre na sua conta antes de mudar a assinatura.', 401)
  const corpo = objeto(pedido.corpo)
  if (!corpo) return erro('Corpo da requisição inválido.', 400)
  const dono = pedido.conta.id

  const { linha, falha } = await deps.banco.lerDaConta(dono)
  if (falha) {
    deps.log('Não consegui ler a assinatura:', falha.mensagem)
    return erro(FORA, 502)
  }
  if (!linha || !PAGOS.includes(linha.plano) || !linha.preapproval_id) return erro('Esta conta não tem assinatura paga.', 409)
  const id = linha.preapproval_id
  const caminho = `/preapproval/${encodeURIComponent(id)}`
  const agora = deps.agora()

  if (corpo['acao'] === 'previa') {
    if (linha.status !== 'ativa') return { status: 200, corpo: { cobrada: false, expiraEm: null } }
    const lida = await deps.operadora('GET', caminho)
    if (!lida?.ok) {
      deps.log('Não consegui ler a assinatura na operadora para a prévia:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados?.['status']) === 'cancelada'
    return { status: 200, corpo: { ...desfechoDoCancelamento(linha, lida.dados, jaCanceladaLa, agora) } }
  }

  if (corpo['acao'] === 'cancelar') {
    // CB-93: a resposta do cancelamento se perdeu e a pessoa pediu de novo; nada a fazer lá.
    if (linha.status === 'cancelada') return { status: 200, corpo: { status: 'cancelada', expiraEm: linha.expira_em } }
    const lida = await deps.operadora('GET', caminho)
    if (!lida?.ok) {
      deps.log('Não consegui ler a assinatura na operadora:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados?.['status']) === 'cancelada'
    if (!jaCanceladaLa && !(await cancelarNaOperadora(deps.operadora, id))) {
      deps.log('A operadora não cancelou:', id)
      return erro(FORA, 502)
    }
    const { expiraEm } = desfechoDoCancelamento(linha, lida.dados, jaCanceladaLa, agora)
    const mudanca = { status: 'cancelada', expira_em: expiraEm, encerrada_por: 'pessoa', encerrada_em: agora.toISOString(), atualizado_em: agora.toISOString() } as const
    let gravou = await deps.banco.mudar(dono, id, mudanca)
    if (gravou.falha) gravou = await deps.banco.mudar(dono, id, mudanca)
    if (gravou.falha) {
      // Pedir de novo não resolve se o aviso gravar antes. O registro permite acertar expira_em à mão.
      deps.log('Cancelada na operadora, mas não gravada aqui:', id, gravou.falha.mensagem)
      return erro(GRAVADA_LA_SO, 502)
    }
    return { status: 200, corpo: { status: 'cancelada', expiraEm } }
  }

  if (corpo['acao'] === 'trocar_cartao') {
    if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)
    const cartaoToken = tokenDoCartao(corpo['card_token_id'])
    const cartao = lerCartao(corpo['cartao'])
    if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)
    // D-101 (CA-433, CA-434): quem testa cartão roubado pela troca também não chega à operadora.
    const portao = await conferirTentativas(deps.banco, dono, agora, deps.log)
    if (!portao.passa) return portao.resposta

    const feito = await deps.operadora('PUT', caminho, { card_token_id: cartaoToken })
    // Sem resposta, erro do lado dela, a nossa credencial recusada ou excesso de pedidos (R8): falha
    // nossa, nunca recusa do cartão. Não é anotada (R4).
    if (!feito || feito.status >= 500 || feito.status === 401 || feito.status === 403 || feito.status === 429) {
      deps.log('A operadora não respondeu à troca de cartão:', feito?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    if (!feito.ok) {
      const codigo = codigoDaRecusa(feito.dados)
      deps.log('A operadora recusou o cartão novo:', feito.status, codigo, id)
      // R4: só a recusa do cartão é anotada; token vencido e outra falha, não.
      if (!ehRecusaDoCartao(codigo)) return erro(RECUSA_PADRAO, 402, codigo)
      await anotarTentativaDeCartao(deps.banco, dono, true, agora, deps.log)
      // CA-435: da segunda recusa seguida em diante, sem o motivo do banco.
      return erro(RECUSA_PADRAO, 402, portao.seguidas >= 1 ? 'recusado' : codigo)
    }
    const { falha: naoGravou } = await deps.banco.mudar(dono, id, { cartao_bandeira: cartao.bandeira, cartao_final: cartao.final, atualizado_em: agora.toISOString() })
    // O cartão já foi trocado lá: se a gravação falhar, só a tela mostra o antigo até a próxima troca.
    if (naoGravou) deps.log('Cartão trocado na operadora, mas não gravado aqui:', id, naoGravou.mensagem)
    // R4: o cartão novo valeu lá, então zera as recusas seguidas, mesmo sem gravar aqui.
    await anotarTentativaDeCartao(deps.banco, dono, false, agora, deps.log)
    return { status: 200, corpo: { cartao } }
  }

  return erro('Ação desconhecida.', 400)
}

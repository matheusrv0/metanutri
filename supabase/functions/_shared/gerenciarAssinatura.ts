// Diz o que vai acontecer se cancelar, cancela e troca o cartão, sem sair do site (spec
// checkout-proprio, D-69; spec cobranca-em-producao, D-81 e D-101). Puro: a operadora, o banco, o
// relógio e o registro chegam de fora (src/data/servidorGerenciar.test.ts).
//
// D-81: só ganha "vale até o fim do período" quem já teve ao menos uma mensalidade cobrada. A prévia
// (que a janela de cancelar mostra) e o cancelamento usam a mesma conta, desfechoDoCancelamento.
// D-101 e CB-109: só a troca de cartão reserva a conta e passa pelo portão das tentativas; a prévia e
// o cancelamento, não. D-108: as três ações passam pelo limite de chamadas logo antes de chamar a
// operadora: a troca como pedido com cartão; a prévia e o cancelamento como conferir.
import { EM_ANDAMENTO, RESERVA_VENCE_MS } from './assinar.ts'
import { conferirChamadas, type BancoDasChamadas } from './chamadas.ts'
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
  type CartaoInformado,
} from './cobranca.ts'
import { tentarCancelarNaOperadora } from './operadora.ts'
import {
  respostaDeErro as erro,
  type BancoDaCobranca,
  type ContaQuePede,
  type LinhaDaAssinatura,
  type Operadora,
  type Registro,
  type RespostaDaFuncao,
  type RespostaDaOperadora,
} from './portas.ts'
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
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas & BancoDasChamadas
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
  const cobrada = (typeof quantas === 'number' && quantas >= 1) || dataOuNula(resumo?.['last_charged_date']) !== null || pagaAnotadaAqui(linha)
  if (!cobrada) return { cobrada: false, expiraEm: null }
  const limite = agora.getTime() + UM_DIA_MS
  const proxima = (jaCanceladaLa ? null : dataDepoisDe(daOperadora?.['next_payment_date'], limite)) ?? dataDepoisDe(linha.proxima_cobranca, limite)
  return { cobrada: true, expiraEm: proxima ? fimDoPeriodoPago(proxima) : null }
}

/** D-83: o aviso de uma mensalidade paga já foi anotado aqui. Só uma data de verdade conta (campo ausente ou texto solto, não). */
const pagaAnotadaAqui = (linha: LinhaDaAssinatura): boolean => dataOuNula(linha.ultima_cobranca_paga) !== null

/** O que registrar de uma leitura na operadora que não valeu: o status, "sem resposta" ou "corpo ilegível". Nunca o corpo. */
const motivoDaLeitura = (lida: RespostaDaOperadora | null): number | string => (!lida ? 'sem resposta' : lida.ok ? 'corpo ilegível' : lida.status)

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
    // R11 (CB-93): já cancelada aqui, a prévia repete o que o cancelamento devolveria, sem perguntar lá.
    if (linha.status === 'cancelada') {
      return { status: 200, corpo: { cobrada: dataOuNula(linha.expira_em) !== null || pagaAnotadaAqui(linha), expiraEm: linha.expira_em } }
    }
    if (linha.status !== 'ativa') return { status: 200, corpo: { cobrada: false, expiraEm: null } }
    // D-108 (CA-449): até 20 conferências e cancelamentos por hora na conta, contados só quando a operadora seria chamada.
    const barrado = await conferirChamadas(deps.banco, dono, 'conferir', agora, deps.log, FORA)
    if (barrado) return barrado
    const lida = await deps.operadora('GET', caminho)
    // Um 2xx com o corpo que não se lê não diz se houve cobrança: conta como leitura que falhou.
    if (!lida?.ok || !lida.dados) {
      deps.log('Não consegui ler a assinatura na operadora para a prévia:', motivoDaLeitura(lida), id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados['status']) === 'cancelada'
    return { status: 200, corpo: { ...desfechoDoCancelamento(linha, lida.dados, jaCanceladaLa, agora) } }
  }

  if (corpo['acao'] === 'cancelar') {
    // CB-93: a resposta do cancelamento se perdeu e a pessoa pediu de novo; nada a fazer lá.
    if (linha.status === 'cancelada') return { status: 200, corpo: { status: 'cancelada', expiraEm: linha.expira_em } }
    // D-108 (CA-449): soma com a prévia no mesmo limite.
    const barrado = await conferirChamadas(deps.banco, dono, 'conferir', agora, deps.log, FORA)
    if (barrado) return barrado
    const lida = await deps.operadora('GET', caminho)
    if (!lida?.ok || !lida.dados) {
      deps.log('Não consegui ler a assinatura na operadora:', motivoDaLeitura(lida), id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados['status']) === 'cancelada'
    if (!jaCanceladaLa) {
      const cancelamento = await tentarCancelarNaOperadora(deps.operadora, id)
      if (!cancelamento.cancelada) {
        deps.log('A operadora não cancelou:', cancelamento.ultimoStatus ?? 'sem resposta', id)
        return erro(FORA, 502)
      }
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
    if (gravou.linhas === 0) {
      // Nenhuma linha com esta assinatura (outra entrou no lugar entre ler e gravar): tentar de novo não
      // muda isso, e "cancelada" não descreve a conta. Como na troca de cartão, fica no registro; a
      // resposta é a da cancelada lá e não gravada aqui, e a tela relê o que o servidor tem.
      deps.log('Cancelada na operadora, mas nenhuma linha mudou aqui:', id)
      return erro(GRAVADA_LA_SO, 502)
    }
    return { status: 200, corpo: { status: 'cancelada', expiraEm } }
  }

  if (corpo['acao'] === 'trocar_cartao') {
    if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)
    const cartaoToken = tokenDoCartao(corpo['card_token_id'])
    const cartao = lerCartao(corpo['cartao'])
    if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)
    // CB-109: uma troca por conta de cada vez, para o portão contar cada recusa antes do pedido
    // seguinte. A reserva da assinar (uma linha por conta) deixa um só pedido seguir; a de uma função
    // que morreu no meio vence em 5 minutos. Ela guarda o cartão novo: a adoção do D-85 só lê o cartão
    // da reserva numa conta sem assinatura paga ativa, e a troca só chega aqui com uma ativa.
    const vencida = await deps.banco.soltarReservaVencida(dono, new Date(agora.getTime() - RESERVA_VENCE_MS).toISOString())
    if (vencida) deps.log('Não consegui apagar a reserva vencida:', vencida.mensagem)
    const reserva = await deps.banco.reservar(dono, cartao)
    if (reserva) {
      if (reserva.codigo === '23505') return erro(EM_ANDAMENTO, 409)
      deps.log('Não consegui reservar a troca de cartão:', reserva.mensagem)
      return erro(FORA, 502)
    }
    try {
      return await trocarCartao(dono, id, cartaoToken, cartao, agora, deps)
    } finally {
      const naoSoltou = await deps.banco.soltarReserva(dono)
      if (naoSoltou) deps.log('Não consegui soltar a reserva da troca de cartão (ela vence em 5 minutos):', naoSoltou.mensagem)
    }
  }

  return erro('Ação desconhecida.', 400)
}

/** CA-379 e D-101: o portão das tentativas e a troca na operadora, com a conta já reservada (CB-109). */
async function trocarCartao(dono: string, id: string, cartaoToken: string, cartao: CartaoInformado, agora: Date, deps: DependenciasDeGerenciar): Promise<RespostaDaFuncao> {
  // D-101 (CA-433, CA-434): com recusas demais, a troca também não chega à operadora. Sem conseguir
  // contar, o 502 diz "Nada mudou", como as outras falhas daqui.
  const portao = await conferirTentativas(deps.banco, dono, agora, deps.log, FORA)
  if (!portao.passa) return portao.resposta
  // D-108 (CA-448): a troca soma com a assinar no limite de pedidos com cartão; a conta já está reservada.
  const barrado = await conferirChamadas(deps.banco, dono, 'cartao', agora, deps.log, FORA)
  if (barrado) return barrado

  const feito = await deps.operadora('PUT', `/preapproval/${encodeURIComponent(id)}`, { card_token_id: cartaoToken })
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
  const troca = { cartao_bandeira: cartao.bandeira, cartao_final: cartao.final, atualizado_em: agora.toISOString() }
  let gravou = await deps.banco.mudar(dono, id, troca)
  if (gravou.falha) gravou = await deps.banco.mudar(dono, id, troca)
  // O cartão já foi trocado lá: se a gravação falhar, só a tela mostra o antigo até a próxima troca.
  if (gravou.falha) deps.log('Cartão trocado na operadora, mas não gravado aqui:', id, gravou.falha.mensagem)
  // Nenhuma linha com esta assinatura (outra entrou no lugar entre ler e gravar): tentar de novo não muda isso.
  else if (gravou.linhas === 0) deps.log('Cartão trocado na operadora, mas nenhuma linha mudou aqui:', id)
  // R4: o cartão novo valeu lá, então zera as recusas seguidas, mesmo sem gravar aqui.
  await anotarTentativaDeCartao(deps.banco, dono, false, agora, deps.log)
  return { status: 200, corpo: { cartao } }
}

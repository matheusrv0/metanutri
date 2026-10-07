// Os textos da assinatura paga no checkout e em Conta e plano (spec checkout-proprio).
// As duas contas de data vêm do mesmo arquivo que as funções do servidor usam, para a
// tela dizer a mesma data que a função grava (decisão 13 do plano).
import { previsaoDaProximaCobranca } from '../../supabase/functions/_shared/cobranca.ts'
import { canceladaNoPrazo, RECADO_STATUS, type Assinatura } from './assinatura.ts'
import { planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import { formatarDataLonga } from './pedidoEstudante.ts'

const REAIS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const DIA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', timeZone: 'America/Sao_Paulo' })
const DIA_E_MES = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

/** 34.9 → "R$ 34,90". */
export const emReais = (valor: number): string => `R$ ${REAIS.format(valor)}`

/** "Solo, mensal". Sem ciclo (assinatura de antes do 007), só o nome. */
export function nomeComCiclo(plano: IdPlano, ciclo: Ciclo | null): string {
  const nome = planoPorId(plano)?.nome ?? 'Free'
  return ciclo ? `${nome}, ${ciclo}` : nome
}

/** D-81: o que a janela de cancelar ouviu do servidor (a ação `previa` da gerenciar-assinatura). */
export interface PreviaDoCancelamento {
  readonly cobrada: boolean
  readonly expiraEm: string | null
}

export const CONFERINDO_COBRANCA = 'Conferindo se já houve cobrança…'
export const PREVIA_FALHOU = 'Não consegui conferir se já houve cobrança.'

/** O recado embaixo de "Seu plano", ou nulo quando o cartão do plano já diz tudo (D-79). CA-393: a recusa diz o dia. */
export function recadoDaAssinatura(a: Assinatura): string | null {
  if (a.status === 'cancelada' && a.encerradaPor === 'recusa') {
    const quando = a.encerradaEm ? ` de ${formatarDataLonga(a.encerradaEm)}` : ''
    return `O banco recusou a cobrança${quando}. A assinatura foi encerrada e a conta voltou ao Free.`
  }
  return RECADO_STATUS[a.status]
}

/** CA-377, CA-395 e CA-396: o que a janela de cancelar diz. A ativa depende da prévia; pendente e pausada, não. */
export function textoDoCancelamento(a: Assinatura, previa: PreviaDoCancelamento | null): string {
  const nome = planoPorId(a.status === 'ativa' ? a.plano : a.planoPedido)?.nome ?? 'pago'
  if (a.status !== 'ativa' || !previa) return `A assinatura do plano ${nome} para e nada mais é cobrado. Você continua no plano Free.`
  if (!previa.cobrada) return 'Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora.'
  if (previa.expiraEm) return `O plano ${nome} continua até ${formatarDataLonga(previa.expiraEm)}, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`
  return 'Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.'
}

/** CA-376: "Mastercard final 6351", o nome do mini cartão para o leitor de tela (CA-389). Sem o cartão gravado (antes do 008), nulo. */
export function linhaDoCartao(a: Assinatura): string | null {
  return a.cartaoFinal ? `${a.cartaoBandeira ?? 'Cartão'} final ${a.cartaoFinal}` : null
}

/** A data gravada só aparece na tela enquanto está à frente: a próxima cobrança gravada pode ficar velha. */
const aindaVem = (data: string, agora: Date): boolean => Date.parse(data) > agora.getTime()

/**
 * CA-376 e CA-378: a próxima cobrança da ativa, ou até quando vale a cancelada. Data que já
 * passou não aparece (M2): a ativa fica só com o valor; a cancelada, sem linha.
 */
export function linhaDaCobranca(a: Assinatura, agora: Date = new Date()): string | null {
  // CA-390: "cancelada" já está no selo; a linha diz só até quando vale e o que vem depois.
  if (canceladaNoPrazo(a) && a.expiraEm) return aindaVem(a.expiraEm, agora) ? `Vale até ${formatarDataLonga(a.expiraEm)}. Depois, a conta volta ao Free.` : null
  if (a.status !== 'ativa' || !a.proximaCobranca) return null
  const reais = a.valorCentavos > 0 ? emReais(a.valorCentavos / 100) : null
  if (!aindaVem(a.proximaCobranca, agora)) return reais ? `Próxima cobrança de ${reais}` : null
  return `Próxima cobrança em ${formatarDataLonga(a.proximaCobranca)}${reais ? `, ${reais}` : ''}`
}

/** CA-366: a próxima cobrança, antes de assinar; o servidor confirma depois. */
export const proximaCobrancaPrevista = (ciclo: Ciclo, agora: Date): string => previsaoDaProximaCobranca(agora, ciclo)

/**
 * Embaixo do total, no cartão do resumo: "Depois, o mesmo valor todo dia 2, a partir de 2 de
 * novembro. Cancele quando quiser." O valor está logo acima, no total: não se repete (D-79).
 */
export function depoisDeHoje(ciclo: Ciclo, proximaCobranca: string): string {
  const data = new Date(proximaCobranca)
  const quando = ciclo === 'anual' ? `todo ano, em ${DIA_E_MES.format(data)}` : `todo dia ${DIA.format(data)}, a partir de ${DIA_E_MES.format(data)}`
  return `Depois, o mesmo valor ${quando}. Cancele quando quiser.`
}

/** CA-372: o valor no recibo da assinatura ativa: "R$ 34,90 por mês". */
export const valorDoRecibo = (valor: number, ciclo: Ciclo): string => `${emReais(valor)} por ${ciclo === 'anual' ? 'ano' : 'mês'}`

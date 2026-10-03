// Os textos da assinatura paga no checkout e em Conta e plano (spec checkout-proprio).
// As duas contas de data vêm do mesmo arquivo que as funções do servidor usam, para a
// tela dizer a mesma data que a função grava (decisão 13 do plano).
import { fimDoPeriodoPago, previsaoDaProximaCobranca } from '../../supabase/functions/_shared/cobranca.ts'
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

/** O recado embaixo de "Seu plano". A cancelada no prazo tem o seu (CA-378). */
export function recadoDaAssinatura(a: Assinatura): string {
  return canceladaNoPrazo(a) ? 'A assinatura foi cancelada e não cobra mais. O plano pago vale até o fim do período já pago.' : RECADO_STATUS[a.status]
}

/** CA-376: "Mastercard final 6351". Sem o cartão gravado (antes do 008), nulo. */
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
  if (canceladaNoPrazo(a) && a.expiraEm) return aindaVem(a.expiraEm, agora) ? `Cancelada, vale até ${formatarDataLonga(a.expiraEm)}` : null
  if (a.status !== 'ativa' || !a.proximaCobranca) return null
  const reais = a.valorCentavos > 0 ? emReais(a.valorCentavos / 100) : null
  if (!aindaVem(a.proximaCobranca, agora)) return reais ? `Próxima cobrança de ${reais}` : null
  return `Próxima cobrança em ${formatarDataLonga(a.proximaCobranca)}${reais ? `, ${reais}` : ''}`
}

/** CA-377: a data, por extenso, até quando o plano vale se cancelar agora. Nula sem a próxima cobrança gravada ou se essa data já passou (M2). */
export function valeAteSeCancelar(a: Assinatura, agora: Date = new Date()): string | null {
  const fim = a.proximaCobranca ? fimDoPeriodoPago(a.proximaCobranca) : null
  return fim && aindaVem(fim, agora) ? formatarDataLonga(fim) : null
}

/** CA-366: a próxima cobrança, antes de assinar; o servidor confirma depois. */
export const proximaCobrancaPrevista = (ciclo: Ciclo, agora: Date): string => previsaoDaProximaCobranca(agora, ciclo)

/** Embaixo do total, no cartão do resumo: "Depois, R$ 34,90 todo dia 2, a partir de 2 de novembro. Cancele quando quiser." */
export function depoisDeHoje(valor: number, ciclo: Ciclo, proximaCobranca: string): string {
  const data = new Date(proximaCobranca)
  const quando = ciclo === 'anual' ? `todo ano, em ${DIA_E_MES.format(data)}` : `todo dia ${DIA.format(data)}, a partir de ${DIA_E_MES.format(data)}`
  return `Depois, ${emReais(valor)} ${quando}. Cancele quando quiser.`
}

/** CA-372: o valor no recibo da assinatura ativa: "R$ 34,90 por mês". */
export const valorDoRecibo = (valor: number, ciclo: Ciclo): string => `${emReais(valor)} por ${ciclo === 'anual' ? 'ano' : 'mês'}`

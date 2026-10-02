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

/** CA-376 e CA-378: a próxima cobrança da ativa, ou até quando vale a cancelada. */
export function linhaDaCobranca(a: Assinatura): string | null {
  if (canceladaNoPrazo(a) && a.expiraEm) return `Cancelada, vale até ${formatarDataLonga(a.expiraEm)}`
  if (a.status !== 'ativa' || !a.proximaCobranca) return null
  const valor = a.valorCentavos > 0 ? `, ${emReais(a.valorCentavos / 100)}` : ''
  return `Próxima cobrança em ${formatarDataLonga(a.proximaCobranca)}${valor}`
}

/** CA-377: a data, por extenso, até quando o plano vale se cancelar agora. Nula sem a próxima cobrança gravada. */
export function valeAteSeCancelar(a: Assinatura): string | null {
  const fim = a.proximaCobranca ? fimDoPeriodoPago(a.proximaCobranca) : null
  return fim ? formatarDataLonga(fim) : null
}

/** CA-366: a próxima cobrança, antes de assinar; o servidor confirma depois. */
export const proximaCobrancaPrevista = (ciclo: Ciclo, agora: Date): string => previsaoDaProximaCobranca(agora, ciclo)

/** Embaixo do total, no cartão do resumo: "Depois, R$ 34,90 todo dia 2. Cancele quando quiser." */
export function depoisDeHoje(valor: number, ciclo: Ciclo, proximaCobranca: string): string {
  const data = new Date(proximaCobranca)
  const quando = ciclo === 'anual' ? `todo ano, em ${DIA_E_MES.format(data)}` : `todo dia ${DIA.format(data)}`
  return `Depois, ${emReais(valor)} ${quando}. Cancele quando quiser.`
}

/** CA-372: a frase da assinatura ativa. */
export function fraseDaAssinaturaAtiva(plano: IdPlano, ciclo: Ciclo, email: string, proximaCobranca: string): string {
  return `Plano ${nomeComCiclo(plano, ciclo)}. O recibo vai para ${email} e a próxima cobrança é em ${formatarDataLonga(proximaCobranca)}.`
}

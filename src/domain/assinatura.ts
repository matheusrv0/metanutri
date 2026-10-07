// O lado do navegador da assinatura. Aqui não existe preço nem cobrança: quem
// decide valor é o servidor (`supabase/functions/assinar`), porque preço que vem do
// navegador é preço que o cliente escolhe.
import { ehCiclo, ehIdPlano, type Ciclo, type IdPlano } from './conta.ts'

export type EncerradaPor = 'pessoa' | 'recusa' | 'operadora'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada' | 'vencida' | 'sem-assinatura'

export interface Assinatura {
  /** O plano que vale agora. Só assinatura ativa e dentro do prazo, ou paga cancelada ainda no período pago, dá plano pago. */
  readonly plano: IdPlano
  /** O plano gravado na linha, valendo ou não: é o que o "Assinar de novo" reabre. */
  readonly planoPedido: IdPlano
  readonly status: StatusAssinatura
  /** Até quando vale: o Estudante, e a paga cancelada (o fim do período pago, CA-378). `null` quando não vence. */
  readonly expiraEm: string | null
  /** Mensal ou anual, na assinatura paga. `null` no Free, no Estudante e nas linhas de antes do 007. */
  readonly ciclo: Ciclo | null
  /** O valor de cada cobrança, em centavos. Zero quando não há. */
  readonly valorCentavos: number
  /** D-70: a bandeira e os 4 últimos números do cartão que paga. `null` nas linhas de antes do 008. */
  readonly cartaoBandeira: string | null
  readonly cartaoFinal: string | null
  /** Quando cai a próxima cobrança da assinatura paga. */
  readonly proximaCobranca: string | null
  /** D-83: quando caiu a última mensalidade paga; nulo antes da primeira e nas linhas de antes do 009. */
  readonly ultimaCobrancaPaga: string | null
  /** Quem encerrou a cancelada: a pessoa, o banco ao recusar (D-80) ou a operadora sozinha. */
  readonly encerradaPor: EncerradaPor | null
  /** Quando: na recusa, o dia da cobrança recusada (CA-393). */
  readonly encerradaEm: string | null
}

export const SEM_ASSINATURA: Assinatura = {
  plano: 'free',
  planoPedido: 'free',
  status: 'sem-assinatura',
  expiraEm: null,
  ciclo: null,
  valorCentavos: 0,
  cartaoBandeira: null,
  cartaoFinal: null,
  proximaCobranca: null,
  ultimaCobrancaPaga: null,
  encerradaPor: null,
  encerradaEm: null,
}

/** O que o banco grava. `vencida` não está aqui: ela é calculada pela data. */
const STATUS_DO_BANCO: readonly StatusAssinatura[] = ['ativa', 'pendente', 'pausada', 'cancelada', 'sem-assinatura']

const ENCERRAMENTOS: readonly EncerradaPor[] = ['pessoa', 'recusa', 'operadora']

/** Os planos que se paga: só eles têm período pago a respeitar depois de cancelar. */
const PAGOS: readonly IdPlano[] = ['solo', 'pro', 'clinica']

const dataOuNulo = (valor: unknown): string | null => (typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime()) ? valor : null)

/** Linha do banco → assinatura. O que não reconhece vira "sem assinatura", nunca plano pago. */
export function daLinhaAssinatura(linha: unknown, agora: Date = new Date()): Assinatura {
  if (typeof linha !== 'object' || linha === null) return SEM_ASSINATURA
  const o = linha as Record<string, unknown>

  const lido =
    typeof o['status'] === 'string' && (STATUS_DO_BANCO as readonly string[]).includes(o['status']) ? (o['status'] as StatusAssinatura) : 'sem-assinatura'
  const planoPedido: IdPlano = ehIdPlano(o['plano']) ? o['plano'] : 'free'
  const expiraEm = dataOuNulo(o['expira_em'])
  const vence = expiraEm === null ? null : new Date(expiraEm).getTime()
  // O Estudante vale 12 meses. Passou do prazo, volta ao Free sem apagar nada (CA-175).
  const status: StatusAssinatura = lido === 'ativa' && vence !== null && vence < agora.getTime() ? 'vencida' : lido
  // CA-378: a paga cancelada continua valendo até o fim do período pago. Sem data à frente
  // volta ao Free na hora: seja a operadora cancelando sozinha (CB-94), a recusa do banco (D-80)
  // ou o cancelamento antes da primeira cobrança (D-81).
  const canceladaValendo = status === 'cancelada' && PAGOS.includes(planoPedido) && vence !== null && vence > agora.getTime()

  const bandeira = o['cartao_bandeira']
  const final = o['cartao_final']
  const valor = o['valor_centavos']
  const por = o['encerrada_por']

  return {
    // Só assinatura ativa (ou paga cancelada no prazo) dá plano pago. Pendente, pausada ou
    // vencida volta para o Free: senão, criar a assinatura e não pagar liberaria tudo.
    plano: status === 'ativa' || canceladaValendo ? planoPedido : 'free',
    planoPedido,
    status,
    expiraEm,
    ciclo: ehCiclo(o['ciclo']) ? o['ciclo'] : null,
    valorCentavos: typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : 0,
    cartaoBandeira: typeof bandeira === 'string' && bandeira.trim() !== '' ? bandeira.trim() : null,
    cartaoFinal: typeof final === 'string' && /^\d{4}$/.test(final) ? final : null,
    proximaCobranca: dataOuNulo(o['proxima_cobranca']),
    ultimaCobrancaPaga: dataOuNulo(o['ultima_cobranca_paga']),
    encerradaPor: typeof por === 'string' && (ENCERRAMENTOS as readonly string[]).includes(por) ? (por as EncerradaPor) : null,
    encerradaEm: dataOuNulo(o['encerrada_em']),
  }
}

/** CA-378: cancelada, mas ainda dentro do período pago (o plano pago ainda vale). */
export const canceladaNoPrazo = (a: Assinatura): boolean => a.status === 'cancelada' && a.plano !== 'free'

/** CA-376 e CA-378: a assinatura paga que Conta e plano mostra com o cartão ou com o "vale até". */
export const temAssinaturaPaga = (a: Assinatura): boolean => (a.status === 'ativa' || canceladaNoPrazo(a)) && PAGOS.includes(a.plano)

/**
 * O recado embaixo de "Seu plano". D-79: só aparece quando acrescenta algo ao cartão do
 * plano, que já mostra o nome, o selo e as datas; nulo é sem recado. CA-381: nenhum recado
 * cita o processador de pagamento.
 */
export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string | null>> = {
  ativa: null,
  pendente: 'O banco ainda está confirmando o pagamento. Até lá, vale o Free.',
  pausada: 'A assinatura está pausada. Até ela voltar, vale o Free.',
  cancelada: null,
  vencida: 'Seu plano venceu e a conta voltou ao Free.',
  'sem-assinatura': null,
}

/** Planos que dá para assinar sozinho; Clínica é conversa, não botão. */
export const ASSINAVEIS: readonly IdPlano[] = ['solo', 'pro']

export function podeAssinar(plano: IdPlano): boolean {
  return ASSINAVEIS.includes(plano)
}

/** O que a tela de volta do pagamento mostra (CA-166 a CA-169), para os links antigos. */
export type RespostaDaVolta = 'ativa' | 'analise' | 'nao-concluido'

export function respostaDaVolta(assinatura: Assinatura): RespostaDaVolta {
  if (assinatura.status === 'ativa') return 'ativa'
  if (assinatura.status === 'pendente') return 'analise'
  return 'nao-concluido'
}

// O lado do navegador da assinatura. Aqui não existe preço nem cobrança: quem
// decide valor é o servidor (`supabase/functions/assinar`), porque preço que vem do
// navegador é preço que o cliente escolhe.
import { ehIdPlano, type IdPlano } from './conta.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada' | 'vencida' | 'sem-assinatura'

export interface Assinatura {
  /** O plano que vale agora. Só assinatura ativa e dentro do prazo dá plano pago. */
  readonly plano: IdPlano
  /** O plano gravado na linha, valendo ou não: é o que o "Tentar de novo" reabre. */
  readonly planoPedido: IdPlano
  readonly status: StatusAssinatura
  readonly precoTravado: boolean
  /** Até quando vale (plano Estudante). `null` quando não vence. */
  readonly expiraEm: string | null
}

export const SEM_ASSINATURA: Assinatura = { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null }

/** O que o banco grava. `vencida` não está aqui: ela é calculada pela data. */
const STATUS_DO_BANCO: readonly StatusAssinatura[] = ['ativa', 'pendente', 'pausada', 'cancelada', 'sem-assinatura']

/** Linha do banco → assinatura. O que não reconhece vira "sem assinatura", nunca plano pago. */
export function daLinhaAssinatura(linha: unknown, agora: Date = new Date()): Assinatura {
  if (typeof linha !== 'object' || linha === null) return SEM_ASSINATURA
  const o = linha as Record<string, unknown>

  const lido =
    typeof o['status'] === 'string' && (STATUS_DO_BANCO as readonly string[]).includes(o['status']) ? (o['status'] as StatusAssinatura) : 'sem-assinatura'
  const planoPedido: IdPlano = ehIdPlano(o['plano']) ? o['plano'] : 'free'
  const bruto = o['expira_em']
  const expiraEm = typeof bruto === 'string' && !Number.isNaN(new Date(bruto).getTime()) ? bruto : null
  // O Estudante vale 12 meses. Passou do prazo, volta ao Free sem apagar nada (CA-175).
  const status: StatusAssinatura = lido === 'ativa' && expiraEm !== null && new Date(expiraEm).getTime() < agora.getTime() ? 'vencida' : lido

  return {
    // Só assinatura ativa dá plano pago. Pendente, cancelada ou vencida volta para o
    // Free: senão, criar a assinatura e não pagar liberaria o produto inteiro.
    plano: status === 'ativa' ? planoPedido : 'free',
    planoPedido,
    status,
    precoTravado: o['preco_travado'] === true,
    expiraEm,
  }
}

export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string>> = {
  ativa: 'Sua assinatura está em dia.',
  pendente: 'Falta concluir o pagamento no Mercado Pago. Até lá, vale o plano Free.',
  pausada: 'Sua assinatura está pausada. Enquanto isso, vale o plano Free.',
  cancelada: 'Sua assinatura foi cancelada. Você continua com o plano Free.',
  vencida: 'O prazo do seu plano acabou. Você continua no Free, sem perder nada.',
  'sem-assinatura': 'Você está no plano Free.',
}

/** Planos que dá para assinar sozinho; Clínica é conversa, não botão. */
export const ASSINAVEIS: readonly IdPlano[] = ['solo', 'pro']

export function podeAssinar(plano: IdPlano): boolean {
  return ASSINAVEIS.includes(plano)
}

/** O que a tela de volta do Mercado Pago mostra (CA-166 a CA-169). */
export type RespostaDaVolta = 'ativa' | 'analise' | 'nao-concluido'

export function respostaDaVolta(assinatura: Assinatura): RespostaDaVolta {
  if (assinatura.status === 'ativa') return 'ativa'
  if (assinatura.status === 'pendente') return 'analise'
  return 'nao-concluido'
}

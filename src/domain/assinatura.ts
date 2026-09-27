// O lado do navegador da assinatura. Aqui não existe preço nem cobrança: quem
// decide valor é o servidor (`supabase/functions/assinar`), porque preço que vem do
// navegador é preço que o cliente escolhe.
import type { IdPlano } from './conta.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada' | 'sem-assinatura'

export interface Assinatura {
  readonly plano: IdPlano
  readonly status: StatusAssinatura
  readonly precoTravado: boolean
}

export const SEM_ASSINATURA: Assinatura = { plano: 'free', status: 'sem-assinatura', precoTravado: false }

const STATUS: readonly StatusAssinatura[] = ['ativa', 'pendente', 'pausada', 'cancelada', 'sem-assinatura']
const PLANOS_VALIDOS: readonly string[] = ['free', 'estudante', 'solo', 'pro', 'clinica']

/** Linha do banco → assinatura. O que não reconhece vira "sem assinatura", nunca plano pago. */
export function daLinhaAssinatura(linha: unknown): Assinatura {
  if (typeof linha !== 'object' || linha === null) return SEM_ASSINATURA
  const o = linha as Record<string, unknown>

  const status = typeof o['status'] === 'string' && (STATUS as readonly string[]).includes(o['status']) ? (o['status'] as StatusAssinatura) : 'sem-assinatura'
  const plano = typeof o['plano'] === 'string' && PLANOS_VALIDOS.includes(o['plano']) ? (o['plano'] as IdPlano) : 'free'

  return {
    // Só assinatura ativa dá plano pago. Pendente ou cancelada volta para o Free —
    // caso contrário, criar a assinatura e não pagar liberaria o produto inteiro.
    plano: status === 'ativa' ? plano : 'free',
    status,
    precoTravado: o['preco_travado'] === true,
  }
}

export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string>> = {
  ativa: 'Sua assinatura está em dia.',
  pendente: 'Falta concluir o pagamento no Mercado Pago. Até lá, vale o plano Free.',
  pausada: 'Sua assinatura está pausada. Enquanto isso, vale o plano Free.',
  cancelada: 'Sua assinatura foi cancelada. Você continua com o plano Free.',
  'sem-assinatura': 'Você está no plano Free.',
}

/** Planos que dá para assinar sozinho; Clínica é conversa, não botão. */
export const ASSINAVEIS: readonly IdPlano[] = ['solo', 'pro']

export function podeAssinar(plano: IdPlano): boolean {
  return ASSINAVEIS.includes(plano)
}

// O e-mail de quem se cadastrou e ainda não digitou o código (spec confirmacao-por-codigo, D-93).
// Fica no aparelho, não só na aba: fechar e abrir o site também volta para a tela do código.
import type { Armazenamento } from '@/domain/persistencia.ts'

export const CHAVE_EMAIL_PENDENTE = 'metanutri:email-pendente'

/** CB-103: passado esse tempo, um aparelho compartilhado não fica preso na tela de outra pessoa. */
export const VALIDADE_EMAIL_PENDENTE_MS = 24 * 60 * 60 * 1000

export function guardarEmailPendente(arm: Armazenamento | null, email: string, agora: Date): void {
  try {
    arm?.setItem(CHAVE_EMAIL_PENDENTE, JSON.stringify({ email, em: agora.getTime() }))
  } catch {
    // sem armazenamento: a trava vale só enquanto a aba estiver aberta
  }
}

export function esquecerEmailPendente(arm: Armazenamento | null): void {
  try {
    arm?.removeItem(CHAVE_EMAIL_PENDENTE)
  } catch {
    // nada a esquecer
  }
}

/** O e-mail pendente, ou `null` se não há, está estragado ou passou de 24 horas (e então é apagado). */
export function lerEmailPendente(arm: Armazenamento | null, agora: Date): string | null {
  try {
    const bruto = arm?.getItem(CHAVE_EMAIL_PENDENTE) ?? null
    if (bruto === null) return null
    const lido: unknown = JSON.parse(bruto)
    if (typeof lido === 'object' && lido !== null && 'email' in lido && 'em' in lido) {
      const { email, em } = lido
      if (typeof email === 'string' && email !== '' && typeof em === 'number' && agora.getTime() - em < VALIDADE_EMAIL_PENDENTE_MS) return email
    }
  } catch {
    // conteúdo estragado: cai no esquecimento abaixo
  }
  esquecerEmailPendente(arm)
  return null
}

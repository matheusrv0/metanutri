// Plano Estudante pelo e-mail da faculdade (spec estilo-spora, D-28).
//
// A tela usa isto só para avisar antes do cadastro (CA-172). Quem decide é o
// servidor, com a mesma regra, quando o e-mail é confirmado (supabase/005-estudante.sql).
import lista from '@/data/dominios-faculdades-br.json'

/** Domínios de faculdade, gerados por scripts/dominios-faculdades.mjs. */
export const DOMINIOS_FACULDADE: ReadonlySet<string> = new Set(lista)

export function dominioDoEmail(email: string): string | null {
  const partes = email.trim().toLowerCase().split('@')
  return partes.length === 2 && partes[0] && partes[1] ? partes[1] : null
}

export function ehEmailDeFaculdade(email: string, dominios: ReadonlySet<string> = DOMINIOS_FACULDADE): boolean {
  const dominio = dominioDoEmail(email)
  if (!dominio) return false
  if (dominio.endsWith('.edu.br')) return true
  for (const d of dominios) if (dominio === d || dominio.endsWith(`.${d}`)) return true
  return false
}

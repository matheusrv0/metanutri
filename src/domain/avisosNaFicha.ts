// Os avisos por e-mail como a nutricionista os vê (spec lado-do-paciente, D-1227, CA-2260 a CA-2265): o estado de cada
// aviso para o paciente, o que o cartão do link oferece e o próximo e-mail. Puro: lê o que `emails_do_link` devolveu.
import type { TipoDeAviso } from '../../supabase/functions/_shared/avisos/tipos.ts'
import type { EmailsDoLink } from './emailsDoLink.ts'

/** O paciente recebe este aviso agora: oferecido, aceito para o e-mail de agora, sem ter saído, sem devolução nem pedido de parar. */
export function avisoLigado(emails: EmailsDoLink, tipo: TipoDeAviso): boolean {
  if (!emails.ofertas[tipo] || emails.supressao !== null || emails.parouTudoEm !== null) return false
  return emails.aceites.some((a) => a.tipo === tipo && a.saiuEm === null)
}

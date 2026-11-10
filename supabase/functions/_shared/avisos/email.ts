// O endereço de e-mail do paciente (spec lado-do-paciente, DP-LP-16): como ele é guardado, conferido, mostrado e
// resumido. O app (a folha "Receber por e-mail", a ficha) e as funções do servidor usam este mesmo arquivo. Puro: o resumo
// usa o WebCrypto, que existe no navegador, no Node e no Deno.

/** RFC 5321: o endereço inteiro vai até 254 caracteres; a parte antes do @, até 64 (D-107 da seguranca-lote-2). */
export const EMAIL_MAXIMO = 254
const PARTE_LOCAL_MAXIMA = 64

/** CB-1211: guardado sem espaço nenhum e em minúsculas; a comparação é sempre assim. */
export const normalizarEmail = (texto: string): string => texto.replace(/\s+/g, '').toLowerCase()

/** Um @, algo antes, um domínio com ponto e sem espaço. Não tenta ser a RFC inteira: o servidor de e-mail é quem diz. */
const FORMATO = /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/

/** O endereço (já normalizado ou não) tem formato de e-mail e cabe no limite. */
export function emailValido(texto: string): boolean {
  const email = normalizarEmail(texto)
  if (email.length === 0 || email.length > EMAIL_MAXIMO || !FORMATO.test(email)) return false
  const local = email.slice(0, email.indexOf('@'))
  return local.length <= PARTE_LOCAL_MAXIMA
}

/** O domínio do endereço, para a conferência do servidor de e-mail (D-1221); nulo sem formato. */
export function dominioDoEmail(texto: string): string | null {
  const email = normalizarEmail(texto)
  return emailValido(email) ? email.slice(email.indexOf('@') + 1) : null
}

/**
 * O endereço mascarado (D-1221, CA-2235): a primeira e a última letra antes do @, com "•••" no meio, e o domínio inteiro:
 * "juliana@gmail.com" vira "j•••a@gmail.com". Com uma ou duas letras antes do @, só a primeira: "jo@x.com" vira "j•••@x.com".
 */
export function mascararEmail(texto: string): string {
  const email = normalizarEmail(texto)
  const arroba = email.lastIndexOf('@')
  if (arroba < 1) return email
  const local = email.slice(0, arroba)
  const dominio = email.slice(arroba + 1)
  const inicio = local[0] ?? ''
  const fim = local.length > 2 ? (local[local.length - 1] ?? '') : ''
  return `${inicio}•••${fim}@${dominio}`
}

/**
 * Os erros de digitação comuns no domínio (D-1221, CA-2236). Só domínios que não existem de verdade como endereço de
 * pessoa: a pergunta "Você quis dizer…?" não pode aparecer para um domínio certo.
 */
export const CORRECOES_DE_DOMINIO: Readonly<Record<string, string>> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmal.com.br': 'hotmail.com.br',
  'hotmail.con.br': 'hotmail.com.br',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'otlook.com': 'outlook.com',
  'yaho.com.br': 'yahoo.com.br',
  'yahoo.com.bt': 'yahoo.com.br',
  'yahoo.con.br': 'yahoo.com.br',
  'yahho.com.br': 'yahoo.com.br',
  'icloud.con': 'icloud.com',
  'iclod.com': 'icloud.com',
  'iclould.com': 'icloud.com',
}

/** "juliana@gmial.com" → "juliana@gmail.com"; nulo quando não há o que corrigir. */
export function sugerirCorrecao(texto: string): string | null {
  const email = normalizarEmail(texto)
  const arroba = email.lastIndexOf('@')
  if (arroba < 1) return null
  const correto = CORRECOES_DE_DOMINIO[email.slice(arroba + 1)]
  return correto === undefined ? null : `${email.slice(0, arroba)}@${correto}`
}

/**
 * O resumo do endereço (D-1243): SHA-256 do endereço normalizado, em hexadecimal minúsculo. É o que a supressão, os
 * aceites e os envios guardam; o banco faz a mesma conta em `public.hash_do_email` (supabase/017).
 */
export async function hashDoEmail(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizarEmail(texto))
  const resumo = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(resumo), (b) => b.toString(16).padStart(2, '0')).join('')
}

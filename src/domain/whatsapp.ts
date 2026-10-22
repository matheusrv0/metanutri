// Enviar pelo WhatsApp (spec whatsapp-e-retorno). O MetaNutri não manda nada: monta o endereço
// `wa.me`, que abre o WhatsApp do próprio nutricionista com o texto pronto, e quem envia é ele (D-140).
import { dataCurta, diaDaSemana } from './formatarData.ts'

/**
 * Os DDDs que existem no Brasil (Anatel). Serve para recusar o número obviamente errado, como
 * "(00) 9…" ou "(20) 9…", antes de abrir uma conversa com ninguém.
 */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65,
  66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
])

/**
 * O número no formato do WhatsApp (55 + DDD + número), ou `null` quando não é um número do Brasil
 * (D-141). Conta só o que é dígito. Aceita com ou sem 55 (também +55 e 0055), com ou sem o 0 da
 * longa distância e com ou sem o nono dígito, que nunca é acrescentado: inventar um dígito poderia
 * abrir a conversa com outra pessoa.
 */
export function normalizarTelefone(texto: string): string | null {
  const escrito = texto.trim()
  let digitos = escrito.replace(/\D/g, '')
  // "+" ou "00" na frente: o que vem depois é o código do país, e só o do Brasil vale.
  const comPais = escrito.startsWith('+') || digitos.startsWith('00')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (comPais) {
    if (!digitos.startsWith('55')) return null
    digitos = digitos.slice(2)
  } else if (digitos.length >= 12 && digitos.startsWith('55')) {
    // 12 ou 13 dígitos começando por 55 é o país. Com 10 ou 11, o 55 é o DDD de Santa Maria (RS).
    digitos = digitos.slice(2)
  } else if (digitos.startsWith('0')) {
    digitos = digitos.slice(1)
  }

  if (digitos.length !== 10 && digitos.length !== 11) return null
  if (!DDDS.has(Number(digitos.slice(0, 2)))) return null
  const numero = digitos.slice(2)
  const valido = numero.length === 9 ? numero.startsWith('9') : /^[2-9]/.test(numero)
  return valido ? `55${digitos}` : null
}

/** "5511987654321" → "(11) 98765-4321", para o nutricionista conferir para quem vai. */
export function formatarTelefone(normalizado: string): string {
  const nacional = normalizado.startsWith('55') ? normalizado.slice(2) : normalizado
  const ddd = nacional.slice(0, 2)
  const numero = nacional.slice(2)
  const corte = numero.length - 4
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`
}

/** A metade solta de um par (o que sobra ao cortar um emoji no meio), que o encodeURIComponent não aceita. */
const METADE_SOLTA = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/** O caractere de troca, U+FFFD. */
const TROCA = String.fromCharCode(0xfffd)

/** O texto com cada metade solta trocada por U+FFFD (CB-142). Usa o do navegador quando existe. */
function bemFormado(texto: string): string {
  const doNavegador = (texto as unknown as { readonly toWellFormed?: () => string }).toWellFormed
  return typeof doNavegador === 'function' ? doNavegador.call(texto) : texto.replace(METADE_SOLTA, TROCA)
}

/** O endereço que abre a conversa. Sem texto, abre a conversa vazia (CB-141); com texto, codificado (CB-142). */
export function linkDoWhatsApp(numero: string, texto: string): string {
  const base = `https://wa.me/${numero}`
  return texto.trim() === '' ? base : `${base}?text=${encodeURIComponent(bemFormado(texto))}`
}

/** "  Ana   Souza " → "Ana". Sem nome, vazio. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** "Oi, Ana!" ou, sem nome, "Oi!": nome que falta não deixa buraco no texto (CA-507). */
function saudacao(nome: string): string {
  const primeiro = primeiroNome(nome)
  return primeiro ? `Oi, ${primeiro}!` : 'Oi!'
}

/** No cartão do link, ao lado de "Copiar" (CA-508). Com a dieta no link, cita também o plano alimentar (CA-596). */
export function textoDoLink(nome: string, endereco: string, comDieta = false): string {
  return comDieta
    ? `${saudacao(nome)} Neste link estão suas missões e o seu plano alimentar:\n${endereco}\nAbra no celular, veja o plano e marque o que fizer a cada dia.`
    : `${saudacao(nome)} Este é o link das suas missões:\n${endereco}\nAbra no celular e marque o que fizer a cada dia.`
}

const ABERTURA_DO_CONTATO = {
  sumindo: 'Vi que faz alguns dias que você não marca as missões.',
  atencao: 'Vi que você marcou poucas missões nesta semana.',
} as const

/** Na Adesão, para quem está sumindo ou marcando pouco (CA-509). */
export function textoDeContato(nome: string, estado: keyof typeof ABERTURA_DO_CONTATO): string {
  return `${saudacao(nome)} Tudo bem? ${ABERTURA_DO_CONTATO[estado]} Como está indo com o plano? Se algo estiver difícil, me conte que a gente ajusta.`
}

/** No bloco "Hoje e esta semana": "sua consulta é dia X às Y", ou "é hoje às Y" no próprio dia (CA-510). */
export function textoDoLembrete(nome: string, consulta: { readonly dia: string; readonly hora: string | null }, hoje: string): string {
  const dia = consulta.dia === hoje ? 'hoje' : `dia ${dataCurta(consulta.dia)} (${diaDaSemana(consulta.dia)})`
  const horario = consulta.hora ? ` às ${consulta.hora}` : ''
  return `${saudacao(nome)} Lembrete: sua consulta é ${dia}${horario}. Até lá!`
}

/** No bloco "Hoje e esta semana", para o aniversariante; antes do dia, os parabéns vão adiantados (CA-511). */
export function textoDeParabens(nome: string, adiantado: boolean): string {
  const primeiro = primeiroNome(nome)
  const para = primeiro ? `, ${primeiro}` : ''
  return adiantado ? `Feliz aniversário adiantado${para}! Que o seu dia seja ótimo.` : `Feliz aniversário${para}! Um ótimo dia para você.`
}

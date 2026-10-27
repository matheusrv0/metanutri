// O número como o rótulo brasileiro escreve, no formulário de "Meus alimentos" (spec alimentos-e-gramaturas, D-497; G5
// da revisão da publicação 2). O resto do app continua com `lerNumero` (`caso.ts`, CB-12): lá, "70.500" de peso é decimal.

/** "1.200", "12.345,6": ponto de milhar num número que não começa por zero, com ou sem vírgula decimal. */
const COM_MILHAR = /^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/
/** "2,2", "15": vírgula decimal. */
const COM_VIRGULA = /^-?\d+(,\d+)?$/
/** "2.2", "0.500": o ponto que não é de milhar é decimal. */
const COM_PONTO = /^-?\d+\.\d+$/

/**
 * "1.200" mg de sódio é mil e duzentos, como no rótulo, não 1,2. O texto que não é número ("Tr", "3 g") vira `null`, e o
 * formulário marca o campo em vez de gravar "não informado" em silêncio; vazio também é `null` ("não informado").
 */
export function lerNumeroDoRotulo(texto: string): number | null {
  const s = texto.trim()
  if (COM_MILHAR.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'))
  if (COM_VIRGULA.test(s)) return Number(s.replace(',', '.'))
  if (COM_PONTO.test(s)) return Number(s)
  return null
}

/** O campo tem texto, e o texto não é número (D-497). */
export const ehIlegivel = (texto: string): boolean => texto.trim() !== '' && lerNumeroDoRotulo(texto) === null

export const MENSAGEM_ILEGIVEL = 'Digite só o número, sem a unidade. Traço: 0.'

// O campo vivo da landing (spec landing-escura, D-536): o que se digita escolhe o cartão do Cobrir do plano de exemplo.
import type { ChaveDaVitrine } from './exemploDaLanding.ts'

/** Sem acento, em minúscula, com os espaços normalizados. */
const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** "vitamina e", "vit e", "vit. e"; a letra sozinha no fim da palavra ("vitamina d3" não vale: o exemplo não tem D3). */
const VITAMINA_E = /\bvit(?:amina|\.)?\s*e\b/
const VITAMINA_D = /\bvit(?:amina|\.)?\s*d\b/

/** CA-1463 e CA-1465: cálcio, vitamina E ou vitamina D; qualquer outra coisa (ou nada) é `null`. */
export function chaveDaPergunta(texto: string): ChaveDaVitrine | null {
  const t = normalizar(texto)
  if (t.includes('calcio')) return 'calcio'
  if (VITAMINA_E.test(t)) return 'vitamina-e'
  if (VITAMINA_D.test(t)) return 'vitamina-d'
  return null
}

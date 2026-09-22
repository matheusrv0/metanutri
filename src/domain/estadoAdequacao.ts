// Em que faixa o nutriente caiu. Vive no domínio porque a tela e o documento usam a mesma regra.

export type EstadoAdequacao = 'dentro' | 'abaixo' | 'acima' | 'semdado'

/**
 * `null` é "a tabela não mediu", e nunca vira zero.
 * Abaixo de 90% falta; acima de 150% sobra; com limite superior, passar de 100% já é excesso.
 */
export function estadoDaAdequacao(pct: number | null, temLimite = false): EstadoAdequacao {
  if (pct === null) return 'semdado'
  if (temLimite && pct > 100) return 'acima'
  if (pct < 90) return 'abaixo'
  if (pct > 150) return 'acima'
  return 'dentro'
}

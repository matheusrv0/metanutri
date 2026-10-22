// A vitamina A pré-formada (retinol) de cada alimento (spec sugestoes-com-criterio, seção 9, D-470 e D-471).
//
// O limite superior (UL) da vitamina A vale para a pré-formada, que vem de alimento de origem animal, de alimento
// fortificado e de suplemento; os carotenoides dos vegetais não têm limite (IOM, 2001). Na TACO, a vitamina A (RAE) das
// carnes e dos pescados é igual à coluna de retinol; leite, queijo e ovo vêm sem RAE (CB-440).
import { PRIMEIRO_ID_PROPRIO } from './busca.ts'
import type { Alimento } from './tipos.ts'

const ORIGEM_ANIMAL: ReadonlySet<string> = new Set(['Carnes e derivados', 'Pescados e frutos do mar', 'Ovos e derivados', 'Leite e derivados'])

/** CB-441: no alimento próprio, só os grupos de frutas e de verduras trazem a vitamina A como carotenoide. */
const GRUPOS_DE_CAROTENOIDE: ReadonlySet<string> = new Set(['Frutas e derivados', 'Verduras, hortaliças e derivados'])

/** Fígado (de boi ou de frango) e sarapatel, que leva fígado: a fonte mais concentrada de retinol (D-471, D-472). */
export const FIGADO = /(f[ií]gado|sarapatel)/i

/** Verdadeiro quando a vitamina A do alimento é pré-formada (retinol) e conta para o limite superior. */
export function vitaminaAEhPreFormada(alimento: Pick<Alimento, 'id' | 'descricao' | 'categoria'>): boolean {
  if (FIGADO.test(alimento.descricao) || ORIGEM_ANIMAL.has(alimento.categoria)) return true
  // No rótulo, a vitamina A é quase sempre adicionada, e a adicionada é pré-formada.
  return alimento.id >= PRIMEIRO_ID_PROPRIO && !GRUPOS_DE_CAROTENOIDE.has(alimento.categoria)
}

/** A vitamina A pré-formada em 100 g, em µg; sem o dado ou carotenoide, 0. */
export function vitaminaAPreFormadaPorCem(alimento: Alimento): number {
  if (!vitaminaAEhPreFormada(alimento)) return 0
  const valor = alimento.nutrientes.vitamina_a_rae_mcg
  return typeof valor === 'number' && valor > 0 ? valor : 0
}

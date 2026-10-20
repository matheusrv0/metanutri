// A receita dos testes (spec receitas-com-calculo). O nome não termina em `.test.ts`, então o Vitest não roda este
// arquivo como teste.
//
// Panqueca de banana, com alimentos reais da TACO (valores por 100 g):
// 182 Banana, prata, crua              kcal 98.2497  · vitamina A 16.2083 · vitamina C 21.59
// 489 Ovo, de galinha, inteiro, cru    kcal 143.1117 · vitamina A null    · vitamina C null
// 7   Aveia, flocos, crua              kcal 393.8227 · vitamina A null    · vitamina C 1.35
// 150 g de banana + 100 g de ovo + 30 g de aveia = 280 g de massa; pronta, pesa 240 g e rende 2 unidades de 120 g.
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import type { ItemPlano, ReceitaDoPlano } from './tipos.ts'

export const PANQUECA: ReceitaDoPlano = {
  origemId: 'r-panqueca',
  nome: 'Panqueca de banana',
  ingredientes: [
    { alimentoId: 182, gramas: 150 },
    { alimentoId: 489, gramas: 100 },
    { alimentoId: 7, gramas: 30 },
  ],
  porcoes: 2,
  nomeDaPorcao: 'unidade',
  pesoProntoG: 240,
  preparo: 'Amasse a banana, misture o ovo e a aveia.\nDoure dos dois lados.',
}

/** A energia de uma panqueca (uma porção): a soma dos ingredientes dividida por 2. */
export const KCAL_DA_PANQUECA = (98.2497 * 1.5 + 143.1117 * 1 + 393.8227 * 0.3) / 2

/** A vitamina C de uma panqueca: banana e aveia têm; o ovo não. */
export const VITAMINA_C_DA_PANQUECA = (21.59 * 1.5 + 1.35 * 0.3) / 2

/** Um item do plano com a cópia da receita. */
export const itemDeReceita = (id: string, gramas: number, receita: ReceitaDoPlano = PANQUECA): ItemPlano => ({
  id,
  alimentoId: ID_DE_RECEITA,
  gramas,
  receita,
})

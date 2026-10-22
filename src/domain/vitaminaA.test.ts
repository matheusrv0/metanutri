import { buscarAlimento } from './tabelas.ts'
import type { Alimento } from './tipos.ts'
import { vitaminaAEhPreFormada, vitaminaAPreFormadaPorCem } from './vitaminaA.ts'

// Spec sugestoes-com-criterio, seção 9: D-470 (a vitamina A pré-formada) e CB-440, CB-441.
const daBase = (id: number): Alimento => {
  const a = buscarAlimento(id)
  if (!a) throw new Error(`alimento ${id} fora da base`)
  return a
}

const proprio = (categoria: string, vitaminaA: number | null): Alimento => ({
  ...daBase(66),
  id: 900_123,
  descricao: 'Produto da conta',
  categoria,
  nutrientes: { ...daBase(66).nutrientes, vitamina_a_rae_mcg: vitaminaA },
})

describe('vitamina A pré-formada (D-470)', () => {
  it('conta a vitamina A dos alimentos de origem animal e do fígado como pré-formada', () => {
    // 356 Fígado bovino grelhado (14.574 µg na TACO, igual à coluna de retinol); 377 Patinho grelhado.
    expect(vitaminaAEhPreFormada(daBase(356))).toBe(true)
    expect(vitaminaAPreFormadaPorCem(daBase(356))).toBeCloseTo(14574, 0)
    expect(vitaminaAEhPreFormada(daBase(377))).toBe(true)
    // 458 Leite integral (sem RAE na TACO, CB-440): é pré-formada, mas sem número conta 0.
    expect(vitaminaAEhPreFormada(daBase(458))).toBe(true)
    expect(vitaminaAPreFormadaPorCem(daBase(458))).toBe(0)
    // Sarapatel fica entre os pratos preparados, e leva fígado.
    const sarapatel = daBase(548)
    expect(sarapatel.descricao).toMatch(/Sarapatel/)
    expect(vitaminaAEhPreFormada(sarapatel)).toBe(true)
  })

  it('a vitamina A dos vegetais é carotenoide e não conta', () => {
    // 66 Abóbora menina crua; 596 Pupunha cozida; 546 Salada de legumes no vapor.
    for (const id of [66, 596, 546]) {
      expect(vitaminaAEhPreFormada(daBase(id)), daBase(id).descricao).toBe(false)
      expect(vitaminaAPreFormadaPorCem(daBase(id))).toBe(0)
    }
  })

  it('CB-441: o alimento próprio conta como pré-formada fora de frutas e verduras', () => {
    expect(vitaminaAEhPreFormada(proprio('Frutas e derivados', 500))).toBe(false)
    expect(vitaminaAEhPreFormada(proprio('Verduras, hortaliças e derivados', 500))).toBe(false)
    expect(vitaminaAEhPreFormada(proprio('Cereais e derivados', 500))).toBe(true)
    expect(vitaminaAEhPreFormada(proprio('Suplementos', 500))).toBe(true)
    expect(vitaminaAEhPreFormada(proprio('Meus alimentos', 500))).toBe(true)
    expect(vitaminaAPreFormadaPorCem(proprio('Meus alimentos', 500))).toBe(500)
    expect(vitaminaAPreFormadaPorCem(proprio('Meus alimentos', null))).toBe(0)
  })

  it('o alimento próprio com "fígado" no nome conta, em qualquer grupo', () => {
    expect(vitaminaAEhPreFormada({ ...proprio('Verduras, hortaliças e derivados', 900), descricao: 'Patê de fígado' })).toBe(true)
  })
})

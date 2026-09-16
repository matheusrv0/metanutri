import { medidaEquivalente } from './busca.ts'
import { calcularSubstituto } from './substitutos.ts'
import { buscarAlimento } from './tabelas.ts'

// TACO por 100 g (dados-brutos/taco/taco_composicao.csv):
// 410 Frango, peito, sem pele, grelhado          kcal 159.185  · prot 32.0333 · carb 0       · lip 2.4837
// 377 Carne, bovina, patinho, sem gordura, grelh. kcal 219.2593 · prot 35.9    · carb 0       · lip 7.3133
// 3   Arroz, tipo 1, cozido                      kcal 128.2585 · prot 2.5208  · carb 28.0598 · lip 0.227
// 91  Batata, inglesa, cozida                    kcal 51.5885  · prot 1.1646  · carb 11.9438 · lip 0
// 272 Óleo, de soja                              kcal 884      · prot null    · carb null    · lip 100
const FRANGO = 410
const PATINHO = 377
const ARROZ = 3
const BATATA = 91
const OLEO = 272

describe('calcularSubstituto', () => {
  it('CA-41: por proteína, 100 g de frango equivalem a 89 g de patinho', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, PATINHO, 'proteina', buscarAlimento)
    expect(r.motivoSemCalculo).toBeNull()
    expect(r.gramas).toBe(89) // 32,0333 / 35,9 × 100 = 89,2 g
  })

  it('CA-41: por kcal (padrão), 100 g de frango equivalem a 73 g de patinho', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, PATINHO, 'kcal', buscarAlimento)
    expect(r.gramas).toBe(73) // 159,185 / 219,2593 × 100 = 72,6 g
  })

  it('CA-41: por carboidrato, 150 g de arroz equivalem a 352 g de batata cozida', () => {
    const r = calcularSubstituto({ alimentoId: ARROZ, gramas: 150 }, BATATA, 'carboidrato', buscarAlimento)
    expect(r.gramas).toBe(352) // 28,0598 × 1,5 / 11,9438 × 100 = 352,4 g
  })

  it('CA-42: mostra a porção também em medida caseira', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, PATINHO, 'proteina', buscarAlimento)
    expect(r.medida).not.toBeNull()
    expect(r.medida).toEqual(medidaEquivalente(PATINHO, 89))
    const semMedida = calcularSubstituto({ alimentoId: ARROZ, gramas: 150 }, BATATA, 'carboidrato', buscarAlimento)
    expect(semMedida.medida).toEqual(medidaEquivalente(BATATA, 352))
  })

  it('CA-42: mostra a diferença de kcal e macros em relação ao original, com a porção arredondada', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, PATINHO, 'proteina', buscarAlimento)
    expect(r.diferencas.energia_kcal).toBeCloseTo(219.2593 * 0.89 - 159.185, 3)
    expect(r.diferencas.proteina_g).toBeCloseTo(35.9 * 0.89 - 32.0333, 3)
    expect(r.diferencas.carboidrato_g).toBeCloseTo(0, 6)
    expect(r.diferencas.lipideos_g).toBeCloseTo(7.3133 * 0.89 - 2.4837, 3)
  })

  it('substituto sem o nutriente do critério não é calculado e explica', () => {
    const r = calcularSubstituto({ alimentoId: ARROZ, gramas: 100 }, FRANGO, 'carboidrato', buscarAlimento)
    expect(r.gramas).toBeNull()
    expect(r.motivoSemCalculo).toMatch(/Frango, peito, sem pele, grelhado não tem carboidrato/)
  })

  it('substituto com o nutriente não analisado não é calculado', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, OLEO, 'proteina', buscarAlimento)
    expect(r.gramas).toBeNull()
    expect(r.motivoSemCalculo).toMatch(/não tem proteína/)
  })

  it('original sem o nutriente do critério não é calculado', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, BATATA, 'carboidrato', buscarAlimento)
    expect(r.gramas).toBeNull()
    expect(r.motivoSemCalculo).toMatch(/alimento original não tem carboidrato/)
  })

  it('original com 0 g dá substituto de 0 g', () => {
    const r = calcularSubstituto({ alimentoId: FRANGO, gramas: 0 }, PATINHO, 'kcal', buscarAlimento)
    expect(r.gramas).toBe(0)
    expect(r.diferencas.energia_kcal).toBe(0)
  })

  it('alimento inexistente é erro de programação', () => {
    expect(() => calcularSubstituto({ alimentoId: FRANGO, gramas: 100 }, 99999, 'kcal', buscarAlimento)).toThrow(/99999/)
  })
})

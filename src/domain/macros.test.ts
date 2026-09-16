import { calcularMacros } from './macros.ts'
import type { Totais } from './totais.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'
import type { ChaveNutrienteAlimento } from './tipos.ts'

const totais = (v: Partial<Record<ChaveNutrienteAlimento, number>>): Totais => ({
  itens: 1,
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, { total: v[k] ?? 0, semDado: 0 }])) as Totais['nutrientes'],
})

// Plano de 2000 kcal: 100 g proteína (400 kcal = 20%), 250 g carboidrato (1000 kcal = 50%), 60 g gordura (540 kcal = 27%)
const PLANO_2000 = totais({ energia_kcal: 2000, proteina_g: 100, carboidrato_g: 250, lipideos_g: 60 })

describe('calcularMacros', () => {
  it('CA-22: gramas, % das kcal do plano e proteína em g/kg', () => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: 80 })
    expect(m.proteina.gramas).toBe(100)
    expect(m.proteina.pctKcal).toBeCloseTo(20, 6)
    expect(m.carboidrato.pctKcal).toBeCloseTo(50, 6)
    expect(m.gordura.pctKcal).toBeCloseTo(27, 6)
    expect(m.proteina.gPorKg).toBeCloseTo(1.25, 6)
    expect(m.kcal).toBe(2000)
  })

  it('CA-23: adulto usa faixas AMDR 10-35 / 45-65 / 20-35 e indica o estado', () => {
    const m = calcularMacros(totais({ energia_kcal: 2000, proteina_g: 40, carboidrato_g: 350, lipideos_g: 90 }), { idadeAnos: 30, pesoKg: 70 })
    expect(m.faixa).toBe('adulto')
    expect(m.proteina.meta).toEqual({ tipo: 'pct', min: 10, max: 35 })
    expect(m.proteina.estado).toBe('abaixo') // 8%
    expect(m.carboidrato.estado).toBe('acima') // 70%
    expect(m.gordura.estado).toBe('acima') // 40,5%
    expect(m.proteina.origemMeta).toBe('amdr')
  })

  it('limites da faixa contam como dentro, tolerando erro de arredondamento', () => {
    // proteína 10%, carboidrato 65%, gordura 19,99999999998% (deve contar como 20%)
    const m = calcularMacros(totais({ energia_kcal: 1000, proteina_g: 25, carboidrato_g: 162.5, lipideos_g: 22.2222222222 }), { idadeAnos: 30, pesoKg: 70 })
    expect(m.proteina.estado).toBe('dentro')
    expect(m.carboidrato.estado).toBe('dentro')
    expect(m.gordura.estado).toBe('dentro')
  })

  it.each([
    [2, '1-3', { min: 5, max: 20 }, { min: 30, max: 40 }],
    [10, '4-18', { min: 10, max: 30 }, { min: 25, max: 35 }],
    [18, '4-18', { min: 10, max: 30 }, { min: 25, max: 35 }],
    [19, 'adulto', { min: 10, max: 35 }, { min: 20, max: 35 }],
  ])('CA-31a: idade %i usa a faixa %s', (idade, faixa, proteina, gordura) => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: idade, pesoKg: 30 })
    expect(m.faixa).toBe(faixa)
    expect(m.proteina.meta).toEqual({ tipo: 'pct', ...proteina })
    expect(m.gordura.meta).toEqual({ tipo: 'pct', ...gordura })
  })

  it('CA-24: meta do usuário em % substitui a AMDR', () => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: 80 }, { carboidrato: { tipo: 'pct', min: 40, max: 45 } })
    expect(m.carboidrato.meta).toEqual({ tipo: 'pct', min: 40, max: 45 })
    expect(m.carboidrato.origemMeta).toBe('usuario')
    expect(m.carboidrato.estado).toBe('acima')
    expect(m.gordura.origemMeta).toBe('amdr')
  })

  it('CA-24: meta de proteína em g/kg', () => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: 80 }, { proteina: { tipo: 'g_kg', min: 1.6, max: 2.2 } })
    expect(m.proteina.estado).toBe('abaixo') // 1,25 g/kg
    const dentro = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: 50 }, { proteina: { tipo: 'g_kg', min: 1.6, max: 2.2 } })
    expect(dentro.proteina.estado).toBe('dentro') // 2,0 g/kg
    const acima = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: 40 }, { proteina: { tipo: 'g_kg', min: 1.6, max: 2.2 } })
    expect(acima.proteina.estado).toBe('acima') // 2,5 g/kg
  })

  it('CB-01: sem peso não há g/kg e meta em g/kg fica sem estado', () => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: 30, pesoKg: null }, { proteina: { tipo: 'g_kg', min: 1.2, max: 2 } })
    expect(m.proteina.gPorKg).toBeNull()
    expect(m.proteina.estado).toBeNull()
  })

  it('CB-01: sem idade, a faixa AMDR não é escolhida', () => {
    const m = calcularMacros(PLANO_2000, { idadeAnos: null, pesoKg: 70 })
    expect(m.faixa).toBeNull()
    expect(m.carboidrato.estado).toBeNull()
    expect(m.carboidrato.pctKcal).toBeCloseTo(50, 6)
  })

  it('CB-05: plano vazio tem percentuais nulos e sem estado', () => {
    const m = calcularMacros(totais({}), { idadeAnos: 30, pesoKg: 70 })
    expect(m.proteina.pctKcal).toBeNull()
    expect(m.proteina.estado).toBeNull()
  })
})

import curvas from './curvas-oms.json'

type Linha = { meses: number; L: number; M: number; S: number; sd2neg: number; sd2: number; sd3neg: number; sd3: number }

/** Valor da medida para um escore-z, pela fórmula LMS da OMS. */
const valorEmZ = (r: Linha, z: number) => (r.L === 0 ? r.M * Math.exp(r.S * z) : r.M * Math.pow(1 + r.L * r.S * z, 1 / r.L))

const todas: Array<[string, Linha[]]> = [
  ['imc M', curvas.imcIdade.M],
  ['imc F', curvas.imcIdade.F],
  ['estatura M', curvas.estaturaIdade.M],
  ['estatura F', curvas.estaturaIdade.F],
]

describe('curvas-oms.json', () => {
  it.each(todas)('%s cobre de 12 a 228 meses, um registro por mês', (_, linhas) => {
    expect(linhas).toHaveLength(217)
    expect(linhas.map((l) => l.meses)).toEqual(Array.from({ length: 217 }, (_, i) => 12 + i))
  })

  it.each(todas)('%s: LMS reproduzem as colunas de escore-z ±2 e ±3 da planilha oficial', (_, linhas) => {
    for (const r of linhas) {
      expect(valorEmZ(r, 2)).toBeCloseTo(r.sd2, 2)
      expect(valorEmZ(r, -2)).toBeCloseTo(r.sd2neg, 2)
      expect(valorEmZ(r, 3)).toBeCloseTo(r.sd3, 2)
      expect(valorEmZ(r, -3)).toBeCloseTo(r.sd3neg, 2)
    }
  })

  // Valores lidos na primeira linha das planilhas da Referência OMS 2007 (61 meses) em 15/09/2026.
  it.each([
    ['imc M', curvas.imcIdade.M, { L: -0.7387, M: 15.2641, S: 0.0839 }],
    ['imc F', curvas.imcIdade.F, { L: -0.8886, M: 15.2441, S: 0.09692 }],
    ['estatura M', curvas.estaturaIdade.M, { L: 1, M: 110.2647, S: 0.04164 }],
    ['estatura F', curvas.estaturaIdade.F, { L: 1, M: 109.6016, S: 0.04355 }],
  ] as const)('%s aos 61 meses', (_, linhas, esperado) => {
    expect(linhas.find((l) => l.meses === 61)).toMatchObject(esperado)
  })
})

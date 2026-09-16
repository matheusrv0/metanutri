import tabela from './alimentos.json'

// Valores de referência lidos diretamente do CSV bruto (dados-brutos/taco/taco_composicao.csv)
// em 15/09/2026, com um parser independente do script de importação.
const AMOSTRAS: ReadonlyArray<{
  id: number
  descricao: string
  energia_kcal: number
  ferro_mg: number
  calcio_mg: number
  vitamina_c_mg: number | null
  vitamina_a_rae_mcg: number | null
}> = [
  { id: 1, descricao: 'Arroz, integral, cozido', energia_kcal: 123.5349, ferro_mg: 0.262, calcio_mg: 5.204, vitamina_c_mg: null, vitamina_a_rae_mcg: null },
  { id: 3, descricao: 'Arroz, tipo 1, cozido', energia_kcal: 128.2585, ferro_mg: 0.0767, calcio_mg: 3.5443, vitamina_c_mg: null, vitamina_a_rae_mcg: null },
  { id: 25, descricao: 'Cereal matinal, milho', energia_kcal: 365.3542, ferro_mg: 3.05, calcio_mg: 142.9233, vitamina_c_mg: 17.2933, vitamina_a_rae_mcg: 15.4583 },
  { id: 100, descricao: 'Brócolis, cozido', energia_kcal: 24.6362, ferro_mg: 0.535, calcio_mg: 50.754, vitamina_c_mg: 42.0033, vitamina_a_rae_mcg: null },
  { id: 237, descricao: 'Mexerica, Murcote, crua', energia_kcal: 57.5928, ferro_mg: 0.0693, calcio_mg: 33.07, vitamina_c_mg: 21.7957, vitamina_a_rae_mcg: null },
  { id: 300, descricao: 'Manjuba, frita', energia_kcal: 349.3252, ferro_mg: 0.9163, calcio_mg: 575.029, vitamina_c_mg: null, vitamina_a_rae_mcg: 12.0667 },
  { id: 410, descricao: 'Frango, peito, sem pele, grelhado', energia_kcal: 159.185, ferro_mg: 0.3287, calcio_mg: 5.3443, vitamina_c_mg: null, vitamina_a_rae_mcg: 0 },
  { id: 488, descricao: 'Ovo, de galinha, inteiro, cozido/10minutos', energia_kcal: 145.7002, ferro_mg: 1.5153, calcio_mg: 49.2183, vitamina_c_mg: null, vitamina_a_rae_mcg: null },
  { id: 530, descricao: 'Bolinho de arroz', energia_kcal: 273.5143, ferro_mg: 2.1227, calcio_mg: 23.5697, vitamina_c_mg: 0, vitamina_a_rae_mcg: null },
  { id: 597, descricao: 'Noz, crua', energia_kcal: 620.06, ferro_mg: 2.035, calcio_mg: 105.3063, vitamina_c_mg: 0, vitamina_a_rae_mcg: null },
]

// Cobertura publicada no dicionário de dados do repositório de origem (dados-brutos/taco/dicionario-dados.md).
const COBERTURA_PUBLICADA: Readonly<Record<string, number>> = {
  energia_kcal: 591,
  fibra_g: 362,
  vitamina_c_mg: 369,
  vitamina_a_rae_mcg: 255,
  niacina_mg: 565,
  colesterol_mg: 266,
}

type Alimento = (typeof tabela.alimentos)[number]
type ChaveNutriente = keyof Alimento['nutrientes']

const porId = (id: number): Alimento => {
  const alimento = tabela.alimentos.find((a) => a.id === id)
  if (!alimento) throw new Error(`Alimento ${id} não encontrado`)
  return alimento
}

describe('alimentos.json (TACO)', () => {
  it('contém os 597 alimentos com ids únicos', () => {
    expect(tabela.alimentos).toHaveLength(597)
    expect(new Set(tabela.alimentos.map((a) => a.id)).size).toBe(597)
  })

  it.each(AMOSTRAS)('confere valores do alimento $id ($descricao) com o CSV bruto', (amostra) => {
    const alimento = porId(amostra.id)
    expect(alimento.descricao).toBe(amostra.descricao)
    const n = alimento.nutrientes
    expect(n.energia_kcal).toBeCloseTo(amostra.energia_kcal, 3)
    expect(n.ferro_mg).toBeCloseTo(amostra.ferro_mg, 3)
    expect(n.calcio_mg).toBeCloseTo(amostra.calcio_mg, 3)
    if (amostra.vitamina_c_mg === null) expect(n.vitamina_c_mg).toBeNull()
    else expect(n.vitamina_c_mg).toBeCloseTo(amostra.vitamina_c_mg, 3)
    if (amostra.vitamina_a_rae_mcg === null) expect(n.vitamina_a_rae_mcg).toBeNull()
    else expect(n.vitamina_a_rae_mcg).toBeCloseTo(amostra.vitamina_a_rae_mcg, 3)
  })

  it('CA-32: nutriente não analisado é null, não zero', () => {
    const arroz = porId(1)
    expect(arroz.nutrientes.vitamina_c_mg).toBeNull()
    expect(arroz.tracos).not.toContain('vitamina_c_mg')
  })

  it('traço (Tr) vira 0 e fica registrado em `tracos`', () => {
    expect(porId(3).nutrientes.tiamina_mg).toBe(0)
    expect(porId(3).tracos).toContain('tiamina_mg')
    expect(porId(410).tracos).toContain('vitamina_a_rae_mcg')
  })

  it.each(Object.entries(COBERTURA_PUBLICADA))('cobertura de %s bate com o dicionário publicado (%i alimentos)', (chave, esperado) => {
    const comDado = tabela.alimentos.filter((a) => a.nutrientes[chave as ChaveNutriente] !== null).length
    expect(comDado).toBe(esperado)
  })

  it('todo nutriente declarado existe em todos os alimentos', () => {
    const chaves = tabela.nutrientes.map((n) => n.chave)
    for (const alimento of tabela.alimentos) {
      expect(Object.keys(alimento.nutrientes).sort()).toEqual([...chaves].sort())
    }
  })

  it('declara a fonte', () => {
    expect(tabela.fonte.nome).toContain('TACO')
    expect(tabela.fonte.ano).toBe(2011)
  })
})

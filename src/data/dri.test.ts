import dri from './dri.json'

// Conferência independente: valores digitados à mão a partir das tabelas do NASEM (2019, Apêndice J,
// NCBI NBK545442) em 15/09/2026. Unidades já convertidas para as da TACO (cobre e fósforo em mg).
type Campo = 'ear' | 'rda' | 'ai' | 'ul'
const CONFERIDOS: ReadonlyArray<[estagio: string, nutriente: string, campo: Campo, valor: number | null]> = [
  // EAR (tabela 1)
  ['crianca-1-3', 'ferro_mg', 'ear', 3],
  ['crianca-1-3', 'calcio_mg', 'ear', 500],
  ['crianca-4-8', 'ferro_mg', 'ear', 4.1],
  ['masculino-19-30', 'magnesio_mg', 'ear', 330],
  ['masculino-31-50', 'magnesio_mg', 'ear', 350],
  ['feminino-19-30', 'ferro_mg', 'ear', 8.1],
  ['feminino-51-70', 'ferro_mg', 'ear', 5],
  ['feminino-19-30', 'vitamina_c_mg', 'ear', 60],
  ['masculino-14-18', 'cobre_mg', 'ear', 0.685],
  ['gestante-14-18', 'ferro_mg', 'ear', 23],
  ['lactante-19-30', 'vitamina_a_rae_mcg', 'ear', 900],
  ['feminino-19-30', 'proteina_g_kg', 'ear', 0.66],
  ['feminino-19-30', 'potassio_mg', 'ear', null],
  ['feminino-19-30', 'manganes_mg', 'ear', null],
  // RDA (tabelas 2, 3 e 4)
  ['crianca-1-3', 'ferro_mg', 'rda', 7],
  ['crianca-4-8', 'calcio_mg', 'rda', 1000],
  ['masculino-9-13', 'calcio_mg', 'rda', 1300],
  ['masculino-19-30', 'ferro_mg', 'rda', 8],
  ['masculino-31-50', 'magnesio_mg', 'rda', 420],
  ['masculino-51-70', 'piridoxina_mg', 'rda', 1.7],
  ['masculino-71+', 'calcio_mg', 'rda', 1200],
  ['masculino-71+', 'vitamina_d_mcg', 'rda', 20],
  ['feminino-14-18', 'ferro_mg', 'rda', 15],
  ['feminino-19-30', 'ferro_mg', 'rda', 18],
  ['feminino-19-30', 'magnesio_mg', 'rda', 310],
  ['feminino-19-30', 'zinco_mg', 'rda', 8],
  ['feminino-19-30', 'cobre_mg', 'rda', 0.9],
  ['feminino-19-30', 'vitamina_a_rae_mcg', 'rda', 700],
  ['feminino-51-70', 'calcio_mg', 'rda', 1200],
  ['gestante-19-30', 'ferro_mg', 'rda', 27],
  ['gestante-19-30', 'folato_dfe_mcg', 'rda', 600],
  ['gestante-14-18', 'fosforo_mg', 'rda', 1250],
  ['lactante-19-30', 'vitamina_a_rae_mcg', 'rda', 1300],
  ['lactante-19-30', 'ferro_mg', 'rda', 9],
  ['lactante-19-30', 'proteina_g', 'rda', 71],
  ['feminino-19-30', 'proteina_g', 'rda', 46],
  // AI (valores com asterisco)
  ['masculino-19-30', 'potassio_mg', 'ai', 3400],
  ['feminino-19-30', 'potassio_mg', 'ai', 2600],
  ['feminino-19-30', 'sodio_mg', 'ai', 1500],
  ['crianca-1-3', 'sodio_mg', 'ai', 800],
  ['feminino-19-30', 'manganes_mg', 'ai', 1.8],
  ['masculino-19-30', 'fibra_g', 'ai', 38],
  ['feminino-51-70', 'fibra_g', 'ai', 21],
  ['crianca-1-3', 'fibra_g', 'ai', 19],
  ['feminino-19-30', 'ferro_mg', 'ai', null],
  // UL (tabelas 8 e 9)
  ['crianca-1-3', 'ferro_mg', 'ul', 40],
  ['feminino-19-30', 'ferro_mg', 'ul', 45],
  ['feminino-19-30', 'calcio_mg', 'ul', 2500],
  ['feminino-51-70', 'calcio_mg', 'ul', 2000],
  ['feminino-19-30', 'fosforo_mg', 'ul', 4000],
  ['gestante-14-18', 'fosforo_mg', 'ul', 3500],
  ['masculino-71+', 'fosforo_mg', 'ul', 3000],
  ['feminino-19-30', 'cobre_mg', 'ul', 10],
  ['crianca-1-3', 'zinco_mg', 'ul', 7],
  ['feminino-19-30', 'vitamina_c_mg', 'ul', 2000],
  ['gestante-14-18', 'vitamina_a_rae_mcg', 'ul', 2800],
  ['feminino-19-30', 'tiamina_mg', 'ul', null],
  ['feminino-19-30', 'potassio_mg', 'ul', null],
  ['feminino-19-30', 'sodio_mg', 'ul', null],
]

const MICROS_DA_TACO = [
  'calcio_mg', 'magnesio_mg', 'manganes_mg', 'fosforo_mg', 'ferro_mg', 'sodio_mg', 'potassio_mg', 'cobre_mg',
  'zinco_mg', 'vitamina_a_rae_mcg', 'tiamina_mg', 'riboflavina_mg', 'piridoxina_mg', 'niacina_mg', 'vitamina_c_mg', 'fibra_g',
] as const

type Valores = Record<string, Record<string, Record<Campo, number | null> | undefined> | undefined>
const valores = dri.valores as Valores

describe('dri.json (NASEM 2019)', () => {
  it('tem os 20 estágios de vida a partir de 1 ano, sem bebês (SPEC D-1)', () => {
    expect(dri.estagios).toHaveLength(20)
    expect(Math.min(...dri.estagios.map((e) => e.idadeMin))).toBe(1)
    expect(dri.estagios.filter((e) => e.gestante)).toHaveLength(3)
    expect(dri.estagios.filter((e) => e.lactante)).toHaveLength(3)
  })

  it.each(CONFERIDOS)('%s · %s · %s = %s', (estagio, nutriente, campo, esperado) => {
    const v = valores[estagio]?.[nutriente]
    if (esperado === null) {
      expect(v?.[campo] ?? null).toBeNull()
    } else {
      expect(v?.[campo]).toBeCloseTo(esperado, 6)
    }
  })

  it('CA-29: todo estágio tem RDA ou AI para cada micronutriente da TACO', () => {
    for (const e of dri.estagios) {
      for (const n of MICROS_DA_TACO) {
        const v = valores[e.id]?.[n]
        expect(v?.rda ?? v?.ai ?? null, `${e.id} · ${n}`).not.toBeNull()
      }
    }
  })

  it('RDA e AI nunca coexistem no mesmo estágio e nutriente', () => {
    for (const e of dri.estagios) {
      for (const [n, v] of Object.entries(valores[e.id] ?? {})) {
        expect(v?.rda !== null && v?.ai !== null, `${e.id} · ${n}`).toBe(false)
      }
    }
  })

  it('registra quando o UL não se aplica à ingestão por alimentos', () => {
    expect(dri.nutrientes.magnesio_mg.ul.escopo).toBe('farmacologico')
    expect(dri.nutrientes.niacina_mg.ul.escopo).toBe('sintetica')
    expect(dri.nutrientes.folato_dfe_mcg.ul.escopo).toBe('sintetica')
    expect(dri.nutrientes.vitamina_e_mg.ul.escopo).toBe('sintetica')
    expect(dri.nutrientes.vitamina_a_rae_mcg.ul.escopo).toBe('vitamina-a-pre-formada')
    expect(dri.nutrientes.ferro_mg.ul.escopo).toBe('total')
  })

  it('CDRR do sódio por faixa etária', () => {
    expect(dri.sodioCdrr).toEqual([
      { idadeMin: 1, idadeMax: 3, valor: 1200 },
      { idadeMin: 4, idadeMax: 8, valor: 1500 },
      { idadeMin: 9, idadeMax: 13, valor: 1800 },
      { idadeMin: 14, idadeMax: 18, valor: 2300 },
      { idadeMin: 19, idadeMax: null, valor: 2300 },
    ])
  })

  it('AMDR por faixa etária (% das kcal)', () => {
    const [pequenos, jovens, adultos] = dri.amdr
    expect(pequenos).toMatchObject({ gordura_pct: { min: 30, max: 40 }, carboidrato_pct: { min: 45, max: 65 }, proteina_pct: { min: 5, max: 20 } })
    expect(jovens).toMatchObject({ gordura_pct: { min: 25, max: 35 }, proteina_pct: { min: 10, max: 30 } })
    expect(adultos).toMatchObject({ gordura_pct: { min: 20, max: 35 }, proteina_pct: { min: 10, max: 35 } })
  })

  it('declara a fonte', () => {
    expect(dri.fonte.url).toBe('https://www.ncbi.nlm.nih.gov/books/NBK545442/')
  })
})

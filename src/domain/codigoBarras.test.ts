import { buscarRotuloPorCodigo, ehCodigoValido, IDENTIFICACAO_OFF, nutrientesPor100 } from './codigoBarras.ts'

const respostaOk = (corpo: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(corpo) } as Response)

const LEITE = {
  status: 1,
  product: {
    product_name: 'Leite integral',
    brands: 'Marca Y, Outra',
    quantity: '1 L',
    serving_size: '200 ml',
    serving_quantity: 200,
    serving_quantity_unit: 'ml',
    nutriments: {
      'energy-kcal_100g': 60,
      carbohydrates_100g: 4.7,
      sugars_100g: 4.7,
      proteins_100g: 3.2,
      fat_100g: 3.3,
      'saturated-fat_100g': 2,
      fiber_100g: 0,
      sodium_100g: 0.05,
      calcium_100g: 0.12,
    },
  },
}

describe('código de barras', () => {
  it('valida o dígito verificador de EAN-13 e EAN-8', () => {
    expect(ehCodigoValido('7891000100103')).toBe(true)
    expect(ehCodigoValido('7891000100104')).toBe(false)
    expect(ehCodigoValido('96385074')).toBe(true)
    expect(ehCodigoValido('123')).toBe(false)
    expect(ehCodigoValido('')).toBe(false)
  })

  it('CA-1134 e CA-1137 (spec alimentos-e-gramaturas, D-382): traz o rótulo por 100 ml, e a porção vira só a medida', async () => {
    const buscar = vi.fn(() => respostaOk(LEITE))
    const achado = await buscarRotuloPorCodigo('7891000100103', { buscar: buscar as unknown as typeof fetch })
    expect(achado?.nome).toBe('Leite integral')
    expect(achado?.marca).toBe('Marca Y')
    expect(achado?.unidade).toBe('ml')
    expect(achado?.porcao).toEqual({ gramas: 200, texto: '200 ml' })
    // Por 100 ml, como a base publica: nada é multiplicado pela porção.
    expect(achado?.por100.energia_kcal).toBe(60)
    expect(achado?.por100.proteina_g).toBe(3.2)
    // Sódio e cálcio vêm em gramas na base e saem em miligramas.
    expect(achado?.por100.sodio_mg).toBe(50)
    expect(achado?.por100.calcio_mg).toBe(120)
    expect(achado?.fonte).toBe('Open Food Facts')
  })

  it('CA-1133: sem porção na base, os valores continuam por 100 g e a porção fica vazia', async () => {
    const semPorcao = { status: 1, product: { product_name: 'Granola', nutriments: { 'energy-kcal_100g': 420, proteins_100g: 10 } } }
    const achado = await buscarRotuloPorCodigo('7891000100103', { buscar: vi.fn(() => respostaOk(semPorcao)) as unknown as typeof fetch })
    expect(achado?.porcao).toBeNull()
    expect(achado?.unidade).toBe('g')
    expect(achado?.por100.energia_kcal).toBe(420)
    expect(achado?.por100.carboidrato_g).toBeNull()
  })

  it('CA-1135: lê os micros que a adequação usa, na unidade dela', () => {
    const n = nutrientesPor100({
      zinc_100g: 0.0012,
      potassium_100g: 0.15,
      magnesium_100g: 0.01,
      'vitamin-c_100g': 0.009,
      phosphorus_100g: 0.09,
      copper_100g: 0.0001,
      manganese_100g: 0.0002,
      selenium_100g: 0.000005,
      'vitamin-a_100g': 0.00006,
      'vitamin-d_100g': 0.0000012,
      'vitamin-e_100g': 0.0015,
      'vitamin-b1_100g': 0.0002,
      'vitamin-b2_100g': 0.0003,
      'vitamin-b6_100g': 0.0004,
      'vitamin-pp_100g': 0.005,
      'vitamin-b9_100g': 0.00004,
      'vitamin-b12_100g': 0.0000009,
    })
    expect(n).toMatchObject({
      zinco_mg: 1.2,
      potassio_mg: 150,
      magnesio_mg: 10,
      vitamina_c_mg: 9,
      fosforo_mg: 90,
      cobre_mg: 0.1,
      manganes_mg: 0.2,
      selenio_mcg: 5,
      vitamina_a_rae_mcg: 60,
      vitamina_d_mcg: 1.2,
      vitamina_e_mg: 1.5,
      tiamina_mg: 0.2,
      riboflavina_mg: 0.3,
      piridoxina_mg: 0.4,
      niacina_mg: 5,
      folato_dfe_mcg: 40,
      vitamina_b12_mcg: 0.9,
    })
  })

  it('CA-1136: sem sódio, o sódio sai do sal (÷ 2,5); sem kcal, da energia em kJ', () => {
    expect(nutrientesPor100({ salt_100g: 1 }).sodio_mg).toBe(400)
    expect(nutrientesPor100({ energy_100g: 418.4 }).energia_kcal).toBe(100)
  })

  it('CB-369: valor fora do formato fica nulo', () => {
    expect(nutrientesPor100({ proteins_100g: 'abc', fat_100g: -2, fiber_100g: Number.NaN })).toMatchObject({ proteina_g: null, lipideos_g: null, fibra_g: null })
  })

  it('CA-1138: a consulta se apresenta com o X-User-Agent', async () => {
    let cabecalhos: Record<string, string> | undefined
    const buscar = (_: string, init?: RequestInit) => {
      cabecalhos = init?.headers as Record<string, string> | undefined
      return respostaOk(LEITE)
    }
    await buscarRotuloPorCodigo('7891000100103', { buscar: buscar as unknown as typeof fetch })
    expect(cabecalhos?.['X-User-Agent']).toBe(IDENTIFICACAO_OFF)
    expect(IDENTIFICACAO_OFF).toMatch(/^MetaNutri\/\d+\.\d+ \(.+@.+\)$/)
  })

  it('devolve nulo quando o código não existe na base', async () => {
    const buscar = vi.fn(() => respostaOk({ status: 0 }))
    expect(await buscarRotuloPorCodigo('7891000100103', { buscar: buscar as unknown as typeof fetch })).toBeNull()
  })

  it('devolve nulo quando a consulta falha', async () => {
    const buscar = vi.fn(() => Promise.resolve({ ok: false } as Response))
    expect(await buscarRotuloPorCodigo('7891000100103', { buscar: buscar as unknown as typeof fetch })).toBeNull()
  })
})

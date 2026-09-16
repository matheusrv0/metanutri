import { buscarRotuloPorCodigo, ehCodigoValido } from './codigoBarras.ts'

const respostaOk = (corpo: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(corpo) } as Response)

describe('código de barras', () => {
  it('valida o dígito verificador de EAN-13 e EAN-8', () => {
    expect(ehCodigoValido('7891000100103')).toBe(true)
    expect(ehCodigoValido('7891000100104')).toBe(false)
    expect(ehCodigoValido('96385074')).toBe(true)
    expect(ehCodigoValido('123')).toBe(false)
    expect(ehCodigoValido('')).toBe(false)
  })

  it('traz o rótulo da base pública convertido para a porção', async () => {
    const buscar = vi.fn(() =>
      respostaOk({
        status: 1,
        product: {
          product_name: 'Leite integral',
          brands: 'Marca Y, Outra',
          serving_size: '200 ml',
          serving_quantity: 200,
          nutriments: {
            'energy-kcal_100g': 60,
            carbohydrates_100g: 4.7,
            sugars_100g: 4.7,
            proteins_100g: 3.2,
            fat_100g: 3.3,
            'saturated-fat_100g': 2,
            fiber_100g: 0,
            sodium_100g: 0.05,
          },
        },
      }),
    )

    const achado = await buscarRotuloPorCodigo('7891000100103', { buscar: buscar as unknown as typeof fetch })
    expect(achado?.nome).toBe('Leite integral')
    expect(achado?.marca).toBe('Marca Y')
    expect(achado?.porcaoG).toBe(200)
    expect(achado?.medidaCaseira).toBe('200 ml')
    // 60 kcal por 100 ml viram 120 kcal na porção de 200 ml
    expect(achado?.porPorcao.energia_kcal).toBe(120)
    expect(achado?.porPorcao.proteina_g).toBe(6.4)
    // sódio vem em gramas na base e sai em miligramas
    expect(achado?.porPorcao.sodio_mg).toBe(100)
    expect(achado?.fonte).toBe('Open Food Facts')
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

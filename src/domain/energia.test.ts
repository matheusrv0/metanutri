import { criarCasoVazio } from './caso.ts'
import { calcularEnergia, categoriaDoFator, NIVEIS_ATIVIDADE, percentualDoGasto } from './energia.ts'
import type { Caso } from './tipos.ts'

const caso = (p: Partial<Caso>): Caso => ({ ...criarCasoVazio('c'), ...p })
const MULHER_28 = caso({ sexo: 'F', idadeAnos: 28, pesoKg: 68, estaturaCm: 165 })
const POUCO_ATIVO = 1.37

describe('níveis de atividade (CA-07, CA-06d)', () => {
  it('usa os fatores da faculdade e a conversão para as categorias do NASEM', () => {
    expect(NIVEIS_ATIVIDADE.map((n) => [n.fator, n.categoria])).toEqual([
      [1.2, 'inativo'],
      [1.37, 'pouco-ativo'],
      [1.55, 'ativo'],
      [1.7, 'muito-ativo'],
      [1.9, 'muito-ativo'],
    ])
  })

  it.each([
    [1.2, 'inativo'],
    [1.28, 'inativo'], // ponto médio entre 1,2 e 1,37 é 1,285
    [1.29, 'pouco-ativo'],
    [1.3, 'pouco-ativo'],
    [1.5, 'ativo'],
    [1.65, 'muito-ativo'],
    [2.2, 'muito-ativo'],
  ] as const)('fator livre %f vira a categoria do nível mais próximo: %s', (fator, categoria) => {
    expect(categoriaDoFator(fator)).toBe(categoria)
  })
})

describe('calcularEnergia: adultos', () => {
  it('CA-06: Mifflin-St Jeor (padrão) para mulher', () => {
    // 10×68 + 6,25×165 − 5×28 − 161 = 1410,25
    const r = calcularEnergia(MULHER_28, { fator: POUCO_ATIVO })
    expect(r.metodo).toBe('mifflin')
    expect(r.tmb).toBeCloseTo(1410.25, 6)
    expect(r.get).toBeCloseTo(1410.25 * 1.37, 6) // CA-07
  })

  it('CA-06: Mifflin-St Jeor para homem', () => {
    // 10×80 + 6,25×178 − 5×40 + 5 = 1717,5
    const r = calcularEnergia(caso({ sexo: 'M', idadeAnos: 40, pesoKg: 80, estaturaCm: 178 }), { fator: 1.55 })
    expect(r.tmb).toBeCloseTo(1717.5, 6)
    expect(r.get).toBeCloseTo(2662.125, 6)
  })

  it('CA-06: Harris-Benedict (1919) para mulher', () => {
    // 655,0955 + 9,5634×68 + 1,8496×165 − 4,6756×28 = 1479,6739
    const r = calcularEnergia(MULHER_28, { fator: 1.2, formula: 'harris-benedict' })
    expect(r.metodo).toBe('harris-benedict')
    expect(r.tmb).toBeCloseTo(1479.6739, 3)
  })

  it('CA-06: Harris-Benedict (1919) para homem', () => {
    // 66,4730 + 13,7516×80 + 5,0033×178 − 6,7550×40 = 66,473 + 1100,128 + 890,5874 − 270,2 = 1786,9884
    const r = calcularEnergia(caso({ sexo: 'M', idadeAnos: 40, pesoKg: 80, estaturaCm: 178 }), { fator: 1.2, formula: 'harris-benedict' })
    expect(r.tmb).toBeCloseTo(1786.9884, 3)
  })

  it('CA-08: fator livre digitado pelo usuário', () => {
    const r = calcularEnergia(MULHER_28, { fator: 1.45 })
    expect(r.get).toBeCloseTo(1410.25 * 1.45, 6)
  })

  it('CA-09: GET manual substitui o calculado e é sinalizado', () => {
    const r = calcularEnergia(MULHER_28, { fator: POUCO_ATIVO, getManual: 1800 })
    expect(r.get).toBe(1800)
    expect(r.getManual).toBe(true)
    expect(r.tmb).toBeCloseTo(1410.25, 6)
  })

  it('declara a fonte da fórmula', () => {
    expect(calcularEnergia(MULHER_28, { fator: 1.2 }).fonte).toMatch(/Mifflin/)
  })
})

describe('calcularEnergia: crianças e adolescentes (CA-06a)', () => {
  it('menino de 10 anos, pouco ativo: equação NASEM 2023 + custo de crescimento', () => {
    // 19,12 + 3,68×10 + 8,62×140 + 20,28×33 = 1931,96 ; +25 kcal de crescimento
    const r = calcularEnergia(caso({ sexo: 'M', idadeAnos: 10, pesoKg: 33, estaturaCm: 140 }), { fator: POUCO_ATIVO })
    expect(r.metodo).toBe('nasem-2023')
    expect(r.tmb).toBeNull()
    expect(r.categoriaAtividade).toBe('pouco-ativo')
    expect(r.adicionais).toEqual([{ descricao: 'Custo energético do crescimento', kcal: 25 }])
    expect(r.get).toBeCloseTo(1956.96, 6)
  })

  it('menina de 2 anos: equação única de 6 meses a 2,99 anos + 15 kcal', () => {
    // −69,15 + 80×2 + 2,65×86 + 54,15×12 = 968,55 ; +15
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 2, pesoKg: 12, estaturaCm: 86 }), { fator: 1.9 })
    expect(r.get).toBeCloseTo(983.55, 6)
    expect(r.categoriaAtividade).toBeNull()
  })

  it('usa a idade em anos com os meses (decimal)', () => {
    // menino 16 anos e 6 meses, ativo: −388,19 + 3,68×16,5 + 12,66×175 + 20,46×60 + 20
    const r = calcularEnergia(caso({ sexo: 'M', idadeAnos: 16, idadeMesesAdicionais: 6, pesoKg: 60, estaturaCm: 175 }), { fator: 1.55 })
    expect(r.get).toBeCloseTo(-388.19 + 3.68 * 16.5 + 12.66 * 175 + 20.46 * 60 + 20, 6)
  })

  it('não oferece Mifflin nem Harris-Benedict para menores de 19 anos', () => {
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 15, pesoKg: 55, estaturaCm: 160 }), { fator: 1.2, formula: 'harris-benedict' })
    expect(r.metodo).toBe('nasem-2023')
    expect(r.avisos.join(' ')).toMatch(/não vale/)
  })
})

describe('calcularEnergia: gestação e lactação', () => {
  const gestante = (semanas: number | null, pre: number | null) =>
    caso({ sexo: 'F', idadeAnos: 30, pesoKg: 70, estaturaCm: 165, condicao: { tipo: 'gestante', semanasGestacao: semanas, pesoPreGestacionalKg: pre } })

  it('CA-06b: 2º trimestre usa a equação de gestação + depósito pelo IMC pré-gestacional', () => {
    // 693,35 − 2,04×30 + 5,73×165 + 10,20×70 + 9,16×24 = 2511,44 ; eutrofia (IMC 22,8) +200
    const r = calcularEnergia(gestante(24, 62), { fator: POUCO_ATIVO })
    expect(r.metodo).toBe('nasem-2023')
    expect(r.adicionais).toEqual([{ descricao: 'Depósito de energia na gestação (eutrofia)', kcal: 200 }])
    expect(r.get).toBeCloseTo(2711.44, 6)
  })

  it('CA-06b: obesidade pré-gestacional tem depósito negativo', () => {
    const r = calcularEnergia(gestante(30, 90), { fator: POUCO_ATIVO })
    expect(r.adicionais).toEqual([{ descricao: 'Depósito de energia na gestação (obesidade)', kcal: -50 }])
  })

  it('CA-06b: 1º trimestre usa a equação de não gestante, sem depósito', () => {
    // mulher adulta pouco ativa: 575,77 − 7,01×30 + 6,60×165 + 12,14×70 = 2304,27
    const r = calcularEnergia(gestante(10, 62), { fator: POUCO_ATIVO })
    expect(r.adicionais).toEqual([])
    expect(r.get).toBeCloseTo(2304.27, 6)
  })

  it('CB-02b: sem idade gestacional, calcula como não gestante e avisa', () => {
    const r = calcularEnergia(gestante(null, 62), { fator: POUCO_ATIVO })
    expect(r.get).toBeCloseTo(2304.27, 6)
    expect(r.avisos.join(' ')).toMatch(/idade gestacional/)
  })

  it('2º trimestre sem peso pré-gestacional: equação de gestação sem depósito e aviso', () => {
    const r = calcularEnergia(gestante(24, null), { fator: POUCO_ATIVO })
    expect(r.get).toBeCloseTo(2511.44, 6)
    expect(r.avisos.join(' ')).toMatch(/peso pré-gestacional/)
  })

  it('CA-06c: lactação exclusiva (0 a 6 meses) soma 540 − 140 kcal', () => {
    // mulher adulta ativa: 710,25 − 7,01×30 + 6,54×165 + 12,34×65 = 2381,15
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 30, pesoKg: 65, estaturaCm: 165, condicao: { tipo: 'lactante', mesesPosParto: 3 } }), { fator: 1.55 })
    expect(r.adicionais).toEqual([
      { descricao: 'Produção de leite (0 a 6 meses)', kcal: 540 },
      { descricao: 'Mobilização de reservas (0 a 6 meses)', kcal: -140 },
    ])
    expect(r.get).toBeCloseTo(2781.15, 6)
  })

  it('CA-06c: lactação parcial (7 a 12 meses) soma 380 kcal', () => {
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 30, pesoKg: 65, estaturaCm: 165, condicao: { tipo: 'lactante', mesesPosParto: 9 } }), { fator: 1.55 })
    expect(r.adicionais).toEqual([{ descricao: 'Produção de leite (7 a 12 meses)', kcal: 380 }])
    expect(r.get).toBeCloseTo(2381.15 + 380, 6)
  })

  it('lactação acima de 12 meses não tem adicional e avisa', () => {
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 30, pesoKg: 65, estaturaCm: 165, condicao: { tipo: 'lactante', mesesPosParto: 14 } }), { fator: 1.55 })
    expect(r.adicionais).toEqual([])
    expect(r.avisos.join(' ')).toMatch(/12 meses/)
  })

  it('lactante adolescente usa a equação de meninas', () => {
    // 16 anos, pouco ativa: −297,54 − 22,25×16 + 12,77×160 + 14,73×55 + 400
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 16, pesoKg: 55, estaturaCm: 160, condicao: { tipo: 'lactante', mesesPosParto: 2 } }), { fator: POUCO_ATIVO })
    expect(r.get).toBeCloseTo(-297.54 - 22.25 * 16 + 12.77 * 160 + 14.73 * 55 + 400, 6)
  })
})

describe('calcularEnergia: dados faltando', () => {
  it('CB-01: sem peso não calcula e explica', () => {
    const r = calcularEnergia(caso({ sexo: 'F', idadeAnos: 28, estaturaCm: 165 }), { fator: 1.2 })
    expect(r.get).toBeNull()
    expect(r.tmb).toBeNull()
    expect(r.motivoSemCalculo).toMatch(/peso/)
  })

  it('CA-09: GET manual funciona mesmo sem os dados do caso', () => {
    const r = calcularEnergia(caso({}), { fator: 1.2, getManual: 2000 })
    expect(r.get).toBe(2000)
    expect(r.getManual).toBe(true)
  })

  it('fator inválido é recusado', () => {
    expect(() => calcularEnergia(MULHER_28, { fator: 0 })).toThrow(RangeError)
  })
})

describe('percentualDoGasto (CA-10)', () => {
  it.each([
    [1790, 2000, 89.5, 'abaixo'],
    [1800, 2000, 90, 'dentro'],
    [2200, 2000, 110, 'dentro'],
    [2210, 2000, 110.5, 'acima'],
  ] as const)('%i kcal de %i = %f%% (%s)', (kcal, get, pct, estado) => {
    expect(percentualDoGasto(kcal, get)).toEqual({ pct, estado })
  })

  it('limites editáveis', () => {
    expect(percentualDoGasto(1900, 2000, { min: 97, max: 103 })?.estado).toBe('abaixo')
  })

  it('sem GET não há percentual', () => {
    expect(percentualDoGasto(1800, null)).toBeNull()
  })
})

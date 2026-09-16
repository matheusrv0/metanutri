import { avaliarAntropometria, calcularImc, classificarImcPreGestacional, escoreZ } from './antropometria.ts'
import { criarCasoVazio } from './caso.ts'
import type { Caso } from './tipos.ts'

const caso = (p: Partial<Caso>): Caso => ({ ...criarCasoVazio('c'), ...p })

describe('calcularImc', () => {
  it('peso em kg dividido pela estatura em metros ao quadrado', () => {
    expect(calcularImc(68, 165)).toBeCloseTo(24.977, 3)
  })
})

describe('escoreZ (fórmula LMS da OMS)', () => {
  // IMC-para-idade, menino, 61 meses: L -0,7387 · M 15,2641 · S 0,0839 · SD2 18,259 · SD3 20,166 · SD2neg 13,031 · SD3neg 12,118
  const lms = { L: -0.7387, M: 15.2641, S: 0.0839, sd2neg: 13.031, sd2: 18.259, sd3neg: 12.118, sd3: 20.166 }

  it('mediana tem escore-z 0 e os valores da tabela dão ±2', () => {
    expect(escoreZ(15.2641, lms, true)).toBeCloseTo(0, 6)
    expect(escoreZ(18.259, lms, true)).toBeCloseTo(2, 2)
    expect(escoreZ(13.031, lms, true)).toBeCloseTo(-2, 2)
  })

  it('acima de +3, o IMC usa a correção da OMS pela distância entre SD2 e SD3', () => {
    // z* = 3 + (y - SD3) / (SD3 - SD2) = 3 + (22 - 20,166) / 1,907 = 3,9617
    expect(escoreZ(22, lms, true)).toBeCloseTo(3.9617, 3)
  })

  it('abaixo de -3, a correção usa SD2neg e SD3neg', () => {
    // z* = -3 + (y - SD3neg) / (SD2neg - SD3neg) = -3 + (11,5 - 12,118) / 0,913 = -3,6769
    expect(escoreZ(11.5, lms, true)).toBeCloseTo(-3.6769, 3)
  })

  it('estatura (L = 1) não recebe correção', () => {
    const est = { L: 1, M: 110.2647, S: 0.04164, sd2neg: 101.082, sd2: 119.448, sd3neg: 96.49, sd3: 124.039 }
    expect(escoreZ(90, est, false)).toBeCloseTo((90 / 110.2647 - 1) / 0.04164, 6)
  })
})

describe('avaliarAntropometria', () => {
  it('CA-02: adulto usa os pontos de corte de adulto e mostra a fonte (CA-05)', () => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 28, pesoKg: 68, estaturaCm: 165 }))
    expect(r.imc).toMatchObject({ referencia: 'adulto', classe: 'Eutrofia' })
    expect(r.imc?.valor).toBeCloseTo(24.977, 3)
    expect(r.imc?.fonte).toMatch(/SISVAN/)
  })

  it('CA-02: adulto com obesidade mostra o grau', () => {
    const r = avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 40, pesoKg: 115, estaturaCm: 175 })) // 37,6
    expect(r.imc).toMatchObject({ classe: 'Obesidade', grau: 'Obesidade grau II' })
  })

  it.each([
    [59, 'adulto', 'Sobrepeso'],
    [60, 'idoso', 'Eutrofia'],
  ] as const)('CA-02: IMC 25,7 aos %i anos usa referência de %s (%s)', (idade, referencia, classe) => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: idade, pesoKg: 70, estaturaCm: 165 })) // 25,71
    expect(r.imc).toMatchObject({ referencia, classe })
  })

  it('idoso com IMC exatamente 22 é baixo peso e 27 é sobrepeso', () => {
    // estatura 100 cm para facilitar: IMC = peso
    expect(avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 70, pesoKg: 22, estaturaCm: 100 })).imc?.classe).toBe('Baixo peso')
    expect(avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 70, pesoKg: 27, estaturaCm: 100 })).imc?.classe).toBe('Sobrepeso')
  })

  it('CA-02a: criança usa escore-z de IMC e de estatura para a idade em meses', () => {
    // menino de 5 anos e 1 mês (61 meses), 110,2647 cm e IMC igual à mediana (15,2641)
    const peso = 15.2641 * 1.102647 ** 2
    const r = avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 5, idadeMesesAdicionais: 1, pesoKg: peso, estaturaCm: 110.2647 }))
    expect(r.imc).toBeNull()
    expect(r.imcIdade?.z).toBeCloseTo(0, 3)
    expect(r.imcIdade?.classe).toBe('Eutrofia')
    expect(r.estaturaIdade?.z).toBeCloseTo(0, 3)
    expect(r.estaturaIdade?.classe).toBe('Estatura adequada para a idade')
    expect(r.imcIdade?.fonte).toMatch(/OMS/)
  })

  it('CA-02a: abaixo de 5 anos há a classe "Risco de sobrepeso"; a partir de 5 anos, "Sobrepeso"', () => {
    // escore-z entre +1 e +2 nas duas idades
    const quatroAnos = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 4, pesoKg: 19.5, estaturaCm: 103 }))
    expect(quatroAnos.imcIdade?.z).toBeGreaterThan(1)
    expect(quatroAnos.imcIdade?.z).toBeLessThanOrEqual(2)
    expect(quatroAnos.imcIdade?.classe).toBe('Risco de sobrepeso')
    const dezAnos = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 10, pesoKg: 39, estaturaCm: 138 }))
    expect(dezAnos.imcIdade?.z).toBeGreaterThan(1)
    expect(dezAnos.imcIdade?.z).toBeLessThanOrEqual(2)
    expect(dezAnos.imcIdade?.classe).toBe('Sobrepeso')
  })

  it('19 anos e alguns meses usa os valores de 19 anos completos (nota do SISVAN)', () => {
    const r = avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 19, idadeMesesAdicionais: 6, pesoKg: 70, estaturaCm: 176 }))
    expect(r.imcIdade?.mesesReferencia).toBe(228)
    expect(r.imc).toBeNull()
  })

  it('CA-02b: gestante tem IMC pré-gestacional classificado e faixa de ganho de peso', () => {
    const r = avaliarAntropometria(
      caso({ sexo: 'F', idadeAnos: 30, pesoKg: 70, estaturaCm: 165, condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 62 } }),
    )
    expect(r.imc).toBeNull()
    expect(r.gestacao).toMatchObject({ classe: 'eutrofia', rotulo: 'Eutrofia', ganhoRecomendadoKg: { min: 8, max: 12 }, ganhoAtualKg: 8 })
    expect(r.gestacao?.imcPreGestacional).toBeCloseTo(22.773, 3)
    expect(r.gestacao?.fonte).toMatch(/Kac/)
  })

  it('CA-02b: gestante adolescente recebe aviso sobre as curvas', () => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 16, pesoKg: 60, estaturaCm: 160, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 55 } }))
    expect(r.avisos.join(' ')).toMatch(/adolescentes/)
  })

  it('CA-02b: sem peso pré-gestacional não classifica e pede o dado', () => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 30, pesoKg: 70, estaturaCm: 165, condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: null } }))
    expect(r.gestacao).toBeNull()
    expect(r.avisos.join(' ')).toMatch(/peso pré-gestacional/)
  })

  it('CA-02c: lactante adulta usa a referência de adulto', () => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 30, pesoKg: 65, estaturaCm: 165, condicao: { tipo: 'lactante', mesesPosParto: 3 } }))
    expect(r.imc?.referencia).toBe('adulto')
  })

  it.each([
    ['M', 93.9, 'Sem risco aumentado'],
    ['M', 94, 'Risco aumentado'],
    ['M', 102, 'Risco substancialmente aumentado'],
    ['F', 79.9, 'Sem risco aumentado'],
    ['F', 80, 'Risco aumentado'],
    ['F', 88, 'Risco substancialmente aumentado'],
  ] as const)('CA-03: cintura de %s com %f cm = %s', (sexo, cm, classe) => {
    const r = avaliarAntropometria(caso({ sexo, idadeAnos: 40, pesoKg: 70, estaturaCm: 170, circunferenciaCinturaCm: cm }))
    expect(r.cintura).toMatchObject({ classe })
    expect(r.cintura?.fonte).toMatch(/WHO/)
  })

  it('CA-03: cintura não é classificada em crianças', () => {
    expect(avaliarAntropometria(caso({ sexo: 'M', idadeAnos: 10, pesoKg: 33, estaturaCm: 140, circunferenciaCinturaCm: 70 })).cintura).toBeNull()
  })

  it('CA-04: panturrilha só a partir de 60 anos', () => {
    expect(avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 70, pesoKg: 60, estaturaCm: 158, circunferenciaPanturrilhaCm: 30 })).panturrilha).toMatchObject({
      classe: 'Indicativo de redução de massa muscular',
    })
    expect(avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 70, pesoKg: 60, estaturaCm: 158, circunferenciaPanturrilhaCm: 31 })).panturrilha?.classe).toBe('Adequada')
    expect(avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 50, pesoKg: 60, estaturaCm: 158, circunferenciaPanturrilhaCm: 30 })).panturrilha).toBeNull()
  })

  it('CB-01: sem peso ou estatura não calcula IMC e diz o que falta', () => {
    const r = avaliarAntropometria(caso({ sexo: 'F', idadeAnos: 30, pesoKg: null, estaturaCm: 165 }))
    expect(r.imc).toBeNull()
    expect(r.avisos.join(' ')).toMatch(/peso/)
  })
})

describe('classificarImcPreGestacional', () => {
  it.each([
    [18.4, 'baixo-peso'],
    [18.5, 'eutrofia'],
    [24.99, 'eutrofia'],
    [25, 'sobrepeso'],
    [30, 'obesidade'],
  ] as const)('IMC %f = %s', (imc, classe) => {
    expect(classificarImcPreGestacional(imc)).toBe(classe)
  })
})

// A meta de água pelo peso (spec ficha-unica, D-355 e seção 4; CA-1082 a CA-1084, CA-1090 a CA-1095).
import { aguaDoPlano, calcularAgua, FONTE_AGUA, metodoDaAgua, referenciaDaDri, textoDaReferencia } from './agua.ts'
import { criarCasoVazio } from './caso.ts'
import type { Caso, CondicaoFisiologica } from './tipos.ts'

const nenhuma: CondicaoFisiologica = { tipo: 'nenhuma' }
const pessoa = (idadeAnos: number | null, pesoKg: number | null, extra: Partial<Caso> = {}): Caso => ({
  ...criarCasoVazio('c1'),
  sexo: 'F',
  idadeAnos,
  pesoKg,
  estaturaCm: 170,
  condicao: nenhuma,
  ...extra,
})

describe('Por peso, adulto pela faixa de idade (CA-1082)', () => {
  it.each([
    [18, 72, 2.5, 'Por peso: 35 ml/kg (18 a 55 anos)', '35 ml × 72 kg = 2,5 L'],
    [35, 72, 2.5, 'Por peso: 35 ml/kg (18 a 55 anos)', '35 ml × 72 kg = 2,5 L'],
    [55, 62, 2.2, 'Por peso: 35 ml/kg (18 a 55 anos)', '35 ml × 62 kg = 2,2 L'],
    [56, 70, 2.1, 'Por peso: 30 ml/kg (56 a 65 anos)', '30 ml × 70 kg = 2,1 L'],
    [65, 70, 2.1, 'Por peso: 30 ml/kg (56 a 65 anos)', '30 ml × 70 kg = 2,1 L'],
    [70, 60, 1.5, 'Por peso: 25 ml/kg (acima de 65 anos)', '25 ml × 60 kg = 1,5 L'],
  ])('%i anos e %i kg', (idade, peso, litros, metodo, conta) => {
    expect(calcularAgua(pessoa(idade, peso), null)).toEqual({ litros, metodo, conta, nota: null })
  })

  it('CA-1083: com IMC de 30 ou mais, usa o peso ajustado e diz isso', () => {
    expect(calcularAgua(pessoa(35, 100, { estaturaCm: 165 }), null)).toEqual({
      litros: 2.7,
      metodo: 'Por peso: 35 ml/kg (18 a 55 anos)',
      conta: '35 ml × 76 kg (peso ajustado) = 2,7 L',
      nota: 'IMC de 30 ou mais: usado o peso ajustado, o peso ideal (IMC 25, 68,1 kg) mais 25% do excesso.',
    })
  })

  it('CB-357: sem estatura, vale o peso atual', () => {
    expect(calcularAgua(pessoa(35, 100, { estaturaCm: null }), null)?.conta).toBe('35 ml × 100 kg = 3,5 L')
  })
})

describe('Abaixo de 18 anos: Holliday-Segar (CA-1084)', () => {
  it.each([
    [6, 21, 1.5, 'Holliday-Segar: 1.000 ml + 500 ml + 20 ml × 1 kg = 1,5 L'],
    [2, 8, 0.8, 'Holliday-Segar: 100 ml × 8 kg = 0,8 L'],
    [4, 15, 1.3, 'Holliday-Segar: 1.000 ml + 50 ml × 5 kg = 1,3 L'],
    [16, 60, 2.3, 'Holliday-Segar: 1.000 ml + 500 ml + 20 ml × 40 kg = 2,3 L'],
  ])('%i anos e %i kg', (idade, peso, litros, conta) => {
    expect(calcularAgua(pessoa(idade, peso), null)).toEqual({ litros, metodo: 'Por peso: Holliday-Segar (abaixo de 18 anos)', conta, nota: null })
  })
})

describe('Gestação e lactação (CA-1090)', () => {
  it('a gestante soma 300 ml, e a conta diz', () => {
    const gestante = pessoa(28, 64, { condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 } })
    expect(calcularAgua(gestante, null)).toMatchObject({ litros: 2.5, conta: '35 ml × 64 kg + 300 ml da gestação = 2,5 L' })
  })

  it('a lactante soma 700 ml', () => {
    const lactante = pessoa(30, 62, { condicao: { tipo: 'lactante', mesesPosParto: 3 } })
    expect(calcularAgua(lactante, null)).toMatchObject({ litros: 2.9, conta: '35 ml × 62 kg + 700 ml da lactação = 2,9 L' })
  })
})

describe('Por energia, 1 ml/kcal (CA-1091)', () => {
  it('usa a meta de energia, sem os acréscimos', () => {
    const caso = pessoa(28, 64, { metodoAgua: 'ml-kcal', condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 } })
    expect(calcularAgua(caso, 2050)).toEqual({ litros: 2.1, metodo: 'Por energia: 1 ml/kcal', conta: '1 ml × 2.050 kcal = 2,1 L', nota: null })
  })

  it('sem meta de energia, sem valor automático', () => {
    expect(calcularAgua(pessoa(28, 64, { metodoAgua: 'ml-kcal' }), null)).toBeNull()
  })

  it('plano antigo, sem o campo, ou com valor estranho, usa "Por peso"', () => {
    expect(metodoDaAgua({})).toBe('ml-kg')
    expect(metodoDaAgua({ metodoAgua: 'outro' })).toBe('ml-kg')
    expect(metodoDaAgua({ metodoAgua: 'ml-kcal' })).toBe('ml-kcal')
  })
})

describe('Sem dado (CA-1092, CB-358)', () => {
  it('sem peso, sem idade ou com peso fora da faixa, não há valor', () => {
    expect(calcularAgua(pessoa(35, null), null)).toBeNull()
    expect(calcularAgua(pessoa(null, 70), null)).toBeNull()
    expect(calcularAgua(pessoa(35, 2), null)).toBeNull()
  })
})

describe('A meta do plano: a calculada, a digitada ou nenhuma (CA-1093)', () => {
  it('sem edição, vale a calculada', () => {
    expect(aguaDoPlano(pessoa(35, 72), null)).toMatchObject({ litros: 2.5, editada: false, semLinha: false })
  })

  it('o valor digitado vale e é guardado no plano', () => {
    expect(aguaDoPlano(pessoa(35, 72, { aguaLitros: 3 }), null)).toMatchObject({ litros: 3, editada: true })
  })

  it('campo apagado tira a meta (a linha vazia de antes, D-298)', () => {
    expect(aguaDoPlano(pessoa(35, 72, { linhaDaAgua: '' }), null)).toMatchObject({ litros: null, semLinha: true })
  })

  it('valor guardado estragado vale como sem edição', () => {
    expect(aguaDoPlano({ ...pessoa(35, 72), aguaLitros: 'muito' as unknown as number }, null)).toMatchObject({ litros: 2.5, editada: false })
  })
})

describe('A referência da DRI, só como linha discreta (CA-1092)', () => {
  it('diz a água total e a parte em bebidas da fase de vida', () => {
    const ref = referenciaDaDri({ sexo: 'F', idadeAnos: 28, condicao: nenhuma })
    expect(ref && textoDaReferencia(ref)).toBe('Referência da DRI para mulheres de 19 anos ou mais: 2,7 L de água total, cerca de 2,2 L em bebidas.')
    expect(referenciaDaDri({ sexo: 'M', idadeAnos: 6, condicao: nenhuma })?.fase).toBe('crianças de 4 a 8 anos')
    expect(referenciaDaDri({ sexo: 'F', idadeAnos: 28, condicao: { tipo: 'lactante', mesesPosParto: 2 } })?.totalL).toBe(3.8)
    expect(referenciaDaDri({ sexo: null, idadeAnos: 35, condicao: nenhuma })).toBeNull()
    expect(FONTE_AGUA).toContain('Holliday')
  })
})

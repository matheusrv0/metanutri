import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { gastoDeRepouso, proteinaPorObjetivo } from './pontoDePartida.ts'
import type { Caso, ComposicaoCorporal } from './tipos.ts'

const vazio = criarCasoVazio('c')
const caso = (p: Partial<Caso> = {}, bio: Partial<ComposicaoCorporal['bioimpedancia']> = {}): Caso => ({
  ...vazio,
  sexo: 'M',
  idadeAnos: 35,
  pesoKg: 80,
  estaturaCm: 178,
  ...p,
  composicao: { ...vazio.composicao, bioimpedancia: { ...vazio.composicao.bioimpedancia, ...bio } },
})

describe('gasto de repouso pela massa magra (spec antropometria-completa, CA-2060 e CA-2061)', () => {
  it('CA-2060: 80 kg com 25% de gordura, sedentário → Cunningham 1991, 1.666 kcal/dia, faixa de 1.513,5 a 1.818,5', () => {
    const r = gastoDeRepouso(caso({}, { gorduraPct: 25 }), 'sedentario')
    if (!r?.calculou) throw new Error('não calculou')
    expect(r.equacao).toBe('cunningham-1991')
    expect(r.massaMagraKg).toBeCloseTo(60, 10)
    expect(r.kcalDia).toBeCloseTo(1666, 10)
    expect(r.faixa.min).toBeCloseTo(1513.5, 1)
    expect(r.faixa.max).toBeCloseTo(1818.5, 1)
    expect(r.arredondarPara).toBe(10)
    expect(r.fonte.curta).toBe(FONTES.cunningham1991.curta)
    expect(r.avisos).toContain('Katch-McArdle é a mesma fórmula de Cunningham 1991.')
    expect(r.avisos).toContain('Estimativa; a calorimetria indireta é o padrão.')
  })

  it('CA-2060: sem % de gordura não calcula e diz por quê', () => {
    const r = gastoDeRepouso(caso(), 'sedentario')
    expect(r?.calculou).toBe(false)
    if (r && !r.calculou) expect(r.falta).toEqual([{ campo: 'composicao', nome: 'o % de gordura (dobras ou bioimpedância)' }])
  })

  it('CA-2061: ativo ou atleta com IMC < 30 → Cunningham 1980, 1.820 kcal/dia, faixa de 1.667 a 1.973', () => {
    const ativo = gastoDeRepouso(caso({}, { gorduraPct: 25 }), 'ativo')
    if (!ativo?.calculou) throw new Error('não calculou')
    expect(ativo.equacao).toBe('cunningham-1980')
    expect(ativo.kcalDia).toBeCloseTo(1820, 10)
    expect(ativo.faixa.min).toBeCloseTo(1667, 0)
    expect(ativo.faixa.max).toBeCloseTo(1973, 0)
    const atleta = gastoDeRepouso(caso({}, { gorduraPct: 25 }), 'atleta')
    expect(atleta?.calculou && atleta.avisos.join(' ')).toMatch(/subestimar/)
  })

  it('CA-2061: ativo com IMC ≥ 30 → Cunningham 1991 e o aviso de comparar com a equação por peso', () => {
    const r = gastoDeRepouso(caso({ pesoKg: 100 }, { gorduraPct: 35 }), 'ativo')
    if (!r?.calculou) throw new Error('não calculou')
    expect(r.equacao).toBe('cunningham-1991')
    expect(r.avisos.join(' ')).toMatch(/equação por peso/)
  })

  it('abaixo de 18 anos e na gestação, não vem', () => {
    expect(gastoDeRepouso(caso({ idadeAnos: 17 }, { gorduraPct: 25 }), 'ativo')).toBeNull()
    expect(gastoDeRepouso(caso({ sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }, { gorduraPct: 30 }), 'sedentario')).toBeNull()
  })
})

describe('proteína pelo objetivo (spec antropometria-completa, CA-2062 a CA-2064)', () => {
  it('CA-2062: idoso (65+) pelo PROT-AGE: 1,0–1,2; ativo a partir de 1,2; com doença 1,2–1,5', () => {
    const idoso = caso({ idadeAnos: 70, pesoKg: 70, estaturaCm: 170 })
    const saudavel = proteinaPorObjetivo(idoso, { perfil: 'sedentario' })
    if (!saudavel?.calculou) throw new Error('sem sugestão')
    expect(saudavel.faixaGKg).toEqual({ min: 1, max: 1.2 })
    expect(saudavel.base).toBe('peso-atual')
    expect(saudavel.gDia?.min).toBeCloseTo(70, 10)
    expect(saudavel.gDia?.max).toBeCloseTo(84, 10)
    expect(saudavel.fonte.curta).toBe(FONTES.protAge2013.curta)
    const ativo = proteinaPorObjetivo(idoso, { perfil: 'ativo' })
    expect(ativo?.calculou && ativo.faixaGKg).toEqual({ min: 1.2, max: null })
    const doente = proteinaPorObjetivo(idoso, { perfil: 'sedentario', doencaAgudaOuCronica: true })
    expect(doente?.calculou && doente.faixaGKg).toEqual({ min: 1.2, max: 1.5 })
  })

  it('CA-2062: adulto "ganhar" de 70 kg → ~1,6 g/kg (até 2,2), 112 g/dia (Morton 2018)', () => {
    const r = proteinaPorObjetivo(caso({ pesoKg: 70, objetivo: 'ganhar' }), { perfil: 'ativo' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.faixaGKg).toEqual({ min: 1.6, max: 2.2 })
    expect(r.gDia?.min).toBeCloseTo(112, 10)
    expect(r.gDia?.max).toBeCloseTo(154, 10)
    expect(r.evidencia).toBe('forte')
  })

  it('CA-2062: "manter" ativo → 1,4–2,0 (ISSN 2017); sedentário → sem sugestão, com o motivo', () => {
    const ativo = proteinaPorObjetivo(caso({ objetivo: 'manter' }), { perfil: 'ativo' })
    expect(ativo?.calculou && ativo.faixaGKg).toEqual({ min: 1.4, max: 2 })
    const sedentario = proteinaPorObjetivo(caso({ objetivo: 'manter' }), { perfil: 'sedentario' })
    expect(sedentario?.calculou).toBe(false)
    if (sedentario && !sedentario.calculou) expect(sedentario.motivo).toMatch(/RDA/)
  })

  it('CA-2062: atleta "emagrecer" com 15% de gordura → 2,3–3,1 g/kg de massa magra = 1,96–2,64 g/kg de peso (Helms 2014)', () => {
    const r = proteinaPorObjetivo(caso({ objetivo: 'emagrecer' }, { gorduraPct: 15 }), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.base).toBe('massa-magra')
    expect(r.faixaGKg).toEqual({ min: 2.3, max: 3.1 })
    expect(r.gKgDePeso?.min).toBeCloseTo(1.955, 10)
    expect(r.gKgDePeso?.max).toBeCloseTo(2.635, 10)
    expect(r.gDia?.min).toBeCloseTo(2.3 * 68, 10)
  })

  it('CA-2062: menor de 18 anos, gestante e lactante → não vem', () => {
    expect(proteinaPorObjetivo(caso({ idadeAnos: 17, objetivo: 'ganhar' }), { perfil: 'ativo' })).toBeNull()
    expect(proteinaPorObjetivo(caso({ sexo: 'F', idadeAnos: 30, condicao: { tipo: 'lactante', mesesPosParto: 3 } }), { perfil: 'ativo' })).toBeNull()
  })

  it('CA-2063: "emagrecer" com IMC ≥ 30 → 1,2–1,5 g/kg, as três bases sem g/dia até a escolha', () => {
    const obeso = caso({ pesoKg: 100, estaturaCm: 170, objetivo: 'emagrecer' })
    const r = proteinaPorObjetivo(obeso, { perfil: 'sedentario' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.faixaGKg).toEqual({ min: 1.2, max: 1.5 })
    expect(r.base).toBeNull()
    expect(r.bases.map((b) => b.base)).toEqual(['peso-ideal', 'peso-ajustado', 'massa-magra'])
    expect(r.gDia).toBeNull()
    expect(r.evidencia).toBe('proposta-do-app')
    expect(r.fonte.curta).toBe('Proposta do app (sem diretriz)')
    const comBase = proteinaPorObjetivo(obeso, { perfil: 'sedentario', base: 'peso-ajustado' })
    if (!comBase?.calculou) throw new Error('sem sugestão')
    expect(comBase.gDia?.min).toBeCloseTo(1.2 * 79.1875, 10)
    expect(comBase.gKgDePeso?.min).toBeCloseTo((1.2 * 79.1875) / 100, 10)
  })

  it('CA-2064: doença renal com TFGe < 30 sem diálise → sem faixa, com o alerta do PROT-AGE', () => {
    const r = proteinaPorObjetivo(caso({ objetivo: 'ganhar' }), { perfil: 'ativo', doencaRenalGrave: true })
    expect(r?.calculou).toBe(false)
    if (r && !r.calculou) expect(r.motivo).toBe('TFGe abaixo de 30 sem diálise: faixa alta de proteína não sugerida. Pode ser preciso limitar a proteína (PROT-AGE 2013).')
  })

  it('CB-1013 (revisto, item 8): atleta sem % de gordura que emagrece fica com a ISSN, e o aviso diz que o % decide Helms', () => {
    const r = proteinaPorObjetivo(caso({ objetivo: 'emagrecer' }), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.faixaGKg).toEqual({ min: 1.4, max: 2 })
    expect(r.fonte.curta).toBe(FONTES.issn2017.curta)
    expect(r.avisos.join(' ')).toMatch(/Helms/)
  })

  it('sem objetivo, pede o objetivo', () => {
    const r = proteinaPorObjetivo(caso(), { perfil: 'ativo' })
    expect(r?.calculou).toBe(false)
    if (r && !r.calculou) expect(r.falta).toEqual([{ campo: 'objetivo', nome: 'o objetivo' }])
  })
})

describe('Helms só para o atleta magro (spec antropometria-completa, revisão, CA-2082)', () => {
  const emagrecer = (gorduraPct: number | null) => caso({ objetivo: 'emagrecer' }, { gorduraPct })

  it('CA-2082: atleta de 35 anos com 15% → Helms, com o aviso da população de origem', () => {
    const r = proteinaPorObjetivo(emagrecer(15), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.fonte.curta).toBe(FONTES.helms2014.curta)
    expect(r.avisos.join(' ')).toMatch(/fisiculturistas naturais/)
  })

  it('CA-2082: atleta com 25% (acima do início do sobrepeso de Gallagher) → ISSN, com o aviso', () => {
    const r = proteinaPorObjetivo(emagrecer(25), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.faixaGKg).toEqual({ min: 1.4, max: 2 })
    expect(r.base).toBe('peso-atual')
    expect(r.avisos.join(' ')).toMatch(/Helms/)
  })

  it('CA-2082: ativo → ISSN; sedentário → sem sugestão', () => {
    const ativo = proteinaPorObjetivo(emagrecer(15), { perfil: 'ativo' })
    expect(ativo?.calculou && ativo.fonte.curta).toBe(FONTES.issn2017.curta)
    expect(proteinaPorObjetivo(emagrecer(15), { perfil: 'sedentario' })?.calculou).toBe(false)
  })
})

describe('proposta do app (spec antropometria-completa, revisão, CA-2083)', () => {
  it('CA-2083: a faixa do gasto de repouso avisa que é proposta do app', () => {
    const r = gastoDeRepouso(caso({}, { gorduraPct: 25 }), 'sedentario')
    expect(r?.calculou && r.avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\)/)
  })
})

describe('o "magro" de Helms é proposta do app (spec antropometria-completa, rodada 2, CA-2091)', () => {
  const emagrecer = (gorduraPct: number) => caso({ objetivo: 'emagrecer' }, { gorduraPct })

  it('CA-2091: atleta de 35 anos com 15% → Helms 2014, com a evidência e o aviso de proposta do app', () => {
    const r = proteinaPorObjetivo(emagrecer(15), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.fonte.curta).toBe(FONTES.helms2014.curta)
    expect(r.evidencia).toBe('proposta-do-app')
    expect(r.avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\): "magro" é o % de gordura abaixo do início do sobrepeso de Gallagher/)
  })

  it('CA-2091: atleta com 25% (ISSN) mantém a evidência da ISSN', () => {
    const r = proteinaPorObjetivo(emagrecer(25), { perfil: 'atleta' })
    if (!r?.calculou) throw new Error('sem sugestão')
    expect(r.fonte.curta).toBe(FONTES.issn2017.curta)
    expect(r.evidencia).toBe('limitada')
  })
})

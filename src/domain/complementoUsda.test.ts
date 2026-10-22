// Spec vitaminas-usda, D-303: a junção do complemento do USDA aos alimentos da TACO, ao carregar.
import taco from '../data/alimentos.json'
import { CHAVES_USDA, descreverOrigemUsda, FONTE_USDA, juntarComplemento, type AlimentoTaco, type ItemComplementoUsda } from './complementoUsda.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'

const NUTRIENTES_TACO = {
  energia_kcal: 100,
  proteina_g: 10,
  lipideos_g: 1,
  carboidrato_g: 5,
  acucares_g: null,
  gordura_saturada_g: null,
  fibra_g: 2,
  colesterol_mg: null,
  calcio_mg: 30,
  magnesio_mg: 20,
  manganes_mg: 0.1,
  fosforo_mg: 50,
  ferro_mg: 1,
  sodio_mg: 3,
  potassio_mg: 200,
  cobre_mg: 0.05,
  zinco_mg: 0.5,
  vitamina_a_rae_mcg: null,
  tiamina_mg: 0.1,
  riboflavina_mg: 0,
  piridoxina_mg: 0.1,
  niacina_mg: 1,
  vitamina_c_mg: null,
}

const alimentoTaco = (id: number): AlimentoTaco => ({
  id,
  descricao: `Alimento ${id}`,
  categoria: 'Teste',
  base: null,
  preparo: null,
  qualificadores: null,
  nutrientes: NUTRIENTES_TACO,
  tracos: ['riboflavina_mg'],
})

const VALORES = { vitamina_d_mcg: 2.2, vitamina_e_mg: 0, folato_dfe_mcg: 44, vitamina_b12_mcg: null, selenio_mcg: 30.8, gordura_trans_g: null }
const ENTRADA: ItemComplementoUsda = { id: 1, fdcId: 173424, conjunto: 'SR Legacy', versao: '2018-04', confianca: 'alta', valores: VALORES }

describe('juntarComplemento (spec vitaminas-usda, D-303)', () => {
  const [comEquivalente, semEquivalente] = juntarComplemento([alimentoTaco(1), alimentoTaco(2)], { alimentos: [ENTRADA] })

  it('CA-948: alimento com equivalente ganha os seis valores e a origem; o que é da TACO não muda', () => {
    for (const chave of CHAVES_USDA) expect(comEquivalente?.nutrientes[chave], chave).toBe(VALORES[chave])
    expect(comEquivalente?.usda).toEqual({ fdcId: 173424, conjunto: 'SR Legacy', versao: '2018-04' })
    expect(comEquivalente?.nutrientes).toMatchObject(NUTRIENTES_TACO)
    expect(comEquivalente?.tracos).toEqual(['riboflavina_mg'])
    expect(comEquivalente?.descricao).toBe('Alimento 1')
  })

  it('CA-949: alimento sem equivalente fica com as seis chaves nulas e sem origem', () => {
    for (const chave of CHAVES_USDA) expect(semEquivalente?.nutrientes[chave], chave).toBeNull()
    expect(semEquivalente && 'usda' in semEquivalente).toBe(false)
  })

  it('CB-301: zero publicado é zero; CB-302: nulo do equivalente fica nulo, com a origem', () => {
    expect(comEquivalente?.nutrientes.vitamina_e_mg).toBe(0)
    expect(comEquivalente?.nutrientes.vitamina_b12_mcg).toBeNull()
    expect(comEquivalente?.usda?.fdcId).toBe(173424)
  })
})

describe('a base em uso (spec vitaminas-usda)', () => {
  it('CA-948: o salmão grelhado traz os valores e a origem do USDA', () => {
    const salmao = buscarAlimento(317)
    expect(salmao?.descricao).toBe('Salmão, sem pele, fresco, grelhado')
    expect(salmao?.nutrientes.vitamina_d_mcg).toBe(13.1)
    expect(salmao?.nutrientes.vitamina_b12_mcg).toBe(2.8)
    expect(salmao?.usda).toEqual({ fdcId: 175168, conjunto: 'SR Legacy', versao: '2018-04' })
  })

  it('CA-949: o cuscuz não tem equivalente', () => {
    const cuscuz = buscarAlimento(533)
    for (const chave of CHAVES_USDA) expect(cuscuz?.nutrientes[chave], chave).toBeNull()
    expect(cuscuz?.usda).toBeUndefined()
  })

  it('CB-302: a aveia vem do Foundation Foods, com vitamina D, E e B12 nulas', () => {
    const aveia = buscarAlimento(7)
    expect(aveia?.usda).toEqual({ fdcId: 2346396, conjunto: 'Foundation Foods', versao: '2026-04' })
    expect(aveia?.nutrientes.vitamina_d_mcg).toBeNull()
    expect(aveia?.nutrientes.selenio_mcg).toBe(25.35)
  })

  it('CA-948: os 597 alimentos têm todas as chaves, e os valores da TACO são os do alimentos.json', () => {
    expect(ALIMENTOS).toHaveLength(597)
    expect(ALIMENTOS.filter((a) => a.usda !== undefined)).toHaveLength(308)
    for (const [i, a] of ALIMENTOS.entries()) {
      for (const chave of CHAVES_NUTRIENTES) expect(a.nutrientes[chave], `${a.id} ${chave}`).not.toBeUndefined()
      const original = taco.alimentos[i]
      expect(a.id).toBe(original?.id)
      // D-380 (spec alimentos-e-gramaturas): os macros do USDA só ocupam o que a TACO deixou nulo.
      const daTaco = Object.fromEntries(Object.entries(original?.nutrientes ?? {}).filter(([chave]) => !(a.usdaMacros?.chaves ?? []).includes(chave as never)))
      expect(a.nutrientes).toMatchObject(daTaco)
      for (const chave of a.usdaMacros?.chaves ?? []) expect((original?.nutrientes as Record<string, unknown> | undefined)?.[chave], `${a.id} ${chave}`).toBeNull()
    }
  })

  it('a fonte vem do cabeçalho do complemento', () => {
    expect(FONTE_USDA.nome).toBe('USDA FoodData Central')
    expect(FONTE_USDA.conjuntos.map((c) => c.nome)).toEqual(['SR Legacy', 'Foundation Foods'])
  })

  it('descreve a origem com o mês e o ano da versão', () => {
    expect(descreverOrigemUsda({ fdcId: 175168, conjunto: 'SR Legacy', versao: '2018-04' })).toBe('SR Legacy, abril de 2018')
    expect(descreverOrigemUsda({ fdcId: 2346396, conjunto: 'Foundation Foods', versao: '2026-04' })).toBe('Foundation Foods, abril de 2026')
  })
})

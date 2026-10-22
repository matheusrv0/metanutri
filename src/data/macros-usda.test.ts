// Spec alimentos-e-gramaturas, A4 e D-380: energia e macros do USDA só para o alimento da TACO que devia ter e não tem.
import { CHAVES_MACROS_USDA, juntarMacros, MACROS_USDA } from '../domain/complementoUsda.ts'
import { ALIMENTOS, buscarAlimento } from '../domain/tabelas.ts'
import type { Alimento } from '../domain/tipos.ts'
import taco from './alimentos.json'
import medidas from './medidas-caseiras.json'

const daTaco = new Map((taco.alimentos as unknown as { id: number; descricao: string; nutrientes: Record<string, number | null> }[]).map((a) => [a.id, a]))

describe('macros-usda.json', () => {
  it('traz a fonte, o conjunto e o critério', () => {
    expect(MACROS_USDA.fonte).toMatchObject({ nome: 'USDA FoodData Central', conjunto: 'SR Legacy', versao: '2018-04' })
    expect(MACROS_USDA.fonte.criterio).toMatch(/coco verde/)
  })

  it('CA-1128: leite integral, leite desnatado e iogurte de abacaxi, cada um com os cinco valores', () => {
    expect(MACROS_USDA.alimentos.map((a) => a.id).sort()).toEqual([450, 457, 458])
    for (const item of MACROS_USDA.alimentos) {
      expect(Object.keys(item.valores).sort()).toEqual([...CHAVES_MACROS_USDA].sort())
      for (const v of Object.values(item.valores)) expect(v).toBeGreaterThanOrEqual(0)
      // A energia bate com os macros (fator de Atwater) com folga de 15%.
      const { energia_kcal, proteina_g, carboidrato_g, lipideos_g } = item.valores
      const atwater = 4 * proteina_g + 4 * carboidrato_g + 9 * lipideos_g
      expect(Math.abs(atwater - energia_kcal) / energia_kcal, String(item.id)).toBeLessThan(0.15)
    }
  })

  it('só entra em alimento que a TACO deixou sem energia', () => {
    for (const item of MACROS_USDA.alimentos) expect(daTaco.get(item.id)?.nutrientes['energia_kcal']).toBeNull()
  })

  it('CA-1130: coco verde e os sais continuam sem energia (travessão, nunca zero)', () => {
    for (const id of [591, 516, 517]) expect(buscarAlimento(id)?.nutrientes.energia_kcal).toBeNull()
    expect(MACROS_USDA.alimentos.some((a) => a.id === 591)).toBe(false)
  })

  it('CA-1129: valor da TACO nunca é substituído', () => {
    const leite = ALIMENTOS.find((a) => a.id === 458) as Alimento
    const comTaco: Alimento = {
      id: leite.id,
      descricao: leite.descricao,
      categoria: leite.categoria,
      base: leite.base,
      preparo: leite.preparo,
      qualificadores: leite.qualificadores,
      tracos: leite.tracos,
      nutrientes: { ...leite.nutrientes, energia_kcal: 70, proteina_g: null },
    }
    const [junto] = juntarMacros([comTaco], MACROS_USDA)
    expect(junto?.nutrientes.energia_kcal).toBe(70)
    expect(junto?.nutrientes.proteina_g).toBe(3.15)
    expect(junto?.usdaMacros?.chaves).toEqual(['proteina_g'])
  })

  it('o leite da base em uso soma energia e proteína, com a origem marcada', () => {
    expect(buscarAlimento(458)?.nutrientes).toMatchObject({ energia_kcal: 61, proteina_g: 3.15, lipideos_g: 3.27, carboidrato_g: 4.78, fibra_g: 0 })
    expect(buscarAlimento(458)?.usdaMacros).toMatchObject({ fdcId: 172217, conjunto: 'SR Legacy', versao: '2018-04' })
  })
})

describe('medidas da POF ampliadas (A9, D-381)', () => {
  const porId = (medidas as unknown as { alimentos: Record<string, { pof: { preparacao: string }; medidas: { nome: string; gramas: number }[] }> }).alimentos

  it('CA-1131: ovo cru, queijo minas meia cura, leite em pó, suco de laranja e pão de forma têm medida', () => {
    expect(porId['489']?.medidas).toContainEqual({ nome: 'unidade', gramas: 45 })
    expect(porId['462']?.medidas).toContainEqual({ nome: 'fatia', gramas: 45 })
    expect(porId['459']?.medidas).toContainEqual({ nome: 'colher de sopa', gramas: 16 })
    expect(porId['215']?.medidas).toContainEqual({ nome: 'copo americano', gramas: 150 })
    expect(porId['48']?.medidas).toContainEqual({ nome: 'fatia', gramas: 25 })
  })

  it('CA-1132: carne, ave, peixe, ovo, grão e leguminosa crus só têm medida quando a POF mede o cru', () => {
    const SO_COZIDAS = new Set(['Carnes e derivados', 'Pescados e frutos do mar', 'Ovos e derivados', 'Leguminosas e derivados', 'Cereais e derivados'])
    // Os crus que se comem ou se medem crus: aveia, amendoim, ovo de codorna (unidade igual) e milho verde.
    const COMIDOS_CRUS = new Set([7, 44, 485, 557])
    for (const [id, r] of Object.entries(porId)) {
      const a = daTaco.get(Number(id))
      if (!a || !SO_COZIDAS.has((ALIMENTOS.find((x) => x.id === a.id) as Alimento).categoria)) continue
      if (!/,\s*cru[ao]?s?$/i.test(a.descricao.trim()) || COMIDOS_CRUS.has(a.id)) continue
      expect(r.pof.preparacao, a.descricao).toBe('CRU(A)')
    }
  })

  it('o leite em pó não leva o copo do leite já preparado', () => {
    for (const id of ['456', '459']) for (const m of porId[id]?.medidas ?? []) expect(m.nome).not.toMatch(/^(copo|caneca|caneco|concha|xícara)/)
  })
})

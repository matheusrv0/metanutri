import { calcularAdequacao } from './adequacao.ts'
import { COBERTURA_MINIMA_PCT, ehSugerivel, PORCAO_MAXIMA_PADRAO_G, sugerirParaCobrir } from './cobrir.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Totais } from './totais.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const totais = (v: Partial<Record<ChaveNutrienteAlimento, number>>): Totais => ({
  itens: 3,
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, { total: v[k] ?? 0, semDado: 0 }])) as Totais['nutrientes'],
})

const MULHER_28 = { sexo: 'F' as const, idadeAnos: 28, condicao: { tipo: 'nenhuma' as const } }

const alimento = (id: number, descricao: string, n: Partial<Record<ChaveNutrienteAlimento, number | null>>): Alimento => ({
  id,
  descricao,
  categoria: 'Teste',
  base: null,
  preparo: null,
  qualificadores: null,
  tracos: [],
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, n[k] === undefined ? 0 : n[k]])) as Alimento['nutrientes'],
})

// Base controlada: meta de ferro individual para mulher de 28 anos = 90% de 18 mg = 16,2 mg.
const BASE: Alimento[] = [
  alimento(1, 'Rico e leve', { energia_kcal: 50, ferro_mg: 10 }), // falta 6,2 mg -> 62 g, arredonda para 65 g -> 32,5 kcal
  alimento(2, 'Rico e calórico', { energia_kcal: 500, ferro_mg: 10 }),
  alimento(3, 'Pobre', { energia_kcal: 20, ferro_mg: 0.5 }), // 200 g cobre 1 mg = 16%
  alimento(4, 'Sem ferro', { energia_kcal: 10, ferro_mg: 0 }),
  alimento(5, 'Ferro não analisado', { energia_kcal: 10, ferro_mg: null }),
  alimento(6, 'Sem kcal na base', { energia_kcal: null, ferro_mg: 50 }),
  alimento(7, 'Quase nada', { energia_kcal: 5, ferro_mg: 0.1 }), // 200 g cobre 0,2 mg = 3%
  alimento(8, 'Rico com muito cálcio', { energia_kcal: 40, ferro_mg: 10, calcio_mg: 3000 }),
]

describe('sugerirParaCobrir', () => {
  const plano = totais({ energia_kcal: 1800, ferro_mg: 10, calcio_mg: 1000 })
  const adequacao = calcularAdequacao(plano, MULHER_28, { tipo: 'individual' })

  it('CA-35: informa quanto falta para a meta e a porção de cada sugestão', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.falta).toBeCloseTo(6.2, 6)
    expect(r.unidade).toBe('mg')
    const leve = r.sugestoes.find((s) => s.alimentoId === 1)
    expect(leve).toMatchObject({ gramas: 65, coberturaPct: 100 })
    expect(leve?.kcalAdicionadas).toBeCloseTo(32.5, 6)
  })

  it('CA-36: prioriza o menor acréscimo de kcal por parte da falta coberta', () => {
    // kcal por mg de ferro: alimento 8 = 4 · alimento 1 = 5 · alimento 3 = 40 · alimento 2 = 50
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.sugestoes.map((s) => s.alimentoId)).toEqual([8, 1, 3, 2])
    const pobre = r.sugestoes.find((s) => s.alimentoId === 3)
    expect(pobre).toMatchObject({ gramas: PORCAO_MAXIMA_PADRAO_G, parcial: true })
    expect(pobre?.coberturaPct).toBeCloseTo(16.129, 2)
  })

  it('CA-36 e D-5: porção máxima é editável', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, porcaoMaximaG: 50 })
    const leve = r.sugestoes.find((s) => s.alimentoId === 1)
    expect(leve).toMatchObject({ gramas: 50, parcial: true })
  })

  it('CB-06 e CA-32: ignora alimento sem kcal, sem o nutriente ou com o nutriente não analisado', () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE }).sugestoes.map((s) => s.alimentoId)
    expect(ids).not.toContain(4)
    expect(ids).not.toContain(5)
    expect(ids).not.toContain(6)
  })

  it(`descarta sugestão que cobre menos de ${COBERTURA_MINIMA_PCT}% da falta`, () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE }).sugestoes.map((s) => s.alimentoId)
    expect(ids).not.toContain(7)
  })

  it('CA-35: prefere grupos alimentares diferentes antes de repetir grupo', () => {
    const doGrupo = (id: number, cat: string, kcal: number): Alimento => ({ ...alimento(id, `${cat} ${id}`, { energia_kcal: kcal, ferro_mg: 10 }), categoria: cat })
    const base = [
      doGrupo(1, 'Verduras', 10),
      doGrupo(2, 'Verduras', 11),
      doGrupo(3, 'Verduras', 12),
      doGrupo(4, 'Carnes', 100),
      doGrupo(5, 'Leguminosas', 80),
    ]
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: base }).sugestoes.map((s) => s.alimentoId)
    // os três grupos entram; depois completa com as verduras seguintes, tudo na ordem de prioridade
    expect(ids).toEqual([1, 2, 3, 5, 4])
    const quatro = [...base, doGrupo(6, 'Pescados', 90), doGrupo(7, 'Frutas', 95)]
    const escolhidos = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: quatro }).sugestoes.map((s) => s.alimentoId)
    expect(escolhidos).toEqual([1, 5, 6, 7, 4])
  })

  it('devolve no máximo 5 sugestões', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => alimento(100 + i, `Fonte ${i}`, { energia_kcal: 30 + i, ferro_mg: 20 }))
    expect(sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: muitos }).sugestoes).toHaveLength(5)
  })

  it('CA-37: avisa quando a sugestão faria passar do GET', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 1850, alimentos: BASE })
    // 65 g de um alimento com 500 kcal/100 g = 325 kcal; cabem só 50 kcal até o GET -> 275 acima
    expect(r.sugestoes.find((s) => s.alimentoId === 2)?.avisos).toContainEqual({ tipo: 'excede-gasto', kcalAcima: expect.closeTo(275, 3) })
    expect(r.sugestoes.find((s) => s.alimentoId === 1)?.avisos).toEqual([])
    expect(r.kcalDisponiveis).toBeCloseTo(50, 6)
  })

  it('CA-37: avisa quando a sugestão faria passar do UL de outro nutriente', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    const rica = r.sugestoes.find((s) => s.alimentoId === 8)
    // 65 g -> +1950 mg de cálcio; plano tem 1000; UL 2500
    expect(rica?.avisos).toContainEqual({ tipo: 'excede-limite', chave: 'calcio_mg', rotulo: 'Cálcio' })
  })

  it('sem GET informado, não avisa sobre energia', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: null, alimentos: BASE })
    expect(r.kcalDisponiveis).toBeNull()
    expect(r.sugestoes.every((s) => s.avisos.every((a) => a.tipo !== 'excede-gasto'))).toBe(true)
  })

  it('CA-39: explica quando nenhum alimento cobre parte da falta', () => {
    const insuficientes = BASE.filter((a) => a.id === 4 || a.id === 7)
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: insuficientes })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/Nenhum alimento/)
  })

  it('CA-40: não sugere alimentos ocultados pelo usuário', () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, ocultos: new Set([8, 1]) }).sugestoes.map((s) => s.alimentoId)
    expect(ids).toEqual([3, 2])
  })

  it('CA-34: nutriente que já atingiu a meta não tem o que cobrir', () => {
    const r = sugerirParaCobrir('calcio_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.falta).toBe(0)
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/já atingiu/)
  })

  it('sem estágio de vida não sugere nada', () => {
    const semEstagio = calcularAdequacao(plano, { sexo: null, idadeAnos: null, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
    const r = sugerirParaCobrir('ferro_mg', plano, semEstagio, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/referências/)
  })

  it('funciona com a TACO completa e sugere fontes reais de ferro', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: ALIMENTOS })
    expect(r.sugestoes.length).toBe(5)
    expect(r.sugestoes.every((s) => s.gramas <= PORCAO_MAXIMA_PADRAO_G && s.gramas > 0)).toBe(true)
  })

  it('CA-36a: com a TACO completa, não sugere ingrediente nem forma crua de alimento que se cozinha', () => {
    for (const chave of ['ferro_mg', 'magnesio_mg', 'potassio_mg', 'zinco_mg', 'fibra_g', 'calcio_mg'] as const) {
      const vazio = totais({ energia_kcal: 1600 })
      const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
      const descricoes = sugerirParaCobrir(chave, vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS }).sugestoes.map((s) => s.descricao)
      for (const d of descricoes) {
        expect(d, chave).not.toMatch(/(^|[\s,])pó($|[\s,])|desidratad|^Feijão, [^,]+, cru$|^Café, pó|^Fermento|^Farinha, de (arroz|trigo)/)
      }
    }
  })

  it('CA-36a: o usuário pode incluir ingredientes', () => {
    const vazio = totais({ energia_kcal: 1600 })
    const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
    const com = sugerirParaCobrir('ferro_mg', vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS, incluirIngredientes: true })
    expect(com.sugestoes.map((s) => s.descricao)).toContain('Coentro, folhas desidratadas')
  })
})

describe('ehSugerivel (CA-36a)', () => {
  const porDescricao = (d: string) => {
    const a = ALIMENTOS.find((x) => x.descricao === d)
    if (!a) throw new Error(`não encontrado: ${d}`)
    return a
  }

  it.each([
    'Café, pó, torrado',
    'Sal, grosso',
    'Fermento, biológico, levedura, tablete',
    'Coentro, folhas desidratadas',
    'Achocolatado, pó',
    'Farinha, de trigo',
    'Milho, amido, cru',
    'Soja, farinha',
    'Milho, fubá, cru',
    'Leite, de vaca, desnatado, pó',
    'Feijão, carioca, cru',
    'Carne, bovina, fígado, cru',
    'Frango, peito, sem pele, cru',
    'Ovo, de galinha, inteiro, cru',
    'Arroz, integral, cru',
    'Salmão, sem pele, fresco, cru',
  ])('não sugere "%s"', (d) => {
    expect(ehSugerivel(porDescricao(d))).toBe(false)
  })

  it.each([
    'Feijão, carioca, cozido',
    'Carne, bovina, fígado, grelhado',
    'Aveia, flocos, crua',
    'Acerola, crua',
    'Cenoura, crua',
    'Farinha, de mandioca, torrada',
    'Farinha, láctea, de cereais',
    'Pescada, filé, com farinha de trigo, frito',
    'Castanha-do-Brasil, crua',
  ])('sugere "%s"', (d) => {
    expect(ehSugerivel(porDescricao(d))).toBe(true)
  })
})

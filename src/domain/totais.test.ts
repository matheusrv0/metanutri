import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import { itemDeReceita, KCAL_DA_PANQUECA, PANQUECA, VITAMINA_C_DA_PANQUECA } from './receitas.test-utils.ts'
import { buscarAlimento } from './tabelas.ts'
import { totaisDeItens, totaisDoPlano } from './totais.ts'
import type { ItemPlano, Plano, Refeicao } from './tipos.ts'

// Alimentos reais da TACO usados nos testes (valores por 100 g):
// 1   Arroz, integral, cozido         kcal 123.5349 · ferro 0.262 · vitamina C null
// 410 Frango, peito, sem pele, grelhado kcal 159.185 · ferro 0.3287 · vitamina C null
// 100 Brócolis, cozido                kcal 24.6362 · ferro 0.535 · vitamina C 42.0033
const item = (id: string, alimentoId: number, gramas: number): ItemPlano => ({ id, alimentoId, gramas })

const refeicao = (id: string, principal: ItemPlano[], substituto1: ItemPlano[] = [], substituto2: ItemPlano[] = []): Refeicao => ({
  id,
  nome: id,
  horario: '12:00',
  opcoes: { principal, substituto1, substituto2 },
})

describe('totaisDeItens', () => {
  it('soma nutrientes proporcionalmente às gramas', () => {
    const t = totaisDeItens([item('a', 1, 150), item('b', 410, 100)], buscarAlimento)
    expect(t.nutrientes.energia_kcal.total).toBeCloseTo(123.5349 * 1.5 + 159.185, 3)
    expect(t.nutrientes.ferro_mg.total).toBeCloseTo(0.262 * 1.5 + 0.3287, 3)
    expect(t.itens).toBe(2)
  })

  it('CA-32: conta alimentos sem dado e não os trata como zero em silêncio', () => {
    const t = totaisDeItens([item('a', 1, 100), item('b', 100, 100)], buscarAlimento)
    expect(t.nutrientes.vitamina_c_mg.total).toBeCloseTo(42.0033, 3)
    expect(t.nutrientes.vitamina_c_mg.semDado).toBe(1)
    expect(t.nutrientes.ferro_mg.semDado).toBe(0)
  })

  it('CA-950 (spec vitaminas-usda): soma as chaves do USDA e conta quem não tem o dado', () => {
    // 317 Salmão grelhado: vitamina D 13,1 µg, gordura trans nula. 533 Cuscuz: sem equivalente no USDA.
    const t = totaisDeItens([item('a', 317, 150), item('b', 533, 100)], buscarAlimento)
    expect(t.nutrientes.vitamina_d_mcg.total).toBeCloseTo(13.1 * 1.5, 6)
    expect(t.nutrientes.vitamina_d_mcg.semDado).toBe(1)
    expect(t.nutrientes.selenio_mcg.total).toBeCloseTo(41.4 * 1.5, 6)
    expect(t.nutrientes.gordura_trans_g.total).toBe(0)
    expect(t.nutrientes.gordura_trans_g.semDado).toBe(2)
  })

  it('CB-04: quantidade zero é aceita e não soma nem conta', () => {
    const t = totaisDeItens([item('a', 1, 0)], buscarAlimento)
    expect(t.nutrientes.energia_kcal.total).toBe(0)
    expect(t.nutrientes.vitamina_c_mg.semDado).toBe(0)
    expect(t.itens).toBe(0)
  })

  it('CB-04: quantidade negativa é recusada', () => {
    expect(() => totaisDeItens([item('a', 1, -10)], buscarAlimento)).toThrow(RangeError)
  })

  it('CB-05: lista vazia dá zero em tudo', () => {
    const t = totaisDeItens([], buscarAlimento)
    expect(t.itens).toBe(0)
    expect(t.nutrientes.energia_kcal).toEqual({ total: 0, semDado: 0 })
  })

  it('CA-793 (spec revisao-geral-trabalho): alimento que não existe mais (produto apagado) conta como falta de dado em tudo', () => {
    const t = totaisDeItens([item('a', 1, 100), item('b', 900_001, 40)], buscarAlimento)
    expect(t.itens).toBe(2)
    expect(t.nutrientes.energia_kcal).toEqual({ total: 123.5349, semDado: 1 })
    expect(t.nutrientes.ferro_mg).toEqual({ total: 0.262, semDado: 1 })
  })

  it('CA-793: nutriente que o alimento não traz (indefinido) é falta de dado, nunca NaN', () => {
    const semVitaminaA = { ...buscarAlimento(1), nutrientes: { energia_kcal: 100 } } as unknown as ReturnType<typeof buscarAlimento>
    const t = totaisDeItens([item('a', 1, 100)], () => semVitaminaA)
    expect(t.nutrientes.vitamina_a_rae_mcg).toEqual({ total: 0, semDado: 1 })
    expect(t.nutrientes.energia_kcal).toEqual({ total: 100, semDado: 0 })
  })
})

describe('a receita com dado faltando (spec integracao-rodada-1910, D-318)', () => {
  it('CA-985: o ingrediente apagado conta como falta de dado na energia e nos macros da receita', () => {
    const comApagado = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 900_001, gramas: 20 }] }
    const t = totaisDeItens([itemDeReceita('a', 120, comApagado)], buscarAlimento)
    for (const chave of ['energia_kcal', 'proteina_g', 'carboidrato_g', 'lipideos_g'] as const) expect(t.nutrientes[chave].semDado, chave).toBeGreaterThan(0)
    expect(Number.isNaN(t.nutrientes.energia_kcal.total)).toBe(false)
    expect(totaisDeItens([itemDeReceita('a', 120)], buscarAlimento).nutrientes.energia_kcal.semDado).toBe(0)
  })
})

describe('totaisDoPlano', () => {
  it('CA-43 (D-2): soma só a opção Principal de cada refeição', () => {
    const plano: Plano = {
      refeicoes: [
        refeicao('almoco', [item('a', 1, 100)], [item('s1', 410, 500)], [item('s2', 100, 500)]),
        refeicao('jantar', [item('b', 410, 100)]),
      ],
    }
    const t = totaisDoPlano(plano, buscarAlimento)
    expect(t.nutrientes.energia_kcal.total).toBeCloseTo(123.5349 + 159.185, 3)
    expect(t.itens).toBe(2)
  })

  it('CB-05: plano sem refeições dá zero', () => {
    expect(totaisDoPlano({ refeicoes: [] }, buscarAlimento).nutrientes.energia_kcal.total).toBe(0)
  })
})

describe('receita no plano (spec receitas-com-calculo)', () => {
  it('CA-874: a receita soma pelos ingredientes, na proporção das gramas', () => {
    const uma = totaisDeItens([itemDeReceita('a', 120)], buscarAlimento)
    expect(uma.nutrientes.energia_kcal.total).toBeCloseTo(KCAL_DA_PANQUECA, 6)
    expect(uma.nutrientes.vitamina_c_mg.total).toBeCloseTo(VITAMINA_C_DA_PANQUECA, 6)
    expect(uma.itens).toBe(1)
    const duas = totaisDeItens([itemDeReceita('a', 240)], buscarAlimento)
    expect(duas.nutrientes.energia_kcal.total).toBeCloseTo(2 * KCAL_DA_PANQUECA, 6)
  })

  it('CA-874: soma junto com os alimentos soltos', () => {
    const t = totaisDeItens([itemDeReceita('a', 120), item('b', 1, 100)], buscarAlimento)
    expect(t.nutrientes.energia_kcal.total).toBeCloseTo(KCAL_DA_PANQUECA + 123.5349, 6)
    expect(t.itens).toBe(2)
  })

  it('CA-875: ingrediente sem o nutriente conta na marca †, e o dos outros entra', () => {
    const t = totaisDeItens([itemDeReceita('a', 120)], buscarAlimento)
    // Vitamina C: o ovo não tem dado; banana e aveia somam.
    expect(t.nutrientes.vitamina_c_mg.semDado).toBe(1)
    // Vitamina A: só a banana tem.
    expect(t.nutrientes.vitamina_a_rae_mcg.semDado).toBe(2)
    expect(t.nutrientes.vitamina_a_rae_mcg.total).toBeCloseTo((16.2083 * 1.5) / 2, 6)
    expect(t.nutrientes.energia_kcal.semDado).toBe(0)
  })

  it('CB-271: ingrediente que não existe mais conta como sem dado em tudo, sem quebrar', () => {
    const comRemovido = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 999_999, gramas: 20 }], pesoProntoG: null }
    const t = totaisDeItens([itemDeReceita('a', 150, comRemovido)], buscarAlimento)
    expect(t.nutrientes.energia_kcal.semDado).toBe(1)
    expect(t.nutrientes.energia_kcal.total).toBeGreaterThan(0)
  })

  it('CB-272: receita com 0 g não soma nem conta', () => {
    const t = totaisDeItens([itemDeReceita('a', 0)], buscarAlimento)
    expect(t.itens).toBe(0)
    expect(t.nutrientes.energia_kcal).toEqual({ total: 0, semDado: 0 })
  })

  it('CB-273: cópia estragada conta como sem dado em todo nutriente, sem quebrar', () => {
    const estragado = { id: 'a', alimentoId: ID_DE_RECEITA, gramas: 100, receita: { nome: 'X' } } as unknown as ItemPlano
    const t = totaisDeItens([estragado], buscarAlimento)
    expect(t.itens).toBe(1)
    expect(t.nutrientes.energia_kcal).toEqual({ total: 0, semDado: 1 })
    expect(t.nutrientes.ferro_mg.semDado).toBe(1)
  })

  it('CB-273 (rodada da revisão): cópia sem ingrediente com gramas leva a marca †, nunca soma zero em silêncio', () => {
    const t = totaisDeItens([itemDeReceita('a', 100, { ...PANQUECA, ingredientes: [], pesoProntoG: 100 })], buscarAlimento)
    expect(t.nutrientes.energia_kcal).toEqual({ total: 0, semDado: 1 })
  })

  it('CA-874: receita em substituto não soma no dia', () => {
    const plano: Plano = { refeicoes: [refeicao('cafe', [item('a', 1, 100)], [itemDeReceita('s', 120)])] }
    expect(totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total).toBeCloseTo(123.5349, 6)
  })
})

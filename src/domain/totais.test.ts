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

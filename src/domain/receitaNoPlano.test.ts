import {
  ID_DE_RECEITA,
  ingredientesNaQuantidade,
  nomeDaReceita,
  pesoDaPorcao,
  pesoProntoDe,
  porcoesDe,
  receitaDoItem,
  receitasDoPlano,
  textoDaPorcao,
  textoDoRendimento,
} from './receitaNoPlano.ts'
import { itemDeReceita, PANQUECA } from './receitas.test-utils.ts'
import type { ItemPlano, Plano, ReceitaDoPlano } from './tipos.ts'

describe('a conta da receita (D-271)', () => {
  it('o peso pronto vale quando existe; sem ele, a soma dos ingredientes', () => {
    expect(pesoProntoDe(PANQUECA)).toBe(240)
    expect(pesoProntoDe({ ...PANQUECA, pesoProntoG: null })).toBe(280)
  })

  it('o peso da porção é o peso pronto dividido pelas porções', () => {
    expect(pesoDaPorcao(PANQUECA)).toBe(120)
    expect(pesoDaPorcao({ ...PANQUECA, pesoProntoG: null })).toBe(140)
  })

  it('as porções saem das gramas servidas', () => {
    expect(porcoesDe(PANQUECA, 120)).toBe(1)
    expect(porcoesDe(PANQUECA, 180)).toBe(1.5)
    expect(porcoesDe(PANQUECA, 0)).toBe(0)
  })

  it('os ingredientes na quantidade servida: 1 porção de uma receita que rende 2 leva metade de cada um', () => {
    expect(ingredientesNaQuantidade(PANQUECA, 120)).toEqual([
      { alimentoId: 182, gramas: 75 },
      { alimentoId: 489, gramas: 50 },
      { alimentoId: 7, gramas: 15 },
    ])
  })
})

describe('o texto da porção (CA-873, CB-279)', () => {
  it('em meias medidas, com o nome da porção', () => {
    expect(textoDaPorcao(PANQUECA, 120)).toBe('1 unidade')
    expect(textoDaPorcao(PANQUECA, 180)).toBe('1 unidade e meia')
    expect(textoDaPorcao(PANQUECA, 240)).toBe('2 unidades')
    expect(textoDaPorcao(PANQUECA, 60)).toBe('meia unidade')
  })

  it('porção é feminina e masculina conforme o nome', () => {
    expect(textoDaPorcao({ ...PANQUECA, nomeDaPorcao: 'porção' }, 60)).toBe('meia porção')
    expect(textoDaPorcao({ ...PANQUECA, nomeDaPorcao: 'porção' }, 360)).toBe('3 porções')
    expect(textoDaPorcao({ ...PANQUECA, nomeDaPorcao: 'copo' }, 60)).toBe('meio copo')
    expect(textoDaPorcao({ ...PANQUECA, nomeDaPorcao: 'colher de sopa' }, 240)).toBe('2 colheres de sopa')
  })

  it('CB-279: sem meia medida a 15% do peso, não há texto (a tela mostra o peso)', () => {
    expect(textoDaPorcao(PANQUECA, 150)).toBeNull()
    expect(textoDaPorcao(PANQUECA, 0)).toBeNull()
  })

  it('CB-279: rendimento fracionado usa o número exato', () => {
    const r = { ...PANQUECA, porcoes: 2.5, pesoProntoG: 250 }
    expect(pesoDaPorcao(r)).toBe(100)
    expect(textoDaPorcao(r, 100)).toBe('1 unidade')
  })

  it('o rendimento por extenso', () => {
    expect(textoDoRendimento(PANQUECA)).toBe('Rende 2 unidades (120 g cada)')
    expect(textoDoRendimento({ ...PANQUECA, porcoes: 1, nomeDaPorcao: 'porção', pesoProntoG: 300 })).toBe('Rende 1 porção (300 g)')
    expect(textoDoRendimento({ ...PANQUECA, porcoes: 2.5, pesoProntoG: 250 })).toBe('Rende 2 unidades e meia (100 g cada)')
  })
})

describe('ler a cópia do item (CB-273)', () => {
  it('item de receita com a cópia inteira', () => {
    expect(receitaDoItem(itemDeReceita('a', 120))).toEqual(PANQUECA)
  })

  it('item de alimento não é receita', () => {
    expect(receitaDoItem({ id: 'a', alimentoId: 182, gramas: 100 })).toBeNull()
  })

  it('cópia estragada não é lida', () => {
    const estragadas: unknown[] = [
      { ...PANQUECA, nome: 3 },
      { ...PANQUECA, ingredientes: 'banana' },
      { ...PANQUECA, ingredientes: [{ alimentoId: '182', gramas: 10 }] },
      { ...PANQUECA, ingredientes: [{ alimentoId: 182, gramas: -1 }] },
      { ...PANQUECA, porcoes: 0 },
      { ...PANQUECA, pesoProntoG: 0 },
      { ...PANQUECA, ingredientes: [], pesoProntoG: null },
      null,
    ]
    for (const receita of estragadas) {
      const item = { id: 'a', alimentoId: ID_DE_RECEITA, gramas: 100, receita } as unknown as ItemPlano
      expect(receitaDoItem(item)).toBeNull()
    }
  })

  it('o nome da receita: o que foi escrito; vazio ou estragado, um nome que diz o que houve', () => {
    expect(nomeDaReceita(PANQUECA)).toBe('Panqueca de banana')
    expect(nomeDaReceita({ ...PANQUECA, nome: '  ' })).toBe('Receita sem nome')
    expect(nomeDaReceita(null)).toBe('Receita sem dados')
  })
})

describe('as receitas do plano (CA-880, CB-272, CB-278)', () => {
  const plano = (principal: ItemPlano[], substituto1: ItemPlano[] = []): Plano => ({
    refeicoes: [{ id: 'r', nome: 'Café', horario: '07:00', opcoes: { principal, substituto1, substituto2: [] } }],
  })
  const BOLO: ReceitaDoPlano = { ...PANQUECA, origemId: 'r-bolo', nome: 'Bolo de aveia' }

  it('cada receita uma vez, na ordem do plano, da principal e dos substitutos', () => {
    const p = plano([itemDeReceita('a', 120), { id: 'b', alimentoId: 182, gramas: 75 }], [itemDeReceita('c', 240), itemDeReceita('d', 120, BOLO)])
    expect(receitasDoPlano(p).map((r) => r.nome)).toEqual(['Panqueca de banana', 'Bolo de aveia'])
  })

  it('CB-272: receita com 0 g não entra', () => {
    expect(receitasDoPlano(plano([itemDeReceita('a', 0)]))).toEqual([])
  })

  it('CB-278: duas cópias diferentes da mesma receita saem as duas', () => {
    const mudada = { ...PANQUECA, preparo: 'Outro preparo.' }
    expect(receitasDoPlano(plano([itemDeReceita('a', 120), itemDeReceita('b', 120, mudada)]))).toEqual([PANQUECA, mudada])
  })
})

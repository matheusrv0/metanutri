// Spec receitas-com-calculo, D-277: a receita na folha impressa (CA-879 a CA-881, CB-271, CB-272, CB-278).
import { comprasDaFolha, linhaDaFolha, opcoesDaRefeicao, receitasDaFolha } from './folhaDieta.ts'
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import { itemDeReceita, PANQUECA } from './receitas.test-utils.ts'
import { buscarAlimento } from './tabelas.ts'
import type { ItemPlano, Plano } from './tipos.ts'

const BANANA = 182

const plano = (principal: ItemPlano[], substituto1: ItemPlano[] = []): Plano => ({
  refeicoes: [
    { id: 'cafe', nome: 'Café da manhã', horario: '07:00', opcoes: { principal, substituto1, substituto2: [] } },
    { id: 'lanche', nome: 'Lanche', horario: '10:00', opcoes: { principal: [{ id: 'b', alimentoId: BANANA, gramas: 75 }], substituto1: [], substituto2: [] } },
  ],
})

describe('a linha da refeição (CA-879)', () => {
  it('receita: o nome como foi escrito, a porção com o peso ao lado', () => {
    expect(linhaDaFolha(itemDeReceita('a', 180), buscarAlimento)).toEqual({
      nome: 'Panqueca de banana',
      quantidade: { medida: '1 unidade e meia', gramas: 180, comPeso: true },
    })
  })

  it('CB-279: sem meia porção que feche, só o peso', () => {
    expect(linhaDaFolha(itemDeReceita('a', 150), buscarAlimento).quantidade).toEqual({ medida: null, gramas: 150, comPeso: true })
  })

  it('alimento: o nome para o paciente e a quantidade da folha, como antes', () => {
    expect(linhaDaFolha({ id: 'b', alimentoId: BANANA, gramas: 75 }, buscarAlimento)).toEqual({
      nome: 'Banana prata',
      quantidade: { medida: '1 unidade', gramas: 75, comPeso: false },
    })
  })

  it('CB-273: cópia estragada', () => {
    const estragado = { id: 'x', alimentoId: ID_DE_RECEITA, gramas: 100, receita: { nome: 'X' } } as unknown as ItemPlano
    expect(linhaDaFolha(estragado, buscarAlimento).nome).toBe('Receita sem dados')
  })
})

describe('a seção Receitas (CA-880, CB-278)', () => {
  it('cada receita uma vez: nome, rendimento, ingredientes da receita inteira e o modo de preparo', () => {
    const [panqueca, ...resto] = receitasDaFolha(plano([itemDeReceita('a', 120)], [itemDeReceita('s', 240)]), buscarAlimento)
    expect(resto).toEqual([])
    expect(panqueca).toEqual({
      nome: 'Panqueca de banana',
      rendimento: 'Rende 2 unidades (120 g cada)',
      ingredientes: [
        { nome: 'Banana prata', quantidade: { medida: '2 unidades', gramas: 150, comPeso: false } },
        { nome: 'Ovo', quantidade: { medida: null, gramas: 100, comPeso: false } },
        { nome: 'Aveia em flocos', quantidade: { medida: '2 colheres de sopa', gramas: 30, comPeso: false } },
      ],
      preparo: PANQUECA.preparo,
    })
  })

  it('CB-271 e CA-982 (integracao-rodada-1910): o ingrediente apagado fica fora da seção Receitas, e a receita continua na refeição', () => {
    const comApagado = { ...PANQUECA, ingredientes: [{ alimentoId: BANANA, gramas: 150 }, { alimentoId: 900_001, gramas: 20 }] }
    const p = plano([itemDeReceita('a', 120, comApagado)])
    const [r] = receitasDaFolha(p, buscarAlimento)
    expect(r?.ingredientes.map((i) => i.nome)).toEqual(['Banana prata'])
    const [cafe] = p.refeicoes
    if (!cafe) throw new Error('plano sem café')
    expect(opcoesDaRefeicao(cafe, buscarAlimento).flat().map((i) => linhaDaFolha(i, buscarAlimento).nome)).toEqual(['Panqueca de banana'])
  })

  it('CB-272: receita com 0 g não entra; plano sem receita, lista vazia', () => {
    expect(receitasDaFolha(plano([itemDeReceita('a', 0)]), buscarAlimento)).toEqual([])
    expect(receitasDaFolha(plano([]), buscarAlimento)).toEqual([])
  })
})

describe('a lista de compras abre a receita (CA-881)', () => {
  it('1 porção de uma receita que rende 2 leva metade de cada ingrediente, somada ao mesmo alimento de fora', () => {
    const compras = comprasDaFolha(plano([itemDeReceita('a', 120)]), buscarAlimento)
    expect(compras.map((c) => [c.nome, c.gramas])).toEqual([
      ['Aveia em flocos', 15],
      ['Banana prata', 150],
      ['Ovo', 50],
    ])
    expect(compras.some((c) => c.nome === 'Panqueca de banana')).toBe(false)
  })

  it('CB-271 (rodada da revisão): ingrediente que não existe mais não vira linha da lista de compras', () => {
    const comRemovidos = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 999_998, gramas: 10 }, { alimentoId: 999_999, gramas: 20 }], pesoProntoG: null }
    const compras = comprasDaFolha(plano([itemDeReceita('a', 155, comRemovidos)]), buscarAlimento)
    expect(compras.map((c) => c.nome)).toEqual(['Aveia em flocos', 'Banana prata', 'Ovo'])
  })

  it('receita em substituto não entra na lista do dia, como todo substituto', () => {
    const compras = comprasDaFolha(plano([], [itemDeReceita('s', 120)]), buscarAlimento)
    expect(compras.map((c) => c.nome)).toEqual(['Banana prata'])
  })
})

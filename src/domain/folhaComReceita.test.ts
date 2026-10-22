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
  it('receita: o nome como foi escrito e a porção, uma quantidade só (spec conduta-da-nutricionista, D-297); em "Gramas", o peso', () => {
    expect(linhaDaFolha(itemDeReceita('a', 180), buscarAlimento)).toMatchObject({
      nome: 'Panqueca de banana',
      quantidade: { medida: '1 unidade e meia', gramas: 180 },
    })
    expect(linhaDaFolha(itemDeReceita('a', 180), buscarAlimento, 'gramas').quantidade).toMatchObject({ medida: null, gramas: 180 })
  })

  it('CB-279: sem meia porção que feche, só o peso', () => {
    expect(linhaDaFolha(itemDeReceita('a', 150), buscarAlimento).quantidade).toMatchObject({ medida: null, gramas: 150 })
  })

  it('alimento: o nome para o paciente e a quantidade da folha, como antes', () => {
    expect(linhaDaFolha({ id: 'b', alimentoId: BANANA, gramas: 75 }, buscarAlimento)).toMatchObject({
      nome: 'Banana prata',
      quantidade: { medida: '1 unidade', gramas: 75 },
    })
  })

  it('CB-273: cópia estragada', () => {
    const estragado = { id: 'x', alimentoId: ID_DE_RECEITA, gramas: 100, receita: { nome: 'X' } } as unknown as ItemPlano
    expect(linhaDaFolha(estragado, buscarAlimento).nome).toBe('Receita sem dados')
  })
})

describe('CB-317 (integracao-rodada-1910, revisão final M-5): receita sem o que comer fica fora da folha', () => {
  const soApagados = { ...PANQUECA, ingredientes: [{ alimentoId: 900_001, gramas: 150 }, { alimentoId: 900_002, gramas: 50 }] }
  const estragado = { id: 'x', alimentoId: ID_DE_RECEITA, gramas: 100, receita: { nome: 'X' } } as unknown as ItemPlano

  it('todos os ingredientes apagados: sai da refeição e da seção Receitas', () => {
    const p = plano([itemDeReceita('a', 120, soApagados), { id: 'b', alimentoId: BANANA, gramas: 75 }])
    const [cafe] = p.refeicoes
    if (!cafe) throw new Error('plano sem café')
    expect(opcoesDaRefeicao(cafe, buscarAlimento).flat().map((i) => i.id)).toMatchObject(['b'])
    expect(receitasDaFolha(p, buscarAlimento)).toMatchObject([])
  })

  it('cópia estragada (CB-273): sai da refeição', () => {
    const [cafe] = plano([estragado, { id: 'b', alimentoId: BANANA, gramas: 75 }]).refeicoes
    if (!cafe) throw new Error('plano sem café')
    expect(opcoesDaRefeicao(cafe, buscarAlimento).flat().map((i) => i.id)).toMatchObject(['b'])
  })

  it('com um ingrediente que ainda existe, a receita fica', () => {
    const umQueFica = { ...soApagados, ingredientes: [...soApagados.ingredientes, { alimentoId: BANANA, gramas: 75 }] }
    const p = plano([itemDeReceita('a', 120, umQueFica)])
    const [cafe] = p.refeicoes
    if (!cafe) throw new Error('plano sem café')
    expect(opcoesDaRefeicao(cafe, buscarAlimento).flat().map((i) => i.id)).toMatchObject(['a'])
    expect(receitasDaFolha(p, buscarAlimento).map((r) => r.ingredientes.map((i) => i.nome))).toMatchObject([['Banana prata']])
  })
})

describe('a seção Receitas (CA-880, CB-278)', () => {
  it('cada receita uma vez: nome, rendimento, ingredientes da receita inteira e o modo de preparo', () => {
    const [panqueca, ...resto] = receitasDaFolha(plano([itemDeReceita('a', 120)], [itemDeReceita('s', 240)]), buscarAlimento)
    expect(resto).toMatchObject([])
    expect(panqueca).toMatchObject({
      nome: 'Panqueca de banana',
      rendimento: 'Rende 2 unidades (120 g cada)',
      ingredientes: [
        { nome: 'Banana prata', quantidade: { medida: '2 unidades', gramas: 150 } },
        { nome: 'Ovo', quantidade: { medida: null, gramas: 100 } },
        { nome: 'Aveia em flocos', quantidade: { medida: '2 colheres de sopa', gramas: 30 } },
      ],
      preparo: PANQUECA.preparo,
    })
  })

  it('CB-271 e CA-982 (integracao-rodada-1910): o ingrediente apagado fica fora da seção Receitas, e a receita continua na refeição', () => {
    const comApagado = { ...PANQUECA, ingredientes: [{ alimentoId: BANANA, gramas: 150 }, { alimentoId: 900_001, gramas: 20 }] }
    const p = plano([itemDeReceita('a', 120, comApagado)])
    const [r] = receitasDaFolha(p, buscarAlimento)
    expect(r?.ingredientes.map((i) => i.nome)).toMatchObject(['Banana prata'])
    const [cafe] = p.refeicoes
    if (!cafe) throw new Error('plano sem café')
    expect(opcoesDaRefeicao(cafe, buscarAlimento).flat().map((i) => linhaDaFolha(i, buscarAlimento).nome)).toMatchObject(['Panqueca de banana'])
  })

  it('CB-272: receita com 0 g não entra; plano sem receita, lista vazia', () => {
    expect(receitasDaFolha(plano([itemDeReceita('a', 0)]), buscarAlimento)).toMatchObject([])
    expect(receitasDaFolha(plano([]), buscarAlimento)).toMatchObject([])
  })
})

describe('a lista de compras abre a receita (CA-881)', () => {
  it('1 porção de uma receita que rende 2 leva metade de cada ingrediente, somada ao mesmo alimento de fora', () => {
    const compras = comprasDaFolha(plano([itemDeReceita('a', 120)]), buscarAlimento)
    expect(compras.map((c) => [c.nome, c.gramas])).toMatchObject([
      ['Aveia em flocos', 15],
      ['Banana prata', 150],
      ['Ovo', 50],
    ])
    expect(compras.some((c) => c.nome === 'Panqueca de banana')).toBe(false)
  })

  it('CB-271 (rodada da revisão): ingrediente que não existe mais não vira linha da lista de compras', () => {
    const comRemovidos = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 999_998, gramas: 10 }, { alimentoId: 999_999, gramas: 20 }], pesoProntoG: null }
    const compras = comprasDaFolha(plano([itemDeReceita('a', 155, comRemovidos)]), buscarAlimento)
    expect(compras.map((c) => c.nome)).toMatchObject(['Aveia em flocos', 'Banana prata', 'Ovo'])
  })

  it('receita em substituto não entra na lista do dia, como todo substituto', () => {
    const compras = comprasDaFolha(plano([], [itemDeReceita('s', 120)]), buscarAlimento)
    expect(compras.map((c) => c.nome)).toMatchObject(['Banana prata'])
  })
})

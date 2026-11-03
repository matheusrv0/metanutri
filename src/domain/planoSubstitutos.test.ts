// Spec busca-substitutos: substituir o item, desfazer e pôr ou tirar a opção (D-1113, D-1114).
import { adicionarItem, adicionarOpcaoAoItem, criarPlanoPadrao, devolverItem, removerItem, substituirItem, tirarOpcaoDoItem } from './plano.ts'
import { buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { ItemPlano, Plano } from './tipos.ts'

const gerador = () => {
  let n = 0
  return () => `id${++n}`
}

const BATATA = { alimentoId: 91, gramas: 350, medida: { nome: 'unidade', quantidade: 2.5, gramasPorMedida: 140 } }
const POLENTA = { alimentoId: 62, gramas: 180, medida: { nome: 'colher de servir', quantidade: 3, gramasPorMedida: 60 } }
const CARA = { alimentoId: 102, gramas: 225, medida: null }

function almocoComArrozEFeijao(): { plano: Plano; refeicaoId: string; arroz: ItemPlano; feijao: ItemPlano } {
  const id = gerador()
  let plano = criarPlanoPadrao(id)
  const refeicaoId = plano.refeicoes.find((r) => r.nome === 'Almoço')?.id ?? ''
  plano = adicionarItem(plano, refeicaoId, 'principal', { alimentoId: 3, gramas: 150, medida: { nome: 'colher de sopa', quantidade: 6, gramasPorMedida: 25 } }, id)
  plano = adicionarItem(plano, refeicaoId, 'principal', { alimentoId: 561, gramas: 140 }, id)
  const [arroz, feijao] = principal(plano, refeicaoId)
  if (!arroz || !feijao) throw new Error('sem itens')
  return { plano, refeicaoId, arroz, feijao }
}

const principal = (plano: Plano, refeicaoId: string): readonly ItemPlano[] => plano.refeicoes.find((r) => r.id === refeicaoId)?.opcoes.principal ?? []

describe('D-1113: substituir o item', () => {
  it('CA-2118: o item vira o candidato, com a porção e a medida, no mesmo lugar e com o mesmo id', () => {
    const { plano, refeicaoId, arroz, feijao } = almocoComArrozEFeijao()
    const depois = substituirItem(plano, refeicaoId, arroz.id, BATATA)
    expect(principal(depois, refeicaoId)).toEqual([{ id: arroz.id, ...BATATA }, feijao])
  })

  it('CA-2118: sem medida, o item fica em "só gramas" (D-379)', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    expect(principal(substituirItem(plano, refeicaoId, arroz.id, CARA), refeicaoId)[0]).toEqual({ id: arroz.id, ...CARA })
  })

  it('CA-2118: o total do dia muda', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const antes = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    const depois = totaisDoPlano(substituirItem(plano, refeicaoId, arroz.id, BATATA), buscarAlimento).nutrientes.energia_kcal.total
    expect(depois).not.toBeCloseTo(antes, 0)
  })

  it('CB-1105: as opções ficam, menos a que é o alimento novo', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const comOpcoes = adicionarOpcaoAoItem(adicionarOpcaoAoItem(plano, refeicaoId, arroz.id, BATATA), refeicaoId, arroz.id, POLENTA)
    const depois = substituirItem(comOpcoes, refeicaoId, arroz.id, BATATA)
    expect(principal(depois, refeicaoId)[0]?.opcoesDoItem).toEqual([POLENTA])
  })

  it('o item que não existe mais dá erro, como nas outras operações', () => {
    const { plano, refeicaoId } = almocoComArrozEFeijao()
    expect(() => substituirItem(plano, refeicaoId, 'nao-existe', BATATA)).toThrow()
  })
})

describe('D-1113: desfazer', () => {
  it('CA-2119: o item volta como era, com as opções', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const comOpcao = adicionarOpcaoAoItem(plano, refeicaoId, arroz.id, POLENTA)
    const arrozComOpcao = principal(comOpcao, refeicaoId)[0]
    if (!arrozComOpcao) throw new Error('sem arroz')
    const trocado = substituirItem(comOpcao, refeicaoId, arroz.id, BATATA)
    expect(devolverItem(trocado, refeicaoId, arrozComOpcao)).toEqual(comOpcao)
  })

  it('CB-1108: removido depois, o item não volta', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const semArroz = removerItem(substituirItem(plano, refeicaoId, arroz.id, BATATA), refeicaoId, 'principal', arroz.id)
    expect(devolverItem(semArroz, refeicaoId, arroz)).toBe(semArroz)
  })
})

describe('D-1114: a opção do item', () => {
  it('CA-2120: entra no item, até 2, e não entra no total do dia', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    const um = adicionarOpcaoAoItem(plano, refeicaoId, arroz.id, BATATA)
    const dois = adicionarOpcaoAoItem(um, refeicaoId, arroz.id, POLENTA)
    expect(principal(dois, refeicaoId)[0]?.opcoesDoItem).toEqual([BATATA, POLENTA])
    expect(totaisDoPlano(dois, buscarAlimento).nutrientes.energia_kcal.total).toBe(kcal)
    // CB-1106: a terceira, a repetida e a do próprio alimento não entram.
    expect(adicionarOpcaoAoItem(dois, refeicaoId, arroz.id, CARA)).toBe(dois)
    expect(adicionarOpcaoAoItem(um, refeicaoId, arroz.id, BATATA)).toBe(um)
    expect(adicionarOpcaoAoItem(plano, refeicaoId, arroz.id, { alimentoId: 3, gramas: 100 })).toBe(plano)
  })

  it('CA-2120: "Tirar" remove a opção; sem nenhuma, o campo sai', () => {
    const { plano, refeicaoId, arroz } = almocoComArrozEFeijao()
    const dois = adicionarOpcaoAoItem(adicionarOpcaoAoItem(plano, refeicaoId, arroz.id, BATATA), refeicaoId, arroz.id, POLENTA)
    const um = tirarOpcaoDoItem(dois, refeicaoId, arroz.id, 0)
    expect(principal(um, refeicaoId)[0]?.opcoesDoItem).toEqual([POLENTA])
    const nenhum = tirarOpcaoDoItem(um, refeicaoId, arroz.id, 0)
    expect(principal(nenhum, refeicaoId)[0]).toEqual(arroz)
  })
})

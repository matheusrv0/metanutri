// Spec busca-substitutos, D-1114, CB-1101 e CB-1106: as opções do item, lidas com segurança.
import { lerOpcoesDoItem, MAXIMO_DE_OPCOES_DO_ITEM, vagaParaOpcao } from './opcoesDoItem.ts'
import type { ItemPlano } from './tipos.ts'

const ARROZ: ItemPlano = { id: 'i1', alimentoId: 3, gramas: 150 }
const BATATA = { alimentoId: 91, gramas: 350, medida: { nome: 'unidade', quantidade: 2.5, gramasPorMedida: 140 } }
const POLENTA = { alimentoId: 62, gramas: 180, medida: null }

describe('D-1114: as opções do item', () => {
  it('CB-1103: o item de antes, sem o campo, não tem opção', () => {
    expect(lerOpcoesDoItem(ARROZ)).toEqual([])
  })

  it('a opção guardada volta como foi', () => {
    expect(lerOpcoesDoItem({ ...ARROZ, opcoesDoItem: [BATATA, POLENTA] })).toEqual([BATATA, POLENTA])
  })

  it('CB-1101: o campo estragado fica de fora, sem quebrar; no máximo 2', () => {
    const estragado = {
      ...ARROZ,
      opcoesDoItem: [null, 'x', { alimentoId: 'a', gramas: 1 }, { alimentoId: 91, gramas: -3 }, { alimentoId: 91, gramas: Number.NaN }, BATATA, { alimentoId: 62, gramas: 180, medida: { nome: '' } }, POLENTA],
    } as unknown as ItemPlano
    // A medida estragada vira a automática (CB-363), e a terceira válida não entra.
    expect(lerOpcoesDoItem(estragado)).toEqual([BATATA, { alimentoId: 62, gramas: 180 }])
    expect(lerOpcoesDoItem({ ...ARROZ, opcoesDoItem: 'lixo' } as unknown as ItemPlano)).toEqual([])
    expect(MAXIMO_DE_OPCOES_DO_ITEM).toBe(2)
  })

  it('CB-1101: o mesmo alimento repetido entra uma vez', () => {
    expect(lerOpcoesDoItem({ ...ARROZ, opcoesDoItem: [BATATA, BATATA] })).toEqual([BATATA])
  })
})

describe('CB-1106: a vaga para mais uma opção', () => {
  it('vaga, já é opção, já tem 2 e o próprio alimento do item', () => {
    expect(vagaParaOpcao(ARROZ, 91)).toBe('livre')
    expect(vagaParaOpcao({ ...ARROZ, opcoesDoItem: [BATATA] }, 91)).toBe('ja-e-opcao')
    expect(vagaParaOpcao({ ...ARROZ, opcoesDoItem: [BATATA, POLENTA] }, 1)).toBe('cheia')
    expect(vagaParaOpcao(ARROZ, 3)).toBe('e-o-item')
  })
})

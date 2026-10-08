import type { Armazenamento } from './persistencia.ts'
import { criarRepositorioProdutos, idsDeProdutoEm } from './produtos.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const rotulo = { marca: '', porcaoG: 100, medidaCaseira: '', porPorcao: {} }

describe('id de produto (spec dados-na-nuvem, DP-21)', () => {
  it('os ids de produto citados nas marcas e lápides', () => {
    expect(idsDeProdutoEm(['produtos/900003', 'pacientes/ana', 'produtos/x', 'chave/metanutri:produtos', 'produtos/900010'])).toEqual([900003, 900010])
  })

  it('o produto novo nunca reaproveita um id excluído (com lápide) nem marcado', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:produtos', JSON.stringify([{ id: 900000, nome: 'Iogurte', codigoBarras: '', criadoEm: '2026-10-08', ...rotulo }]))
    arm.setItem('metanutri:mudancas', JSON.stringify({ alterados: { 'produtos/900000': '2026-10-08' }, excluidos: { 'produtos/900005': '2026-10-08' } }))
    expect(criarRepositorioProdutos(arm).salvar({ nome: 'Granola', ...rotulo }).id).toBe(900006)
  })

  it('sem marcas, o próximo id é o de sempre', () => {
    const arm = new Memoria()
    expect(criarRepositorioProdutos(arm).salvar({ nome: 'Granola', ...rotulo }).id).toBe(900000)
  })
})

import { CHAVE_DONO } from '@/domain/donoDosDados.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { armazenamentoDaSessao, trocarDadosEmMemoria } from './armazenamentoDaSessao.ts'
import { lerOcultosGlobais, ocultarGlobalmente } from './ocultosGlobais.ts'

const produto = (id: number, nome: string) => ({ id, codigoBarras: '', nome, marca: '', porcaoG: 100, medidaCaseira: '', porPorcao: {}, criadoEm: '2026-10-07' })

describe('armazenamento da sessão (spec dados-por-conta)', () => {
  beforeEach(() => localStorage.clear())
  afterAll(() => trocarDadosEmMemoria(null))

  it('DP-3: sem sessão (ou sem servidor), os dados ficam no aparelho, sem prefixo, como hoje', () => {
    localStorage.setItem('metanutri:casos', '["x"]')
    const { armazenamento: arm, migracao } = armazenamentoDaSessao(localStorage, null)
    expect(arm).toBe(localStorage)
    expect(arm?.getItem('metanutri:casos')).toBe('["x"]')
    expect(migracao).toBe('nada')
  })

  it('com sessão, leva os dados antigos para a conta e devolve o espaço dela', () => {
    localStorage.setItem('metanutri:casos', '["x"]')
    const { armazenamento: arm, migracao } = armazenamentoDaSessao(localStorage, 'conta-a')
    expect(migracao).toBe('movido')
    expect(arm?.getItem('metanutri:casos')).toBe('["x"]')
    expect(localStorage.getItem('metanutri:casos')).toBeNull()
    expect(localStorage.getItem('metanutri:conta:conta-a:casos')).toBe('["x"]')
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-a')
  })

  it('CB-121: navegador que não deixa guardar nada: sem armazenamento e sem erro', () => {
    expect(armazenamentoDaSessao(null, 'conta-a')).toEqual({ armazenamento: null, migracao: 'nada' })
    expect(armazenamentoDaSessao(null, null)).toEqual({ armazenamento: null, migracao: 'nada' })
    expect(() => trocarDadosEmMemoria(null)).not.toThrow()
  })

  it('DP-7: os produtos da busca trocam junto com a conta', () => {
    localStorage.setItem('metanutri:conta:conta-a:produtos', JSON.stringify([produto(900_001, 'Iogurte da Ana')]))
    localStorage.setItem('metanutri:conta:conta-b:produtos', JSON.stringify([produto(900_002, 'Barra da Bia')]))
    const descricoes = () => alimentosComProdutos().filter((a) => a.categoria === 'Meus produtos').map((a) => a.descricao)

    trocarDadosEmMemoria(armazenamentoDaSessao(localStorage, 'conta-a').armazenamento)
    expect(descricoes()).toEqual(['Iogurte da Ana'])
    trocarDadosEmMemoria(armazenamentoDaSessao(localStorage, 'conta-b').armazenamento)
    expect(descricoes()).toEqual(['Barra da Bia'])
    expect(buscarAlimento(900_001)).toBeUndefined()
    trocarDadosEmMemoria(armazenamentoDaSessao(localStorage, null).armazenamento)
    expect(descricoes()).toEqual([])
  })

  it('DP-7: as sugestões ocultas guardadas só na memória não passam para a outra conta', () => {
    // Sem armazenamento, os ocultos ficam só na memória desta aba.
    ocultarGlobalmente(null, 42)
    expect(lerOcultosGlobais(null).has(42)).toBe(true)
    trocarDadosEmMemoria(null)
    expect(lerOcultosGlobais(null).has(42)).toBe(false)
  })
})

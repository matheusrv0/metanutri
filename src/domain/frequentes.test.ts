import { criarRepositorioFrequentes } from './frequentes.ts'
import type { Armazenamento } from './persistencia.ts'

class MemoriaFalsa implements Armazenamento {
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

const relogio = () => {
  let t = Date.UTC(2026, 8, 15, 12, 0, 0)
  return () => new Date((t += 1000)).toISOString()
}

const criar = (armazenamento: Armazenamento | null = new MemoriaFalsa()) => criarRepositorioFrequentes(armazenamento, { agora: relogio() })

describe('Alimentos usados com frequência', () => {
  it('começa vazio', () => {
    expect(criar().maisUsados()).toEqual([])
  })

  it('guarda a última quantidade usada, para repetir a porção de sempre', () => {
    const repo = criar()
    repo.registrar(1, 100)
    repo.registrar(1, 150)
    expect(repo.maisUsados()).toEqual([{ alimentoId: 1, gramas: 150 }])
  })

  it('ordena do mais usado para o menos usado', () => {
    const repo = criar()
    repo.registrar(1, 100)
    repo.registrar(2, 100)
    repo.registrar(2, 100)
    repo.registrar(3, 100)
    repo.registrar(3, 100)
    repo.registrar(3, 100)
    expect(repo.maisUsados().map((f) => f.alimentoId)).toEqual([3, 2, 1])
  })

  it('empate no número de usos vai para o mais recente', () => {
    const repo = criar()
    repo.registrar(10, 100)
    repo.registrar(20, 100)
    expect(repo.maisUsados().map((f) => f.alimentoId)).toEqual([20, 10])
  })

  it('respeita o limite pedido', () => {
    const repo = criar()
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) repo.registrar(id, 100)
    expect(repo.maisUsados(3)).toHaveLength(3)
  })

  it('esquecer tira o alimento da lista', () => {
    const repo = criar()
    repo.registrar(7, 100)
    repo.esquecer(7)
    expect(repo.maisUsados()).toEqual([])
  })

  it('sobrevive ao recarregar a página', () => {
    const memoria = new MemoriaFalsa()
    const primeiro = criarRepositorioFrequentes(memoria, { agora: relogio() })
    primeiro.registrar(42, 150)
    primeiro.registrar(42, 180)
    const segundo = criarRepositorioFrequentes(memoria, { agora: relogio() })
    expect(segundo.maisUsados()).toEqual([{ alimentoId: 42, gramas: 180 }])
  })

  it('conteúdo estragado no armazenamento não derruba a lista', () => {
    const memoria = new MemoriaFalsa()
    memoria.setItem('metanutri:frequentes', '{"abc": 1, "5": {"vezes": 2, "ultimoUso": "2026-01-01", "gramas": 90}}')
    expect(criarRepositorioFrequentes(memoria).maisUsados()).toEqual([{ alimentoId: 5, gramas: 90 }])
  })

  it('sem armazenamento continua funcionando só nesta sessão', () => {
    const repo = criar(null)
    repo.registrar(9, 120)
    expect(repo.persistente).toBe(false)
    expect(repo.maisUsados()).toEqual([{ alimentoId: 9, gramas: 120 }])
  })
})

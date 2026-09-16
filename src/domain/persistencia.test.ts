import { criarRepositorio, type Armazenamento } from './persistencia.ts'
import { adicionarItem } from './plano.ts'

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

class Bloqueado implements Armazenamento {
  getItem(): string | null {
    throw new Error('SecurityError')
  }
  setItem(): void {
    throw new Error('SecurityError')
  }
  removeItem(): void {
    throw new Error('SecurityError')
  }
}

class Cheio extends MemoriaFalsa {
  cheio = false
  override setItem(k: string, v: string) {
    if (this.cheio) throw new DOMException('quota', 'QuotaExceededError')
    super.setItem(k, v)
  }
}

const relogio = () => {
  let t = Date.UTC(2026, 8, 15, 12, 0, 0)
  return () => new Date((t += 1000)).toISOString()
}
const ids = () => {
  let n = 0
  return () => `id${++n}`
}

describe('repositório de casos', () => {
  it('CA-49: o que foi salvo continua lá ao reabrir (novo repositório no mesmo armazenamento)', () => {
    const memoria = new MemoriaFalsa()
    const repo = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const criado = repo.criar('Maria, 28 anos')
    const plano = adicionarItem(criado.plano, criado.plano.refeicoes[2]?.id ?? '', 'principal', { alimentoId: 3, gramas: 150 }, () => 'item1')
    repo.salvar({ ...criado, plano, caso: { ...criado.caso, pesoKg: 68 } })

    const reaberto = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const lido = reaberto.obter(criado.caso.id)
    expect(lido?.caso.nome).toBe('Maria, 28 anos')
    expect(lido?.caso.pesoKg).toBe(68)
    expect(lido?.plano.refeicoes[2]?.opcoes.principal).toEqual([{ id: 'item1', alimentoId: 3, gramas: 150 }])
    expect(reaberto.listar().map((c) => c.nome)).toEqual(['Maria, 28 anos'])
  })

  it('CA-50: cria caso já com o plano padrão de 6 refeições', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    const c = repo.criar('Caso 1')
    expect(c.plano.refeicoes).toHaveLength(6)
    expect(c.versao).toBe(1)
    expect(c.caso.condicao).toEqual({ tipo: 'nenhuma' })
  })

  it('CA-50: lista do mais recente para o mais antigo', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    const a = repo.criar('A')
    repo.criar('B')
    repo.salvar(a)
    expect(repo.listar().map((c) => c.nome)).toEqual(['A', 'B'])
  })

  it('CA-50: duplica com novo id e "(cópia)" no nome, sem alterar o original', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    const copia = repo.duplicar(a.caso.id)
    expect(copia.caso.id).not.toBe(a.caso.id)
    expect(copia.caso.nome).toBe('Maria (cópia)')
    expect(copia.plano).toEqual(a.plano)
    expect(repo.listar()).toHaveLength(2)
    expect(repo.duplicar(repo.criar('  ').caso.id).caso.nome).toBe('Plano sem nome (cópia)')
  })

  it('CB-08: caso excluído em outra aba some da lista desta aba', () => {
    const memoria = new MemoriaFalsa()
    const aba1 = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const aba2 = criarRepositorio(memoria, { agora: relogio(), gerarId: () => `outro-${Math.random()}` })
    const a = aba1.criar('Maria')
    aba1.criar('João')
    expect(aba2.listar()).toHaveLength(2)

    aba1.excluir(a.caso.id)
    expect(aba2.listar().map((c) => c.nome)).toEqual(['João'])
    expect(aba2.obter(a.caso.id)).toBeNull()
  })

  it('CA-50: renomeia', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    repo.renomear(a.caso.id, 'Maria Souza')
    expect(repo.obter(a.caso.id)?.caso.nome).toBe('Maria Souza')
  })

  it('CA-50: exclui (a confirmação é da interface)', () => {
    const memoria = new MemoriaFalsa()
    const repo = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    repo.excluir(a.caso.id)
    expect(repo.obter(a.caso.id)).toBeNull()
    expect(repo.listar()).toEqual([])
    expect([...memoria.dados.keys()].some((k) => k.includes(a.caso.id))).toBe(false)
  })

  it('cada salvamento incrementa a versão', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    const s1 = repo.salvar(a)
    const s2 = repo.salvar(s1)
    expect([a.versao, s1.versao, s2.versao]).toEqual([1, 2, 3])
  })

  it('CB-08: a última alteração salva prevalece e a outra aba sabe que ficou desatualizada', () => {
    const memoria = new MemoriaFalsa()
    const aba1 = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const aba2 = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const caso = aba1.criar('Maria')
    const naAba2 = aba2.obter(caso.caso.id)
    if (!naAba2) throw new Error('aba 2 não leu o caso')

    const salvoNaAba1 = aba1.salvar({ ...caso, caso: { ...caso.caso, pesoKg: 70 } })
    expect(aba2.foiAlteradoEmOutroLugar(naAba2)).toBe(true)
    expect(aba1.foiAlteradoEmOutroLugar(salvoNaAba1)).toBe(false)

    aba2.salvar({ ...naAba2, caso: { ...naAba2.caso, pesoKg: 72 } })
    expect(aba1.obter(caso.caso.id)?.caso.pesoKg).toBe(72)
  })

  it('CB-09: armazenamento bloqueado funciona só na sessão e avisa', () => {
    const repo = criarRepositorio(new Bloqueado(), { agora: relogio(), gerarId: ids() })
    expect(repo.persistente).toBe(false)
    expect(repo.aviso).toMatch(/não serão salvos/)
    const a = repo.criar('Maria')
    expect(repo.obter(a.caso.id)?.caso.nome).toBe('Maria')
  })

  it('CB-09: armazenamento sem suporte (null) funciona só na sessão', () => {
    const repo = criarRepositorio(null, { agora: relogio(), gerarId: ids() })
    expect(repo.persistente).toBe(false)
  })

  it('CB-09: armazenamento cheio passa a funcionar na sessão e avisa, sem perder o que está aberto', () => {
    const cheio = new Cheio()
    const repo = criarRepositorio(cheio, { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    cheio.cheio = true
    const salvo = repo.salvar({ ...a, caso: { ...a.caso, pesoKg: 80 } })
    expect(salvo.caso.pesoKg).toBe(80)
    expect(repo.persistente).toBe(false)
    expect(repo.aviso).toMatch(/cheio/)
    expect(repo.obter(a.caso.id)?.caso.pesoKg).toBe(80)
  })

  it('ignora registro corrompido em vez de quebrar a lista', () => {
    const memoria = new MemoriaFalsa()
    const repo = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    const a = repo.criar('Maria')
    memoria.setItem(`metanutri:caso:${a.caso.id}`, '{isto não é json')
    const reaberto = criarRepositorio(memoria, { agora: relogio(), gerarId: ids() })
    expect(reaberto.listar()).toEqual([])
    expect(reaberto.obter(a.caso.id)).toBeNull()
  })

  it('operar em caso inexistente é erro', () => {
    const repo = criarRepositorio(new MemoriaFalsa(), { agora: relogio(), gerarId: ids() })
    expect(() => repo.duplicar('x')).toThrow(/x/)
    expect(() => repo.renomear('x', 'y')).toThrow(/x/)
  })
})

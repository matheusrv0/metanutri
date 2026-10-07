import { criarAcompanhamento, marcarMissao, type Acompanhamento } from './acompanhamento.ts'
import type { Missao } from './missoes.ts'
import type { Armazenamento } from './persistencia.ts'
import { criarRepositorioAcompanhamentos, fonteLocal } from './repositorioAcompanhamentos.ts'

const MISSOES: readonly Missao[] = [{ id: 'agua', texto: 'Beber água', origem: 'Hábito' }]

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

function cheio(): Armazenamento {
  return {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('cheio', 'QuotaExceededError')
    },
    removeItem: () => undefined,
  }
}

let contador = 0
function novo(casoId = 'caso-1', nome = 'Ana'): Acompanhamento {
  contador += 1
  const n = contador
  return criarAcompanhamento(
    { casoId, pacienteId: null, nome, missoes: MISSOES },
    { agora: () => `2026-09-${String(10 + n).padStart(2, '0')}T10:00:00.000Z`, gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
}

describe('Repositório de acompanhamentos', () => {
  it('salva e lê pelo id', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo())
    expect(repo.porId(a.id)?.nome).toBe('Ana')
  })

  it('acha pelo token, que é o que o link do paciente usa', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo())
    expect(repo.porToken(a.token)?.id).toBe(a.id)
  })

  it('token que não existe devolve nulo em vez de estourar', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(novo())
    expect(repo.porToken('tokeninventado')).toBeNull()
    expect(repo.porToken('')).toBeNull()
  })

  it('acha o acompanhamento de um plano', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(novo('caso-9', 'Bia'))
    expect(repo.porCaso('caso-9')?.nome).toBe('Bia')
    expect(repo.porCaso('caso-inexistente')).toBeNull()
  })

  it('salvar de novo atualiza em vez de duplicar', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo())
    repo.salvar(marcarMissao(a, '2026-09-21', 'agua', true))
    expect(repo.listar()).toHaveLength(1)
    expect(repo.porId(a.id)?.marcacoes).toHaveLength(1)
  })

  it('lista do mais novo para o mais antigo', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const primeiro = repo.salvar(novo('caso-a'))
    const segundo = repo.salvar(novo('caso-b'))
    expect(repo.listar().map((a) => a.id)).toEqual([segundo.id, primeiro.id])
  })

  it('remove', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo())
    repo.remover(a.id)
    expect(repo.listar()).toEqual([])
  })

  it('sobrevive a outra aba: lê o que já estava gravado', () => {
    const armazenamento = memoria()
    const a = criarRepositorioAcompanhamentos(armazenamento).salvar(novo())
    const outra = criarRepositorioAcompanhamentos(armazenamento)
    expect(outra.porToken(a.token)?.id).toBe(a.id)
  })

  it('lixo no armazenamento não derruba a tela', () => {
    const armazenamento = memoria()
    armazenamento.setItem('metanutri:acompanhamentos', '{isso não é json')
    expect(criarRepositorioAcompanhamentos(armazenamento).listar()).toEqual([])
  })

  it('registro sem os campos obrigatórios é descartado', () => {
    const armazenamento = memoria()
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'x' }] }))
    expect(criarRepositorioAcompanhamentos(armazenamento).listar()).toEqual([])
  })

  it('formato de versão desconhecida é ignorado em vez de lido errado', () => {
    const armazenamento = memoria()
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 99, itens: [novo()] }))
    expect(criarRepositorioAcompanhamentos(armazenamento).listar()).toEqual([])
  })

  it('sem armazenamento, funciona em memória e avisa', () => {
    const repo = criarRepositorioAcompanhamentos(null)
    const a = repo.salvar(novo())
    expect(repo.porId(a.id)?.nome).toBe('Ana')
    expect(repo.aviso).toContain('não sobrevivem ao fechar')
  })

  it('armazenamento cheio: a tela continua funcionando e o aviso aparece', () => {
    const repo = criarRepositorioAcompanhamentos(cheio())
    const a = repo.salvar(novo())
    expect(repo.porId(a.id)?.nome).toBe('Ana')
    expect(repo.aviso).toContain('não sobrevivem ao fechar')
  })
})

describe('CB-107: o aparelho lembra quais links já estiveram na nuvem', () => {
  it('o link marcado continua marcado depois de fechar e abrir', () => {
    const armazenamento = memoria()
    const a = criarRepositorioAcompanhamentos(armazenamento).salvar(novo(), { naNuvem: true })
    expect(criarRepositorioAcompanhamentos(armazenamento).estaNaNuvem(a.id)).toBe(true)
  })

  it('link novo, criado só aqui, não está marcado', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo())
    expect(repo.estaNaNuvem(a.id)).toBe(false)
  })

  it('gravar de novo sem dizer nada não apaga a marca', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo(), { naNuvem: true })
    repo.salvar(marcarMissao(a, '2026-09-21', 'agua', true))
    expect(repo.estaNaNuvem(a.id)).toBe(true)
  })

  it('remover leva a marca junto: o mesmo id, se voltar, começa sem ela', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo(), { naNuvem: true })
    repo.remover(a.id)
    repo.salvar(a)
    expect(repo.estaNaNuvem(a.id)).toBe(false)
  })

  it('dado antigo, sem a marca, conta como nunca esteve na nuvem', () => {
    const armazenamento = memoria()
    const a = novo()
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [a] }))
    const repo = criarRepositorioAcompanhamentos(armazenamento)
    expect(repo.porId(a.id)?.id).toBe(a.id)
    expect(repo.estaNaNuvem(a.id)).toBe(false)
  })

  it('a marca não entra no acompanhamento que as telas recebem', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = novo()
    repo.salvar(a, { naNuvem: true })
    expect(repo.listar()).toEqual([a])
  })

  it('sem armazenamento, a marca vale enquanto a página estiver aberta', () => {
    const repo = criarRepositorioAcompanhamentos(null)
    const a = repo.salvar(novo(), { naNuvem: true })
    expect(repo.estaNaNuvem(a.id)).toBe(true)
  })
})

describe('Fonte local, a costura do servidor', () => {
  it('responde o que está neste navegador e avisa que não é nuvem', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fonte = fonteLocal(repo)
    const a = await fonte.salvar(novo())
    expect(fonte.naNuvem).toBe(false)
    expect((await fonte.porToken(a.token))?.id).toBe(a.id)
    expect(await fonte.porToken('outro')).toBeNull()
  })
})

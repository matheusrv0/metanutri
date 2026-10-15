import { criarAcompanhamento, marcarMissao, type Acompanhamento } from './acompanhamento.ts'
import { CHAVE_MUDANCAS, lerMudancas, registrarMudanca } from './copiaDaConta.ts'
import type { DietaDoLink } from './dietaDoLink.ts'
import type { Missao } from './missoes.ts'
import type { Armazenamento } from './persistencia.ts'
import { criarRepositorioAcompanhamentos, fonteLocal, mesmoLink } from './repositorioAcompanhamentos.ts'

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

describe('CB-108: o aparelho lembra a mudança que não chegou à nuvem', () => {
  it('a marca de pendente continua depois de fechar e abrir', () => {
    const armazenamento = memoria()
    const a = criarRepositorioAcompanhamentos(armazenamento).salvar(novo(), { pendente: true })
    expect(criarRepositorioAcompanhamentos(armazenamento).estaPendente(a.id)).toBe(true)
  })

  it('gravar de novo sem dizer nada não tira a marca; dizer que não está pendente tira', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo(), { pendente: true })
    repo.salvar(marcarMissao(a, '2026-09-21', 'agua', true))
    expect(repo.estaPendente(a.id)).toBe(true)
    repo.salvar(a, { pendente: false, naNuvem: true })
    expect(repo.estaPendente(a.id)).toBe(false)
    expect(repo.estaNaNuvem(a.id)).toBe(true)
  })

  it('remover leva a marca junto', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const a = repo.salvar(novo(), { pendente: true })
    repo.remover(a.id)
    repo.salvar(a)
    expect(repo.estaPendente(a.id)).toBe(false)
  })

  it('dado antigo, sem a marca, não tem nada pendente', () => {
    const armazenamento = memoria()
    const a = novo()
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [a] }))
    expect(criarRepositorioAcompanhamentos(armazenamento).estaPendente(a.id)).toBe(false)
  })
})

describe('A dieta do link no aparelho (spec dieta-no-link)', () => {
  const DIETA: DietaDoLink = {
    refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 80, alimento: 'Macarrão' }]] }],
    orientacoes: 'Beber água.',
    receitas: '',
    copiadaEm: '2026-10-14',
  }

  it('guarda e lê a cópia da dieta junto com o link', () => {
    const armazenamento = memoria()
    const a = criarRepositorioAcompanhamentos(armazenamento).salvar({ ...novo(), dieta: DIETA })
    expect(criarRepositorioAcompanhamentos(armazenamento).porId(a.id)?.dieta).toEqual(DIETA)
  })

  it('CB-150: link guardado antes desta versão, sem o campo, lê como link sem dieta', () => {
    const armazenamento = memoria()
    const a = novo()
    const antigo: Record<string, unknown> = { ...a }
    delete antigo['dieta']
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [antigo] }))
    const lido = criarRepositorioAcompanhamentos(armazenamento).porToken(a.token)
    expect(lido?.id).toBe(a.id)
    expect(lido?.dieta).toBeNull()
  })

  it('CB-153: dieta estragada no aparelho conta como sem dieta, e o link continua', () => {
    const armazenamento = memoria()
    const a = novo()
    armazenamento.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ ...a, dieta: 'lixo' }] }))
    expect(criarRepositorioAcompanhamentos(armazenamento).porId(a.id)?.dieta).toBeNull()
  })
})

describe('CA-601 (spec dados-na-nuvem): o link igual ao da nuvem não é regravado', () => {
  it('mesmoLink compara o que importa: a ordem dos campos e a dieta ausente não contam', () => {
    const a = novo('caso-1', 'Ana')
    const semDieta: Record<string, unknown> = { ...a }
    delete semDieta['dieta']
    const lido = criarRepositorioAcompanhamentos(memoria())
    lido.salvar(semDieta as unknown as Acompanhamento)
    const daqui = lido.porId(a.id)
    if (!daqui) throw new Error('link sumiu')
    const naOrdemDaLinha: Acompanhamento = {
      dieta: null,
      usoNaoComercial: a.usoNaoComercial,
      marcacoes: a.marcacoes,
      missoes: a.missoes.map((m) => ({ origem: m.origem, texto: m.texto, id: m.id })),
      criadoEm: a.criadoEm,
      nome: a.nome,
      pacienteId: a.pacienteId,
      casoId: a.casoId,
      token: a.token,
      id: a.id,
    }
    expect(mesmoLink(daqui, naOrdemDaLinha)).toBe(true)
    expect(mesmoLink(daqui, { ...naOrdemDaLinha, marcacoes: [{ dia: '2026-10-15', feitas: ['agua'] }] })).toBe(false)
    expect(mesmoLink(daqui, { ...naOrdemDaLinha, token: 'outrotoken' })).toBe(false)
  })

  it('marcar muda só as marcas, sem regravar o link', () => {
    const base = memoria()
    const a = novo('caso-1', 'Ana')
    const antigo: Record<string, unknown> = { ...a }
    delete antigo['dieta']
    base.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [antigo], naNuvem: [], pendentes: [a.id] }))
    const repo = criarRepositorioAcompanhamentos(base)
    repo.marcar(a.id, { naNuvem: true, pendente: false })
    expect(JSON.parse(base.getItem('metanutri:acompanhamentos') ?? '{}')).toEqual({ formato: 1, itens: [antigo], naNuvem: [a.id], pendentes: [] })
    expect(repo.estaNaNuvem(a.id)).toBe(true)
    // Link que não existe: nada muda.
    repo.marcar('outro', { naNuvem: true })
    expect(repo.estaNaNuvem('outro')).toBe(false)
  })
})

describe('D-171: salvar um link não mexe nos outros (spec dados-na-nuvem)', () => {
  it('CA-595: marcar e apagar um link só marca ele; o link de antes da dieta fica como estava guardado', () => {
    const base = memoria()
    const observado: Armazenamento = {
      getItem: (c) => base.getItem(c),
      setItem: (c, v) => {
        const antes = base.getItem(c)
        base.setItem(c, v)
        registrarMudanca(base, c, antes, v, '2026-10-15T12:00:00.000Z')
      },
      removeItem: (c) => base.removeItem(c),
    }
    const antigo: Record<string, unknown> = { ...novo('caso-1', 'Ana') }
    delete antigo['dieta']
    const outro = novo('caso-2', 'Bia')
    base.setItem('metanutri:acompanhamentos', JSON.stringify({ formato: 1, itens: [antigo, outro], naNuvem: [], pendentes: [] }))
    const repo = criarRepositorioAcompanhamentos(observado)

    repo.salvar(marcarMissao(outro, '2026-10-15', 'agua', true))
    expect(Object.keys(lerMudancas(base.getItem(CHAVE_MUDANCAS)).alterados)).toEqual([`acompanhamentos/${outro.id}`])
    repo.remover(outro.id)
    expect(lerMudancas(base.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: {}, excluidos: { [`acompanhamentos/${outro.id}`]: '2026-10-15T12:00:00.000Z' } })
    const guardado = JSON.parse(base.getItem('metanutri:acompanhamentos') ?? '{}') as { itens: unknown[] }
    expect(guardado.itens).toEqual([antigo])
    // A tela continua lendo o link antigo como link sem dieta (CB-150).
    expect(repo.porId(String(antigo['id']))?.dieta).toBeNull()
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

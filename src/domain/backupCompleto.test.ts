// Regressão: o backup salvava só o índice dos planos, e restaurar em outro
// aparelho dava zero planos. O "apagar tudo" tinha o espelho do mesmo defeito:
// deixava os planos, com nome e medida de paciente, no navegador.
import { CHAVES_DE_DADOS, expandirChaves, montarBackup, restaurarBackup } from './perfil.ts'
import { criarRepositorio, type Armazenamento } from './persistencia.ts'

function memoria(): Armazenamento {
  const d = new Map<string, string>()
  return { getItem: (c) => d.get(c) ?? null, setItem: (c, v) => void d.set(c, v), removeItem: (c) => void d.delete(c) }
}

function comDoisPlanos() {
  const guardado = memoria()
  let n = 0
  const repo = criarRepositorio(guardado, { gerarId: () => `id${++n}` })
  const primeiro = repo.criar('Ana Souza')
  const segundo = repo.criar('Bia Lima')
  return { guardado, repo, primeiro, segundo }
}

describe('Backup leva os planos junto', () => {
  it('o arquivo inclui cada plano, não só a lista de ids', () => {
    const { guardado, primeiro } = comDoisPlanos()
    const backup = montarBackup(guardado, [...CHAVES_DE_DADOS], '2026-09-27T00:00:00.000Z')

    expect(Object.keys(backup.dados)).toContain('metanutri:casos')
    expect(Object.keys(backup.dados)).toContain(`metanutri:caso:${primeiro.caso.id}`)
  })

  it('restaurar em outro aparelho traz os planos abertos, não uma lista vazia', () => {
    const { guardado, primeiro } = comDoisPlanos()
    const backup = montarBackup(guardado, [...CHAVES_DE_DADOS], '2026-09-27T00:00:00.000Z')

    const destino = memoria()
    restaurarBackup(destino, JSON.stringify(backup))
    const noAparelhoNovo = criarRepositorio(destino)

    expect(noAparelhoNovo.listar()).toHaveLength(2)
    expect(noAparelhoNovo.obter(primeiro.caso.id)?.caso.nome).toBe('Ana Souza')
  })

  it('backup antigo, sem os planos, ainda restaura o que tem em vez de estourar', () => {
    const destino = memoria()
    const antigo = { formato: 1, geradoEm: '2026-09-01T00:00:00.000Z', dados: { 'metanutri:casos': '["sumido"]' } }
    const { erro } = restaurarBackup(destino, JSON.stringify(antigo))

    expect(erro).toBeNull()
    expect(criarRepositorio(destino).listar()).toEqual([])
  })
})

describe('Apagar tudo não deixa plano para trás', () => {
  it('as chaves expandidas alcançam cada plano', () => {
    const { guardado, primeiro, segundo } = comDoisPlanos()
    const chaves = expandirChaves(guardado, [...CHAVES_DE_DADOS])

    expect(chaves).toContain(`metanutri:caso:${primeiro.caso.id}`)
    expect(chaves).toContain(`metanutri:caso:${segundo.caso.id}`)
  })

  it('depois de apagar, não sobra dado de paciente no aparelho', () => {
    const { guardado } = comDoisPlanos()
    for (const chave of expandirChaves(guardado, [...CHAVES_DE_DADOS])) guardado.removeItem(chave)

    expect(criarRepositorio(guardado).listar()).toEqual([])
    expect(guardado.getItem('metanutri:casos')).toBeNull()
  })

  it('sem armazenamento, devolve as chaves originais sem quebrar', () => {
    expect(expandirChaves(null, ['metanutri:casos'])).toEqual(['metanutri:casos'])
  })

  it('índice corrompido não derruba o backup', () => {
    const guardado = memoria()
    guardado.setItem('metanutri:casos', 'isso não é json')
    expect(expandirChaves(guardado, ['metanutri:casos'])).toEqual(['metanutri:casos'])
  })
})

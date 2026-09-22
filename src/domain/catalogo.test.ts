import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo } from './catalogo.ts'
import { ALIMENTOS } from './tabelas.ts'

const porDescricao = (d: string) => {
  const a = ALIMENTOS.find((x) => x.descricao === d)
  if (!a) throw new Error(`"${d}" não existe na tabela.`)
  return a
}

describe('Catálogo de alimentos', () => {
  it('sem filtro, devolve a tabela inteira em ordem alfabética', () => {
    const todos = filtrarCatalogo()
    expect(todos).toHaveLength(ALIMENTOS.length)
    expect(todos[0]?.descricao.localeCompare(todos[1]?.descricao ?? '', 'pt-BR')).toBeLessThanOrEqual(0)
  })

  it('busca sem acento acha o alimento acentuado', () => {
    const achados = filtrarCatalogo({ termo: 'brocolis' })
    expect(achados.some((a) => a.descricao.includes('Brócolis'))).toBe(true)
  })

  it('duas palavras filtram por todas, não por uma', () => {
    const achados = filtrarCatalogo({ termo: 'arroz integral' })
    expect(achados.length).toBeGreaterThan(0)
    for (const a of achados) {
      expect(a.descricao.toLowerCase()).toContain('arroz')
      expect(a.descricao.toLowerCase()).toContain('integral')
    }
  })

  it('filtra por categoria', () => {
    const categoria = categoriasDoCatalogo()[0]
    expect(categoria).toBeDefined()
    const achados = filtrarCatalogo({ categoria: categoria?.nome ?? null })
    expect(achados).toHaveLength(categoria?.quantos ?? -1)
  })

  it('as categorias somam o total da tabela', () => {
    const soma = categoriasDoCatalogo().reduce((s, c) => s + c.quantos, 0)
    expect(soma).toBe(ALIMENTOS.length)
  })

  it('ordenar por energia põe alimento sem energia no fim, não no topo', () => {
    const lista = filtrarCatalogo({ ordem: 'energia' })
    const ultimo = lista[lista.length - 1]
    expect(ultimo?.nutrientes.energia_kcal).toBeNull()
    expect(lista[0]?.nutrientes.energia_kcal).not.toBeNull()
  })

  it('filtra pelo nível de completude', () => {
    const completos = filtrarCatalogo({ nivel: 'completo' })
    expect(completos.length).toBeGreaterThan(0)
    expect(completos.length).toBe(resumoDoCatalogo().completos)
  })

  it('termo que não existe devolve lista vazia, sem estourar', () => {
    expect(filtrarCatalogo({ termo: 'xyzabc' })).toEqual([])
  })

  it('a composição traz os 20 nutrientes, com unidade', () => {
    const linhas = composicaoDe(porDescricao('Arroz, tipo 1, cozido'))
    expect(linhas).toHaveLength(20)
    expect(linhas.every((l) => l.unidade !== '')).toBe(true)
    expect(linhas.find((l) => l.chave === 'energia_kcal')?.unidade).toBe('kcal')
  })

  it('alimento sem energia aparece com valor nulo, nunca zero', () => {
    const leite = composicaoDe(porDescricao('Leite, de vaca, integral'))
    expect(leite.find((l) => l.chave === 'energia_kcal')?.valor).toBeNull()
  })

  it('o resumo bate com a tabela em uso', () => {
    const r = resumoDoCatalogo()
    expect(r.total).toBe(ALIMENTOS.length)
    expect(r.completos).toBeGreaterThan(0)
    expect(r.completos).toBeLessThan(r.total)
  })
})

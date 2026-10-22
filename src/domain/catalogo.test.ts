import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo } from './catalogo.ts'
import { completudeDe } from './completude.ts'
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

  it('CA-794 (spec revisao-geral-trabalho): espaço no começo do nome não põe o alimento antes do "A"', () => {
    const nomes = filtrarCatalogo().map((a) => a.descricao.trim())
    expect(nomes[0]?.startsWith('A')).toBe(true)
    const ordenados = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    expect(nomes).toEqual(ordenados)
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

  it('CA-1153 (spec alimentos-e-gramaturas): com termo, a ordem é a da relevância da entrada rápida', () => {
    const lista = filtrarCatalogo({ termo: 'farinha de trigo' }).map((a) => a.descricao)
    expect(lista[0]).toBe('Farinha, de trigo')
    expect(lista.indexOf('Farinha, de trigo')).toBeLessThan(lista.findIndex((d) => d.startsWith('Cação')))
    expect(filtrarCatalogo({ termo: 'arroz' })[0]?.descricao).toBe('Arroz, tipo 1, cozido')
    // A ordem "Nome" continua alfabética.
    expect(filtrarCatalogo({ termo: 'arroz', ordem: 'nome' })[0]?.descricao).toBe('Arroz carreteiro')
  })

  it('termo que não existe devolve lista vazia, sem estourar', () => {
    expect(filtrarCatalogo({ termo: 'xyzabc' })).toEqual([])
  })

  it('a composição traz os 20 nutrientes da tabela brasileira, com unidade', () => {
    // O cuscuz não tem equivalente no USDA (spec vitaminas-usda): só as 20 linhas da TACO.
    const linhas = composicaoDe(porDescricao('Cuscuz, de milho, cozido com sal'))
    expect(linhas).toHaveLength(20)
    expect(linhas.every((l) => l.unidade !== '' && !l.usda)).toBe(true)
    expect(linhas.find((l) => l.chave === 'energia_kcal')?.unidade).toBe('kcal')
  })

  it('CA-959 (spec vitaminas-usda): com equivalente no USDA, as seis do complemento vêm depois, marcadas', () => {
    const linhas = composicaoDe(porDescricao('Salmão, sem pele, fresco, grelhado'))
    expect(linhas).toHaveLength(26)
    expect(linhas.slice(0, 20).every((l) => !l.usda)).toBe(true)
    expect(linhas.slice(20).map((l) => [l.chave, l.nome, l.unidade, l.usda])).toEqual([
      ['vitamina_d_mcg', 'vitamina D', 'µg', true],
      ['vitamina_e_mg', 'vitamina E', 'mg', true],
      ['folato_dfe_mcg', 'folato', 'µg', true],
      ['vitamina_b12_mcg', 'vitamina B12', 'µg', true],
      ['selenio_mcg', 'selênio', 'µg', true],
      ['gordura_trans_g', 'gordura trans', 'g', true],
    ])
    expect(linhas.find((l) => l.chave === 'vitamina_d_mcg')?.valor).toBe(13.1)
    // Nulo do equivalente continua nulo: "não analisado", nunca zero (CB-302).
    expect(linhas.find((l) => l.chave === 'gordura_trans_g')?.valor).toBeNull()
  })

  it('CA-962 e D-307: a completude continua contando os 20 da tabela brasileira', () => {
    const salmao = completudeDe(porDescricao('Salmão, sem pele, fresco, grelhado'))
    const cuscuz = completudeDe(porDescricao('Cuscuz, de milho, cozido com sal'))
    expect(salmao.total).toBe(20)
    expect(cuscuz.total).toBe(20)
    expect(cuscuz.faltando).not.toContain('vitamina_d_mcg')
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

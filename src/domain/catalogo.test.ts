import arquivoAmpliada from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo } from './catalogo.ts'
import { completudeDe } from './completude.ts'
import { ALIMENTOS, registrarBaseAmpliada } from './tabelas.ts'

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
    const coco = composicaoDe(porDescricao('Coco,  verde, cru'))
    expect(coco.find((l) => l.chave === 'energia_kcal')?.valor).toBeNull()
  })

  it('CA-1128 (spec alimentos-e-gramaturas, D-380): energia e macros do leite vêm do USDA, marcados', () => {
    const leite = composicaoDe(porDescricao('Leite, de vaca, integral'))
    expect(leite.find((l) => l.chave === 'energia_kcal')).toMatchObject({ valor: 61, usda: true })
    expect(leite.find((l) => l.chave === 'proteina_g')).toMatchObject({ valor: 3.15, usda: true })
    // O cálcio é da TACO e continua sem a marca.
    expect(leite.find((l) => l.chave === 'calcio_mg')).toMatchObject({ usda: false })
  })

  it('o resumo bate com a tabela em uso', () => {
    const r = resumoDoCatalogo()
    expect(r.total).toBe(ALIMENTOS.length)
    expect(r.completos).toBeGreaterThan(0)
    expect(r.completos).toBeLessThan(r.total)
  })
})

// Spec base-ampliada, CA-1718 e CA-1719 (domínio): a Tabela de alimentos conta a base ampliada e a ficha diz a origem.
describe('catálogo com a base ampliada (spec base-ampliada)', () => {
  const base = decodificarBaseAmpliada(arquivoAmpliada as unknown as ArquivoBaseAmpliada)
  afterEach(() => registrarBaseAmpliada([]))

  it('CA-1718: as categorias e o resumo contam a base ampliada registrada', () => {
    const antes = resumoDoCatalogo().total
    registrarBaseAmpliada(base)
    expect(resumoDoCatalogo().total).toBe(antes + base.length)
    const pescados = categoriasDoCatalogo().find((c) => c.nome === 'Pescados e frutos do mar')
    expect(pescados?.quantos).toBe(50 + base.filter((a) => a.categoria === 'Pescados e frutos do mar').length)
    expect(filtrarCatalogo({ termo: 'tilápia' }).map((a) => a.descricao)).toContain('Tilápia, filé, grelhada')
  })

  it('CA-1718: a ficha da tilápia tem os 20 da tabela e os 6 do complemento, sem a marca USDA linha a linha', () => {
    const tilapia = base.find((a) => a.descricao === 'Tilápia, filé, grelhada')
    expect(tilapia).toBeDefined()
    const linhas = tilapia ? composicaoDe(tilapia) : []
    expect(linhas).toHaveLength(26)
    expect(linhas.some((l) => l.usda || l.sr)).toBe(false)
    expect(linhas.find((l) => l.chave === 'vitamina_d_mcg')).toMatchObject({ valor: 3.7, unidade: 'µg' })
  })

  it('CA-1719: no Foundation completado, só os valores do SR levam a marca SR', () => {
    const crua = base.find((a) => a.descricao === 'Tilápia, filé, crua')
    const chaves = crua?.ampliada?.complemento?.chaves ?? []
    expect(chaves.length).toBeGreaterThan(0)
    const linhas = crua ? composicaoDe(crua) : []
    // A ficha não mostra açúcares nem saturada (vêm do rótulo): só as chaves da ficha contam.
    const naFicha = new Set(linhas.map((l) => l.chave))
    expect(linhas.filter((l) => l.sr).map((l) => l.chave).sort()).toEqual(chaves.filter((c) => naFicha.has(c)).sort())
    expect(linhas.some((l) => l.usda)).toBe(false)
  })
})

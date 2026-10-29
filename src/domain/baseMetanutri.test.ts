import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from './baseMetanutri.ts'

describe('PRODUCT.md acompanha a base (spec vitaminas-usda, CA-966a)', () => {
  // O Vitest roda na raiz do projeto.
  const produto = readFileSync(join(process.cwd(), 'PRODUCT.md'), 'utf8')

  it('diz 21 linhas no Cobrir, cinco delas do USDA, e não diz mais que vitamina D, B12 e folato só vêm de rótulo', () => {
    expect(produto).toContain('20 vitaminas e minerais, mais a fibra')
    expect(produto).toMatch(/vitamina D, vitamina E, folato, vitamina B12 e selênio[^.]*USDA FoodData Central[^.]*308 dos 597/)
    expect(produto).not.toMatch(/15 vitaminas e minerais/)
    expect(produto).not.toMatch(/Vitamina D, B12, folato, açúcares e gordura saturada não existem na TACO/)
  })
})

describe('Base MetaNutri (D-51, CA-322)', () => {
  it('tem o nome da base', () => {
    expect(NOME_DA_BASE).toBe('Base MetaNutri')
  })

  it('conta alimentos, nutrientes, medidas caseiras, o complemento do USDA e a base ampliada (spec base-ampliada, CA-1721)', () => {
    expect(resumoDaBase()).toEqual({ alimentos: 597 + 638, daTabela: 597, nutrientes: 20, comMedidaCaseira: 283, comComplementoUsda: 308, daBaseAmpliada: 638 })
  })

  it('cita as cinco fontes, cada uma com link; o USDA vem ao lado da TACO', () => {
    expect(FONTES_DA_BASE.map((f) => f.assunto)).toEqual(['Composição dos alimentos', 'Vitaminas D, B12, folato, E e selênio', 'Alimentos que a TACO não tem', 'Medidas caseiras', 'Produtos de marca'])
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/NEPA.*UNICAMP/)
    expect(FONTES_DA_BASE[3]?.citacao).toMatch(/IBGE.*Pesquisa de Orçamentos Familiares 2008-2009/)
    expect(FONTES_DA_BASE[4]?.citacao).toMatch(/Open Food Facts.*ODbL/)
    for (const fonte of FONTES_DA_BASE) expect(fonte.url).toMatch(/^https:\/\//)
  })

  it('CA-963 (spec vitaminas-usda): a fonte do USDA tem a citação, os conjuntos com versão, a data, a licença e o link', () => {
    const usda = FONTES_DA_BASE[1]
    expect(usda?.citacao).toBe(
      'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov. Conjuntos SR Legacy (versão de abril de 2018) e Foundation Foods (versão de abril de 2026), baixados em 20/10/2026. Domínio público (CC0 1.0 Universal).',
    )
    expect(usda?.uso).toBe(
      'Para os 308 alimentos com equivalente no USDA, os cinco nutrientes que a TACO não traz vêm do alimento americano correspondente. A gordura trans vem junto, só como informação. Sem equivalente, o dado fica em branco, nunca zero.',
    )
    expect(usda?.url).toBe('https://fdc.nal.usda.gov/')
    expect(usda?.rotuloLink).toBe('Abrir o FoodData Central')
  })

  it('CA-1721 (spec base-ampliada): a base ampliada cita o USDA, os dois conjuntos com versão, a data, a licença e quantos alimentos', () => {
    const ampliada = FONTES_DA_BASE[2]
    expect(ampliada?.citacao).toBe(
      'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov. Conjuntos SR Legacy (versão de abril de 2018) e Foundation Foods (versão de outubro de 2026), baixados em 29/10/2026. Domínio público (CC0 1.0 Universal).',
    )
    expect(ampliada?.uso).toBe(
      '638 alimentos genéricos que a tabela brasileira não traz (peixes, carnes, laticínios, grãos, sementes, frutas, verduras e cogumelos), com nome em português e o grupo da tabela brasileira. Quando a TACO tem o alimento no mesmo preparo, vale a TACO. Nutriente que a fonte não publicou fica em branco, nunca zero.',
    )
    expect(ampliada?.url).toBe('https://fdc.nal.usda.gov/')
    expect(ampliada?.rotuloLink).toBe('Abrir o FoodData Central')
  })
})

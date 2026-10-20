import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from './baseMetanutri.ts'

describe('Base MetaNutri (D-51, CA-322)', () => {
  it('tem o nome da base', () => {
    expect(NOME_DA_BASE).toBe('Base MetaNutri')
  })

  it('conta alimentos, nutrientes, medidas caseiras e o complemento do USDA na base em uso', () => {
    expect(resumoDaBase()).toEqual({ alimentos: 597, nutrientes: 20, comMedidaCaseira: 287, comComplementoUsda: 308 })
  })

  it('cita as quatro fontes, cada uma com link; o USDA vem ao lado da TACO', () => {
    expect(FONTES_DA_BASE.map((f) => f.assunto)).toEqual(['Composição dos alimentos', 'Vitaminas D, B12, folato, E e selênio', 'Medidas caseiras', 'Produtos de rótulo'])
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/NEPA.*UNICAMP/)
    expect(FONTES_DA_BASE[2]?.citacao).toMatch(/IBGE.*Pesquisa de Orçamentos Familiares 2008-2009/)
    expect(FONTES_DA_BASE[3]?.citacao).toMatch(/Open Food Facts.*ODbL/)
    for (const fonte of FONTES_DA_BASE) expect(fonte.url).toMatch(/^https:\/\//)
  })

  it('CA-963 (spec vitaminas-usda): a fonte do USDA tem a citação, os conjuntos com versão, a data, a licença e o link', () => {
    const usda = FONTES_DA_BASE[1]
    expect(usda?.citacao).toBe(
      'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov. Conjuntos SR Legacy (versão de abril de 2018) e Foundation Foods (versão de abril de 2026), baixados em 20/10/2026. Domínio público (CC0 1.0 Universal).',
    )
    expect(usda?.uso).toBe(
      'Valores de alimento equivalente americano para os 308 alimentos que têm equivalente, porque a tabela brasileira não traz esses cinco. A gordura trans vem junto, só informativa. Sem equivalente, o dado fica em branco, nunca zero.',
    )
    expect(usda?.url).toBe('https://fdc.nal.usda.gov/')
    expect(usda?.rotuloLink).toBe('Abrir o FoodData Central')
  })
})

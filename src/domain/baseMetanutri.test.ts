import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from './baseMetanutri.ts'

describe('Base MetaNutri (D-51, CA-322)', () => {
  it('tem o nome da base', () => {
    expect(NOME_DA_BASE).toBe('Base MetaNutri')
  })

  it('conta alimentos, nutrientes e medidas caseiras na base em uso', () => {
    expect(resumoDaBase()).toEqual({ alimentos: 597, nutrientes: 20, comMedidaCaseira: 287 })
  })

  it('cita as três fontes, cada uma com link', () => {
    expect(FONTES_DA_BASE.map((f) => f.assunto)).toEqual(['Composição dos alimentos', 'Medidas caseiras', 'Produtos de rótulo'])
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/Tabela Brasileira de Composição de Alimentos \(TACO\), 4ª edição revisada e ampliada/)
    expect(FONTES_DA_BASE[0]?.citacao).toMatch(/NEPA.*UNICAMP/)
    expect(FONTES_DA_BASE[1]?.citacao).toMatch(/IBGE.*Pesquisa de Orçamentos Familiares 2008-2009/)
    expect(FONTES_DA_BASE[2]?.citacao).toMatch(/Open Food Facts.*ODbL/)
    for (const fonte of FONTES_DA_BASE) expect(fonte.url).toMatch(/^https:\/\//)
  })
})

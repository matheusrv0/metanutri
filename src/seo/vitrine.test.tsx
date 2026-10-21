import { desenharPaginas } from './vitrine.tsx'

describe('desenharPaginas (spec site-publico-profissional, D-331)', () => {
  const paginas = desenharPaginas()
  const corpo = (rota: string) => paginas.find((p) => p.rota === rota)?.corpo ?? ''

  it('CA-1013 e CA-1014: desenha as cinco páginas indexáveis, cada uma com o cabeçalho dela', () => {
    expect(paginas.map((p) => [p.rota, p.caminho])).toEqual([
      ['inicio', ''],
      ['precos', 'precos/'],
      ['termos', 'termos/'],
      ['privacidade', 'privacidade/'],
      ['fontes', 'fontes/'],
    ])
    for (const pagina of paginas) expect(pagina.cabecalho).toContain('<link rel="canonical"')
  })

  it('CA-1013: a landing sai escrita, dentro da moldura pública, com os títulos, os preços e o rodapé', () => {
    const html = corpo('inicio')
    expect(html).toMatch(/<h1[^>]*>Faltou cálcio\?/)
    for (const trecho of ['Como funciona', 'Do atendimento à folha do paciente', 'Quanto custa', 'R$ 34,90', 'Comece pelo Free', 'Termos de uso', 'Fontes da base']) {
      expect(html).toContain(trecho)
    }
    expect(html).toContain('<header')
    expect(html).toContain('<footer')
  })

  it('CA-1014: Preços, Termos, Privacidade e Fontes saem com o título de cada uma', () => {
    expect(corpo('precos')).toContain('Grátis na faculdade, barato ao se')
    expect(corpo('termos')).toMatch(/<h1[^>]*>Termos de uso<\/h1>/)
    expect(corpo('privacidade')).toMatch(/<h1[^>]*>Política de privacidade<\/h1>/)
    expect(corpo('fontes')).toMatch(/<h1[^>]*>Fontes da base<\/h1>/)
  })

  it('CA-998: nada sai invisível esperando animação', () => {
    for (const pagina of paginas) expect(pagina.corpo).not.toMatch(/opacity:\s*0|blur\(/)
  })
})

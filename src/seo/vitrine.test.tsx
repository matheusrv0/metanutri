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
    // Spec landing-escura (CA-1484): a landing nova, com o preço do Solo de PLANOS.
    expect(html).toMatch(/<h1[^>]*><span[^>]*>Falta cálcio\?<\/span>/)
    for (const trecho of [
      'O que falta no plano da Maria, 28 anos?',
      'O plano sai do seu jeito',
      'Como funciona',
      'Na medida da cozinha',
      'Quanto custa',
      'Solo: R$ 34,90 por mês',
      'Perguntas de quem atende',
      'Termos de uso',
    ]) {
      expect(html).toContain(trecho)
    }
    expect(html).toContain('<header')
    expect(html).toContain('<footer')
    // CA-1450 e CA-1484: a landing sai escura (a raiz da moldura dela) e com o rodapé novo.
    expect(html).toMatch(/class="landing-escura dark /)
    for (const trecho of ['Fale com a gente', 'Referências', 'falta cálcio', '640 de 1.000 mg no dia']) expect(html).toContain(trecho)
  })

  it('CA-1014: Preços, Termos, Privacidade e Fontes saem com o título de cada uma', () => {
    expect(corpo('precos')).toMatch(/<h1[^>]*>Planos e preços<\/h1>/)
    expect(corpo('termos')).toMatch(/<h1[^>]*>Termos de uso<\/h1>/)
    expect(corpo('privacidade')).toMatch(/<h1[^>]*>Política de privacidade<\/h1>/)
    // Spec landing-escura, D-542: a página das fontes se chama Referências.
    expect(corpo('fontes')).toMatch(/<h1[^>]*>Referências<\/h1>/)
  })

  it('CA-1028: o HTML pré-desenhado liga as páginas entre si por links que os robôs seguem', () => {
    for (const pagina of paginas) {
      for (const destino of ['precos/', 'termos/', 'privacidade/', 'fontes/']) expect(pagina.corpo, pagina.rota).toContain(`href="${destino}"`)
    }
  })

  it('CA-998: nada sai invisível esperando animação', () => {
    for (const pagina of paginas) expect(pagina.corpo).not.toMatch(/opacity:\s*0|blur\(/)
  })
})

import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { planoPorId } from '@/domain/conta.ts'
import { ENDERECO_DO_SITE, enderecoDaPagina, PAGINAS, paginaDaRota } from './paginas.ts'

describe('as páginas indexáveis (spec site-publico-profissional)', () => {
  it('CA-1014 e CA-1018: cinco páginas, cada uma com o próprio caminho e endereço', () => {
    expect(PAGINAS.map((p) => [p.rota, p.caminho])).toEqual([
      ['inicio', ''],
      ['precos', 'precos/'],
      ['termos', 'termos/'],
      ['privacidade', 'privacidade/'],
      ['fontes', 'fontes/'],
    ])
    expect(ENDERECO_DO_SITE).toBe('https://metanutri.com.br/')
    expect(PAGINAS.map(enderecoDaPagina)).toEqual([
      'https://metanutri.com.br/',
      'https://metanutri.com.br/precos/',
      'https://metanutri.com.br/termos/',
      'https://metanutri.com.br/privacidade/',
      'https://metanutri.com.br/fontes/',
    ])
  })

  it.each(PAGINAS.map((p) => [p.rota, p] as const))('CA-1009: %s tem título de até 60 letras e descrição de até 155', (_rota, pagina) => {
    expect(pagina.titulo.length).toBeLessThanOrEqual(60)
    expect(pagina.descricao.length).toBeLessThanOrEqual(155)
    expect(pagina.titulo).toContain('MetaNutri')
    expect(new Set(PAGINAS.map((p) => p.titulo)).size).toBe(PAGINAS.length)
  })

  it('CA-1009: a página inicial diz o que é e o diferencial, com o número de nutrientes do domínio', () => {
    const inicio = paginaDaRota('inicio')
    expect(inicio.titulo).toBe('MetaNutri: software de nutrição que diz o que comer')
    const vitaminasEMinerais = MICRONUTRIENTES_ADEQUACAO.filter((c) => c !== 'fibra_g').length
    expect(inicio.descricao).toBe(
      `Monte o plano alimentar, veja o que falta de ${vitaminasEMinerais} vitaminas e minerais e receba alimento e porção para cobrir cada falta. Grátis para começar.`,
    )
  })

  it('D-327: o título e a descrição de Preços saem de PLANOS', () => {
    const precos = paginaDaRota('precos')
    const solo = planoPorId('solo')
    expect(solo?.mensal).toBe(34.9)
    expect(precos.titulo).toBe('Preços do MetaNutri: grátis para estudante, Solo a R$ 34,90')
    expect(precos.descricao).toBe(
      'Free e Estudante por R$ 0, Solo por R$ 34,90 ao mês ou R$ 299 ao ano e Pro por R$ 64,90 ao mês ou R$ 599 ao ano.',
    )
  })
})

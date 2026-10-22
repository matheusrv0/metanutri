import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { cabecalhoDaPagina, dadosEstruturados, IMAGEM_DE_COMPARTILHAR } from './cabecalho.ts'
import { paginaDaRota } from './paginas.ts'

/** O JSON de dentro do <script type="application/ld+json">, ou nulo. */
function jsonLd(html: string): unknown {
  const achado = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)
  return achado?.[1] ? (JSON.parse(achado[1]) as unknown) : null
}

const meta = (html: string, atributo: 'name' | 'property', nome: string) =>
  new RegExp(`<meta ${atributo}="${nome.replace(/[.:]/g, '\\$&')}" content="([^"]*)" />`).exec(html)?.[1] ?? null

describe('o cabeçalho de cada página (spec site-publico-profissional)', () => {
  it('CA-1009: título, descrição, canônico, Open Graph e cartão do X na página inicial', () => {
    const inicio = paginaDaRota('inicio')
    const html = cabecalhoDaPagina(inicio)
    expect(html).toContain(`<title>${inicio.titulo}</title>`)
    expect(meta(html, 'name', 'description')).toBe(inicio.descricao)
    expect(html).toContain('<link rel="canonical" href="https://metanutri.com.br/" />')
    expect(meta(html, 'property', 'og:title')).toBe(inicio.titulo)
    expect(meta(html, 'property', 'og:description')).toBe(inicio.descricao)
    expect(meta(html, 'property', 'og:url')).toBe('https://metanutri.com.br/')
    expect(meta(html, 'property', 'og:type')).toBe('website')
    expect(meta(html, 'property', 'og:locale')).toBe('pt_BR')
    expect(meta(html, 'property', 'og:site_name')).toBe('MetaNutri')
    expect(meta(html, 'property', 'og:image')).toBe('https://metanutri.com.br/imagem-compartilhar.png')
    expect(meta(html, 'property', 'og:image:width')).toBe('1200')
    expect(meta(html, 'property', 'og:image:height')).toBe('630')
    expect(meta(html, 'name', 'twitter:card')).toBe('summary_large_image')
    expect(meta(html, 'name', 'twitter:image')).toBe(IMAGEM_DE_COMPARTILHAR)
  })

  it('CA-1014: cada página tem o próprio canônico', () => {
    expect(cabecalhoDaPagina(paginaDaRota('precos'))).toContain('<link rel="canonical" href="https://metanutri.com.br/precos/" />')
    expect(cabecalhoDaPagina(paginaDaRota('termos'))).toContain('<link rel="canonical" href="https://metanutri.com.br/termos/" />')
  })

  it('CA-1011: a página inicial e Preços têm o JSON-LD; Termos, Privacidade e Fontes não', () => {
    expect(jsonLd(cabecalhoDaPagina(paginaDaRota('inicio')))).not.toBeNull()
    expect(jsonLd(cabecalhoDaPagina(paginaDaRota('precos')))).not.toBeNull()
    for (const rota of ['termos', 'privacidade', 'fontes'] as const) expect(jsonLd(cabecalhoDaPagina(paginaDaRota(rota)))).toBeNull()
  })

  it('CA-1011: Organization e SoftwareApplication, com as ofertas de PLANOS em BRL e sem avaliação inventada', () => {
    const dados = dadosEstruturados()
    const grafo = dados['@graph']
    const organizacao = grafo.find((no) => no['@type'] === 'Organization')
    const aplicativo = grafo.find((no) => no['@type'] === 'SoftwareApplication')
    expect(organizacao).toMatchObject({ name: 'MetaNutri', url: 'https://metanutri.com.br/', email: CONTATO_EMAIL, logo: 'https://metanutri.com.br/icon-512.png' })
    expect(aplicativo).toMatchObject({ name: 'MetaNutri', applicationCategory: 'HealthApplication', operatingSystem: 'Web', inLanguage: 'pt-BR' })
    const ofertas = (aplicativo?.['offers'] ?? []) as readonly { readonly price: string; readonly priceCurrency: string; readonly name: string }[]
    expect(ofertas.map((o) => [o.name, o.price])).toEqual([
      ['Free', '0'],
      ['Estudante', '0'],
      ['Solo, mensal', '34.90'],
      ['Solo, anual', '299.00'],
      ['Pro, mensal', '64.90'],
      ['Pro, anual', '599.00'],
    ])
    expect(ofertas.every((o) => o.priceCurrency === 'BRL')).toBe(true)
    expect(JSON.stringify(dados)).not.toMatch(/aggregateRating|review|ratingValue/)
  })

  it('CA-1183 (spec textos-e-promessas, D-415): a descrição do aplicativo e o texto da imagem seguem a landing, sem "falta" repetido', () => {
    const aplicativo = dadosEstruturados()['@graph'].find((no) => no['@type'] === 'SoftwareApplication')
    expect(aplicativo?.['applicationSubCategory']).toBe('Software para nutricionistas')
    expect(aplicativo?.['description']).toBe(
      'Software para nutricionistas: plano alimentar com adequação de 20 vitaminas e minerais e da fibra, sugestão de alimento e porção em medida caseira para cada nutriente abaixo da meta (botão Cobrir) e missões diárias para o paciente.',
    )
    expect(meta(cabecalhoDaPagina(paginaDaRota('inicio')), 'property', 'og:image:alt')).toBe(
      'Logotipo do MetaNutri em fundo verde-petróleo, com a frase “Software de nutrição que diz o que comer”.',
    )
  })

  it('CA-1012: o JSON-LD não abre brecha para fechar o <script> antes da hora', () => {
    const html = cabecalhoDaPagina(paginaDaRota('inicio'))
    const bloco = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''
    expect(bloco).not.toContain('<')
    expect(html.match(/<script/g)).toHaveLength(1)
  })
})

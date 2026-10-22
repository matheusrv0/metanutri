// O cabeçalho de busca e compartilhamento de cada página (spec site-publico-profissional, D-329 e D-330).
// Texto puro, sem DOM: o build o escreve no HTML de cada página, e o index.html guarda a cópia da inicial entre as
// marcas (um teste confere que as duas são iguais).
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { PLANOS } from '@/domain/conta.ts'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { ENDERECO_DO_SITE, enderecoDaPagina, paginaDaRota, type PaginaIndexavel } from './paginas.ts'

export { MARCA_FIM, MARCA_INICIO } from './marcas.ts'

/** A imagem das prévias de link: 1200 × 630, feita da marca por scripts/imagem-de-compartilhar.mjs. */
export const IMAGEM_DE_COMPARTILHAR = `${ENDERECO_DO_SITE}imagem-compartilhar.png`
const TEXTO_DA_IMAGEM = 'Logotipo do MetaNutri em fundo verde-petróleo, com a frase “Software de nutrição que diz o que comer”.'

/** Só a página inicial e Preços falam do produto e dos preços; Termos, Privacidade e Fontes não precisam. */
const COM_DADOS_ESTRUTURADOS: readonly PaginaIndexavel['rota'][] = ['inicio', 'precos']

const atributo = (texto: string) => texto.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

type No = Record<string, unknown>

interface DadosEstruturados {
  readonly '@context': 'https://schema.org'
  readonly '@graph': readonly No[]
}

const preco = (valor: number) => (valor === 0 ? '0' : valor.toFixed(2))

/** CA-1011: o MetaNutri e os planos, em schema.org. Sem nota, avaliação nem depoimento: não existem. */
export function dadosEstruturados(): DadosEstruturados {
  const urlPrecos = enderecoDaPagina(paginaDaRota('precos'))
  // D-406 (spec textos-e-promessas): a Clínica é por contato, sem preço público.
  const ofertas = PLANOS.filter((plano) => !plano.porContato).flatMap((plano) => {
    const oferta = (nome: string, valor: number) => ({ '@type': 'Offer', name: nome, price: preco(valor), priceCurrency: 'BRL', url: urlPrecos })
    if (plano.mensal === 0) return [oferta(plano.nome, 0)]
    return [oferta(`${plano.nome}, mensal`, plano.mensal), ...(plano.anual > 0 ? [oferta(`${plano.nome}, anual`, plano.anual)] : [])]
  })
  const vitaminasEMinerais = MICRONUTRIENTES_ADEQUACAO.filter((chave) => chave !== 'fibra_g').length
  const organizacao = `${ENDERECO_DO_SITE}#organizacao`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizacao,
        name: 'MetaNutri',
        url: ENDERECO_DO_SITE,
        logo: `${ENDERECO_DO_SITE}icon-512.png`,
        ...(CONTATO_EMAIL ? { email: CONTATO_EMAIL } : {}),
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${ENDERECO_DO_SITE}#aplicativo`,
        name: 'MetaNutri',
        url: ENDERECO_DO_SITE,
        applicationCategory: 'HealthApplication',
        applicationSubCategory: 'Software para nutricionistas',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        description: `Software para nutricionistas: plano alimentar com adequação de ${vitaminasEMinerais} vitaminas e minerais e da fibra, sugestão de alimento e porção para cada nutriente abaixo da meta (botão Cobrir) e missões diárias para o paciente.`,
        image: IMAGEM_DE_COMPARTILHAR,
        publisher: { '@id': organizacao },
        offers: ofertas,
      },
    ],
  }
}

/** JSON dentro de <script>: nenhum "<" passa, para nada fechar a tag antes da hora (CA-1012). */
const jsonParaScript = (dados: unknown) => JSON.stringify(dados).replaceAll('<', '\\u003c')

/** As tags do <head> que mudam de página para página, uma por linha. */
export function cabecalhoDaPagina(pagina: PaginaIndexavel): string {
  const endereco = enderecoDaPagina(pagina)
  const titulo = atributo(pagina.titulo)
  const descricao = atributo(pagina.descricao)
  const linhas = [
    `<title>${titulo}</title>`,
    `<meta name="description" content="${descricao}" />`,
    `<link rel="canonical" href="${endereco}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="MetaNutri" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:title" content="${titulo}" />`,
    `<meta property="og:description" content="${descricao}" />`,
    `<meta property="og:url" content="${endereco}" />`,
    `<meta property="og:image" content="${IMAGEM_DE_COMPARTILHAR}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${atributo(TEXTO_DA_IMAGEM)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${titulo}" />`,
    `<meta name="twitter:description" content="${descricao}" />`,
    `<meta name="twitter:image" content="${IMAGEM_DE_COMPARTILHAR}" />`,
    ...(COM_DADOS_ESTRUTURADOS.includes(pagina.rota) ? [`<script type="application/ld+json">${jsonParaScript(dadosEstruturados())}</script>`] : []),
  ]
  return linhas.join('\n    ')
}

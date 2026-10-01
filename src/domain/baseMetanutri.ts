// A base de alimentos com o nome do MetaNutri e as fontes que a licença da TACO
// manda citar (spec pdf-e-telas-limpas, D-51 e CA-322).
import { medidasDoAlimento } from './busca.ts'
import { NUTRIENTES_CONFERIDOS } from './completude.ts'
import { ALIMENTOS } from './tabelas.ts'

export const NOME_DA_BASE = 'Base MetaNutri'

export interface FonteDaBase {
  readonly assunto: string
  readonly citacao: string
  /** O que entra na base a partir desta fonte, em uma frase. */
  readonly uso: string
  readonly url: string
  readonly rotuloLink: string
}

export const FONTES_DA_BASE: readonly FonteDaBase[] = [
  {
    assunto: 'Composição dos alimentos',
    citacao:
      'Núcleo de Estudos e Pesquisas em Alimentação (NEPA), Universidade Estadual de Campinas (UNICAMP). Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada. Campinas: NEPA/UNICAMP, 2011.',
    uso: 'Valores por 100 g de parte comestível. Nutriente que a tabela não analisou aparece como travessão, nunca como zero.',
    url: 'https://www.cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf',
    rotuloLink: 'Abrir a publicação',
  },
  {
    assunto: 'Medidas caseiras',
    citacao:
      'Instituto Brasileiro de Geografia e Estatística (IBGE). Pesquisa de Orçamentos Familiares 2008-2009: tabela de medidas referidas para os alimentos consumidos no Brasil. Rio de Janeiro: IBGE, 2011.',
    uso: 'É daqui que vêm "4 colheres de sopa", "1 concha" e "1 bife" em cada alimento.',
    url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html',
    rotuloLink: 'Abrir a publicação',
  },
  {
    assunto: 'Produtos de rótulo',
    citacao: 'Open Food Facts, base colaborativa e aberta de produtos alimentícios, sob a licença Open Database License (ODbL).',
    uso: 'Só entra o produto que você cadastra em Meus produtos; açúcares e gordura saturada vêm do rótulo.',
    url: 'https://world.openfoodfacts.org/',
    rotuloLink: 'Abrir o Open Food Facts',
  },
]

export interface ResumoDaBase {
  readonly alimentos: number
  readonly nutrientes: number
  readonly comMedidaCaseira: number
}

/** Contado na base em uso: se ela mudar, a página de fontes muda junto. */
export function resumoDaBase(): ResumoDaBase {
  return {
    alimentos: ALIMENTOS.length,
    nutrientes: NUTRIENTES_CONFERIDOS.length,
    comMedidaCaseira: ALIMENTOS.filter((a) => medidasDoAlimento(a.id).length > 0).length,
  }
}

// A base de alimentos com o nome do MetaNutri e as fontes que a licença da TACO
// manda citar (spec pdf-e-telas-limpas, D-51 e CA-322), mais o USDA, que pede a citação (spec vitaminas-usda, D-308).
import { medidasDoAlimento } from './busca.ts'
import { FONTE_USDA, mesDaVersao } from './complementoUsda.ts'
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

/** Quantos alimentos da base têm equivalente no USDA: contado na base em uso. */
const comComplementoUsda = (): number => ALIMENTOS.filter((a) => a.usda !== undefined).length

/** "Conjuntos SR Legacy (versão de abril de 2018) e Foundation Foods (versão de abril de 2026), baixados em 20/10/2026." */
function conjuntosDoUsda(): string {
  const conjuntos = FONTE_USDA.conjuntos.map((c) => `${c.nome} (versão de ${mesDaVersao(c.versao)})`)
  const lista = conjuntos.length > 1 ? `${conjuntos.slice(0, -1).join(', ')} e ${conjuntos.at(-1) ?? ''}` : (conjuntos[0] ?? '')
  const [ano, mes, dia] = FONTE_USDA.baixadoEm.split('-')
  return `Conjuntos ${lista}, baixados em ${dia}/${mes}/${ano}.`
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
    assunto: 'Vitaminas D, B12, folato, E e selênio',
    citacao: `${FONTE_USDA.citacao} ${conjuntosDoUsda()} Domínio público (CC0 1.0 Universal).`,
    uso: `Para os ${comComplementoUsda()} alimentos com equivalente no USDA, os cinco nutrientes que a TACO não traz vêm do alimento americano correspondente. A gordura trans vem junto, só como informação. Sem equivalente, o dado fica em branco, nunca zero.`,
    url: FONTE_USDA.url,
    rotuloLink: 'Abrir o FoodData Central',
  },
  {
    assunto: 'Medidas caseiras',
    citacao:
      'Instituto Brasileiro de Geografia e Estatística (IBGE). Pesquisa de Orçamentos Familiares 2008-2009: tabela de medidas referidas para os alimentos consumidos no Brasil. Rio de Janeiro: IBGE, 2011.',
    uso: 'É daqui que vêm “4 colheres de sopa”, “1 concha” e “1 bife” em cada alimento.',
    url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html',
    rotuloLink: 'Abrir a publicação',
  },
  {
    assunto: 'Produtos de rótulo',
    citacao: 'Open Food Facts, base colaborativa e aberta de produtos alimentícios, sob a licença Open Database License (ODbL).',
    uso: 'Usada só nos produtos que você cadastra em Meus alimentos; açúcares e gordura saturada vêm do rótulo.',
    url: 'https://world.openfoodfacts.org/',
    rotuloLink: 'Abrir o Open Food Facts',
  },
]

export interface ResumoDaBase {
  readonly alimentos: number
  /** Os nutrientes da tabela brasileira que a base confere em todo alimento. */
  readonly nutrientes: number
  readonly comMedidaCaseira: number
  /** Alimentos com vitamina D, E, folato, B12 e selênio vindos de equivalente do USDA (spec vitaminas-usda). */
  readonly comComplementoUsda: number
}

/** Contado na base em uso: se ela mudar, a página de fontes muda junto. */
export function resumoDaBase(): ResumoDaBase {
  return {
    alimentos: ALIMENTOS.length,
    nutrientes: NUTRIENTES_CONFERIDOS.length,
    comMedidaCaseira: ALIMENTOS.filter((a) => medidasDoAlimento(a.id).length > 0).length,
    comComplementoUsda: comComplementoUsda(),
  }
}

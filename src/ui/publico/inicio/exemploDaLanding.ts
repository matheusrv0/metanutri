// Os números da landing (spec landing-v3, seção v9: D-652 a D-665): o plano de exemplo do app (Maria, 28 anos) passado
// pelo motor do Cobrir, pela Base MetaNutri e pelas missões. Ficam escritos aqui para a página não carregar a base nem o
// motor; o teste ao lado (exemploDaLanding.test.ts) roda os três de verdade e falha se uma letra divergir (R-530).

export type ChaveDoNutriente = 'calcio' | 'vitamina-e' | 'vitamina-d'

/** Uma sugestão do Cobrir, como a Adequação da landing mostra (D-657 e D-658). */
export interface SugestaoDoExemplo {
  /** O nome que a paciente lê (`nomeParaPaciente`). */
  readonly nome: string
  /** Só os gramas (ou mililitros), como a gaveta do app: "150 g". */
  readonly gramas: string
  /** As calorias que a porção soma ao dia, sem o "+" e sem a unidade: "62". */
  readonly kcal: string
  /** A parte da falta que a porção cobre, em %, arredondada: 91. */
  readonly cobre: number
  /** O que ainda falta com a porção, como o app escreve ("24,3 mg"); nulo quando ela cobre a falta toda. */
  readonly resta: string | null
}

/** Uma aba da Adequação (D-656). */
export interface NutrienteDoExemplo {
  readonly chave: ChaveDoNutriente
  /** O nutriente, como na tabela da adequação. */
  readonly nome: string
  /** "640 de 1.000 mg no dia". */
  readonly total: string
  /** O percentual da referência, como a Adequação do app arredonda: 64. */
  readonly pct: number
  /** O que falta até a meta: "260 mg". */
  readonly falta: string
  readonly sugestoes: readonly SugestaoDoExemplo[]
  /** A sugestão escolhida ao abrir a aba (D-657). */
  readonly escolhida: number
}

/** A meta da adequação no padrão do app: 90% da referência (`PRESETS.individual.minimoPct`). */
export const META_DA_ADEQUACAO = 90

/** Quantas sugestões cada aba mostra: as três primeiras de nome diferente (D-537 e D-657). */
export const SUGESTOES_POR_NUTRIENTE = 3

/** As três abas, com as sugestões na ordem do motor e o nome que a paciente lê (D-656 a D-658). */
export const NUTRIENTES_DO_EXEMPLO: readonly NutrienteDoExemplo[] = [
  {
    chave: 'calcio',
    nome: 'Cálcio',
    total: '640 de 1.000 mg no dia',
    pct: 64,
    falta: '260 mg',
    escolhida: 1,
    sugestoes: [
      { nome: 'Rúcula', gramas: '60 g', kcal: '8', cobre: 27, resta: '190 mg' },
      { nome: 'Iogurte natural desnatado', gramas: '150 g', kcal: '62', cobre: 91, resta: '24,3 mg' },
      { nome: 'Sardinha assada', gramas: '60 g', kcal: '99', cobre: 100, resta: null },
    ],
  },
  {
    chave: 'vitamina-e',
    nome: 'Vitamina E',
    total: '5,4 de 15 mg no dia',
    pct: 36,
    falta: '8,1 mg',
    escolhida: 1,
    sugestoes: [
      { nome: 'Almeirão cru', gramas: '60 g', kcal: '11', cobre: 17, resta: '6,8 mg' },
      { nome: 'Amêndoa torrada salgada', gramas: '30 g', kcal: '174', cobre: 88, resta: '1,0 mg' },
      { nome: 'Abacate', gramas: '135 g', kcal: '130', cobre: 44, resta: '4,6 mg' },
    ],
  },
  {
    chave: 'vitamina-d',
    nome: 'Vitamina D',
    total: '2,1 de 15 µg no dia',
    pct: 14,
    falta: '11,4 µg',
    escolhida: 0,
    sugestoes: [
      { nome: 'Filé de salmão fresco grelhado com pele', gramas: '90 g', kcal: '206', cobre: 100, resta: null },
      { nome: 'Atum em óleo', gramas: '120 g', kcal: '199', cobre: 71, resta: '3,3 µg' },
      { nome: 'Gema de ovo cozida', gramas: '40 g', kcal: '141', cobre: 19, resta: '9,2 µg' },
    ],
  },
]

/** D-652: "a adequação de 20 vitaminas e minerais": a lista da adequação do app, sem a fibra. */
export const VITAMINAS_E_MINERAIS = 20

/** Uma missão do celular: o texto e a origem, como o link do paciente mostra. */
export interface MissaoDoExemplo {
  readonly texto: string
  readonly origem: string
}

/** D-659: as missões do plano de exemplo, no texto de `missoesDoPlano` (com a água da Maria), na ordem do app. */
export const MISSOES_DO_EXEMPLO: readonly MissaoDoExemplo[] = [
  { texto: 'Café da manhã por volta das 6h', origem: 'Refeição do plano' },
  { texto: 'Lanche da manhã por volta das 9h', origem: 'Refeição do plano' },
  { texto: 'Almoço por volta das 12h', origem: 'Refeição do plano' },
  { texto: 'Lanche da tarde por volta das 16h', origem: 'Refeição do plano' },
  { texto: 'Jantar por volta das 19h', origem: 'Refeição do plano' },
  { texto: 'Ceia por volta das 21h', origem: 'Refeição do plano' },
  { texto: 'Comer as 3 frutas do plano', origem: 'Frutas que estão no plano' },
  { texto: 'Comer as verduras e os legumes do plano', origem: 'Verduras e legumes que estão no plano' },
  { texto: 'Beber cerca de 2,2 litros de água', origem: 'Meta de água do plano' },
]

/** D-659 e D-660: o alto da tela do celular. Às 9h41, as duas missões da manhã já estão marcadas. */
export const CELULAR_DO_EXEMPLO = {
  hora: '9:41',
  saudacao: 'Olá, Maria',
  data: 'Terça-feira, 27 de outubro',
  marcadasAoAbrir: 2,
} as const

/** D-661: o painel de Adesão, com os estados e o prazo do app. A semana começa na segunda; hoje é a terça. */
export const PAINEL_DO_EXEMPLO = {
  dias: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
  hoje: 1,
  semMarcar: '4 dias sem marcar',
  atencao: 'Atenção',
  emDia: 'Em dia',
} as const

/** Um alimento do almoço com os gramas e as calorias da base. */
export interface AlimentoEmGramas {
  /** O nome que a paciente lê no plano. */
  readonly alimento: string
  readonly gramas: string
  readonly kcal: string
}

/** D-665: "Quantidades em gramas e calorias": um almoço de plano com os gramas e as calorias da base. */
export const ALMOCO_EM_GRAMAS: readonly AlimentoEmGramas[] = [
  { alimento: 'Arroz branco cozido', gramas: '85 g', kcal: '109 kcal' },
  { alimento: 'Feijão carioca cozido', gramas: '140 g', kcal: '107 kcal' },
  { alimento: 'Patinho grelhado sem gordura', gramas: '100 g', kcal: '219 kcal' },
  { alimento: 'Abóbora cabotiá cozida', gramas: '72 g', kcal: '35 kcal' },
  { alimento: 'Chuchu cozido', gramas: '110 g', kcal: '20 kcal' },
]

/**
 * D-540: o formulário novo de Meus alimentos (por 100 g) só vale na publicação 2 (`MEUS_ALIMENTOS_NOVOS`). Antes dela, o
 * site fala só do que existe: o rótulo e o código de barras. Vale para Funcionalidades (D-663) e para as perguntas (D-672).
 */
export function textoDosAlimentosProprios(formularioNovo: boolean): { readonly funcionalidade: string; readonly resposta: string } {
  return formularioNovo
    ? {
        funcionalidade: 'O que a base ainda não tem entra por 100 g, pela porção do rótulo ou pelo código de barras.',
        resposta: 'Você cadastra em Meus alimentos: por 100 g, pela porção do rótulo ou pelo código de barras.',
      }
    : {
        funcionalidade: 'O que a base ainda não tem entra pelo rótulo ou pelo código de barras.',
        resposta: 'Você cadastra em Meus alimentos, pelo rótulo ou pelo código de barras, e ele entra na refeição pela busca.',
      }
}

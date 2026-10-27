// Os números da landing (spec landing-escura, D-537 a D-540): o plano de exemplo do app (Maria, 28 anos) passado pelo
// motor do Cobrir e pela Base MetaNutri. Ficam escritos aqui para a página não carregar a base nem o motor; o teste ao
// lado (exemploDaLanding.test.ts) roda os dois de verdade e falha se uma letra divergir (CA-1467 a CA-1469, R-530).

export type ChaveDaVitrine = 'calcio' | 'vitamina-e' | 'vitamina-d'

/** Uma sugestão do Cobrir como a gaveta mostra: o alimento, a porção, quanto da falta cobre e as calorias que soma. */
export interface LinhaDoCobrir {
  readonly nome: string
  readonly porcao: string
  /** "27%". */
  readonly cobre: string
  /** As calorias que a porção soma ao dia, sem o "+" e sem a unidade: "8". */
  readonly kcal: string
}

export interface CartaoDoCobrir {
  /** O nutriente, como na tabela da adequação. */
  readonly nome: string
  /** "640 de 1.000 mg no dia". */
  readonly total: string
  /** "260 mg". */
  readonly falta: string
  readonly linhas: readonly LinhaDoCobrir[]
}

/** O campo vivo: as três primeiras sugestões de nome diferente de cada nutriente (D-537). */
export const CARTOES_DA_VITRINE: Readonly<Record<ChaveDaVitrine, CartaoDoCobrir>> = {
  calcio: {
    nome: 'Cálcio',
    total: '640 de 1.000 mg no dia',
    falta: '260 mg',
    linhas: [
      { nome: 'Rúcula, crua', porcao: '60 g', cobre: '27%', kcal: '8' },
      { nome: 'Iogurte, natural, desnatado', porcao: '1 copo americano · 150 g', cobre: '91%', kcal: '62' },
      { nome: 'Sardinha, assada', porcao: '60 g', cobre: '100%', kcal: '99' },
    ],
  },
  'vitamina-e': {
    nome: 'Vitamina E',
    total: '5,4 de 15 mg no dia',
    falta: '8,1 mg',
    linhas: [
      { nome: 'Almeirão, cru', porcao: '5 folhas · 60 g', cobre: '17%', kcal: '11' },
      { nome: 'Amêndoa, torrada, salgada', porcao: '30 g', cobre: '88%', kcal: '174' },
      { nome: 'Abacate, cru', porcao: '3 colheres de sopa · 135 g', cobre: '44%', kcal: '130' },
    ],
  },
  'vitamina-d': {
    nome: 'Vitamina D',
    total: '2,1 de 15 µg no dia',
    falta: '11,4 µg',
    linhas: [
      { nome: 'Salmão, filé, com pele, fresco, grelhado', porcao: '90 g', cobre: '100%', kcal: '206' },
      { nome: 'Atum, conserva em óleo', porcao: '120 g', cobre: '71%', kcal: '199' },
      { nome: 'Ovo, de galinha, gema, cozida', porcao: '40 g', cobre: '19%', kcal: '141' },
    ],
  },
}

export interface LinhaDaAdequacao {
  readonly nome: string
  /** "640 de 1.000 mg · 64%". */
  readonly quanto: string
  /** A porcentagem da referência, que vira a largura da barra. */
  readonly pct: number
}

/** "Depois, veja quanto falta.": as três linhas da etapa Adequação. */
export const ADEQUACAO_DO_EXEMPLO: readonly LinhaDaAdequacao[] = [
  { nome: 'Cálcio', quanto: '640 de 1.000 mg · 64%', pct: 64 },
  { nome: 'Vitamina E', quanto: '5,4 de 15 mg · 36%', pct: 36 },
  { nome: 'Vitamina D', quanto: '2,1 de 15 µg · 14%', pct: 14 },
]

/** "Então, cubra o que falta.": as cinco sugestões do cálcio, na ordem do motor. */
export const COBRIR_CALCIO: { readonly falta: string; readonly linhas: readonly LinhaDoCobrir[] } = {
  falta: '260 mg',
  linhas: [
    ...CARTOES_DA_VITRINE.calcio.linhas,
    { nome: 'Soja, queijo (tofu)', porcao: '140 g', cobre: '44%', kcal: '90' },
    { nome: 'Laranja, da terra, crua', porcao: '1 unidade · 180 g', cobre: '35%', kcal: '93' },
  ],
}

/** "Primeiro, digite o que a paciente come.": o que a busca da refeição dá para o texto digitado. */
export const FEIJAO_NA_CONCHA = {
  digitado: '1 concha de feijão',
  nome: 'Feijão, carioca, cozido',
  paraPaciente: 'Feijão carioca cozido',
  medida: '1 concha',
  gramas: '140 g',
  kcal: '107 kcal',
} as const

export interface AlimentoNaMedida {
  /** O nome que a paciente lê no plano. */
  readonly alimento: string
  readonly medida: string
  readonly gramas: string
  readonly kcal: string
}

export interface RefeicaoNaMedida {
  readonly refeicao: string
  readonly itens: readonly AlimentoNaMedida[]
}

/** "Na medida da cozinha": um dia em medidas caseiras, com os pesos e as calorias da base. */
export const DIA_EM_MEDIDAS: readonly RefeicaoNaMedida[] = [
  {
    refeicao: 'Café da manhã',
    itens: [
      { alimento: 'Pão francês', medida: '1 unidade', gramas: '50 g', kcal: '150 kcal' },
      { alimento: 'Ovo cozido', medida: '1 unidade', gramas: '45 g', kcal: '66 kcal' },
      { alimento: 'Mamão Formosa', medida: '1 fatia', gramas: '170 g', kcal: '77 kcal' },
    ],
  },
  {
    refeicao: 'Almoço',
    itens: [
      { alimento: 'Arroz branco cozido', medida: '1 escumadeira', gramas: '85 g', kcal: '109 kcal' },
      { alimento: 'Feijão carioca cozido', medida: '1 concha', gramas: '140 g', kcal: '107 kcal' },
      { alimento: 'Patinho grelhado sem gordura', medida: '1 bife', gramas: '100 g', kcal: '219 kcal' },
      { alimento: 'Abóbora cabotiá cozida', medida: '1 colher de servir', gramas: '72 g', kcal: '35 kcal' },
      { alimento: 'Chuchu cozido', medida: '1 escumadeira', gramas: '110 g', kcal: '20 kcal' },
    ],
  },
  {
    refeicao: 'Lanche da tarde',
    itens: [
      { alimento: 'Banana prata', medida: '1 unidade', gramas: '75 g', kcal: '74 kcal' },
      { alimento: 'Iogurte natural desnatado', medida: '1 copo americano', gramas: '150 g', kcal: '62 kcal' },
    ],
  },
]

/** "Água calculada pelo peso": a conta do app para a Maria. */
export const AGUA_DO_EXEMPLO = { pesoKg: '62', mlPorKg: '35', litros: '2,2' } as const

/**
 * D-540: o formulário novo de Meus alimentos (por 100 g, medidas próprias) só vale na publicação 2
 * (`MEUS_ALIMENTOS_NOVOS`). Antes dela, o site fala só do que existe: o rótulo e o código de barras.
 */
export function textoDosAlimentosProprios(formularioNovo: boolean): { readonly efeito: string; readonly resposta: string } {
  return formularioNovo
    ? {
        efeito: 'Cadastre por 100 g ou pela porção do rótulo, com as medidas caseiras que você usa.',
        resposta:
          'Você cadastra em Meus alimentos: por 100 g, pela porção do rótulo ou pelo código de barras, com as medidas caseiras que usa no consultório.',
      }
    : {
        efeito: 'Cadastre o produto pelo rótulo ou pelo código de barras, em Meus alimentos.',
        resposta: 'Você cadastra em Meus alimentos, pelo rótulo ou pelo código de barras, e ele entra na refeição pela busca.',
      }
}

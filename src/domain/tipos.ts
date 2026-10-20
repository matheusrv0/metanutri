// Tipos centrais do domínio do planejador (SPEC planejador-metanutri).

export type Sexo = 'M' | 'F'

export type Objetivo = 'emagrecer' | 'manter' | 'ganhar'

/** Gestação e lactação são mutuamente exclusivas por construção (CB-02a). */
export type CondicaoFisiologica =
  | { readonly tipo: 'nenhuma' }
  | { readonly tipo: 'gestante'; readonly semanasGestacao: number | null; readonly pesoPreGestacionalKg: number | null }
  | { readonly tipo: 'lactante'; readonly mesesPosParto: number | null }

export type FormulaTmb = 'mifflin' | 'harris-benedict'

/** Escolhas do cálculo de energia guardadas com o caso (CA-07 a CA-09). */
export interface PreferenciasEnergia {
  readonly fator: number
  readonly formula: FormulaTmb
  /** GET digitado pela pessoa; substitui o calculado (CA-09). */
  readonly getManual: number | null
}

export interface MetaPct {
  readonly tipo: 'pct'
  readonly min: number
  readonly max: number
}

export interface MetaGKg {
  readonly tipo: 'g_kg'
  readonly min: number
  readonly max: number
}

/** Metas de macronutrientes escolhidas pela pessoa (CA-24); vazio usa as faixas padrão da idade. */
export interface MetasMacros {
  readonly proteina?: MetaPct | MetaGKg
  readonly carboidrato?: MetaPct
  readonly gordura?: MetaPct
}

export type PresetAdequacao =
  | { readonly tipo: 'individual' }
  | { readonly tipo: 'coletivo' }
  | { readonly tipo: 'personalizado'; readonly referencia: 'rda' | 'ear'; readonly minimoPct: number }

/** Escolhas da tela de adequação guardadas com o caso (CA-26 a CA-28, CA-40). */
export interface PreferenciasAdequacao {
  readonly preset: PresetAdequacao
  readonly porcaoMaximaG: number
  readonly incluirIngredientes: boolean
  /** Ids de alimentos que a pessoa ocultou nas sugestões deste caso (CA-40). */
  readonly ocultos: readonly number[]
}

/**
 * Como o plano foi montado.
 * `rapido`: só nome, sexo, idade e meta de energia; nenhuma medida é pedida.
 * `completo`: avaliação antropométrica e energia calculada por fórmula.
 */
export type ModoPlano = 'rapido' | 'completo'

/** Medidas de composição corporal deste atendimento. */
export interface ComposicaoCorporal {
  readonly protocolo: 'jackson-pollock-3' | 'faulkner-4'
  readonly dobras: {
    readonly tricipital: number | null
    readonly subescapular: number | null
    readonly suprailiaca: number | null
    readonly abdominal: number | null
    readonly peitoral: number | null
    readonly coxa: number | null
  }
  readonly bioimpedancia: {
    readonly gorduraPct: number | null
    readonly massaMagraKg: number | null
    readonly aguaPct: number | null
    readonly aparelho: string
  }
}

/** Dados e medidas (CA-01). Campos numéricos ficam `null` enquanto não preenchidos. */
export interface Caso {
  readonly id: string
  /** Paciente a quem este plano pertence; `null` enquanto não vinculado. */
  readonly pacienteId: string | null
  readonly nome: string
  readonly diagnosticoClinico: string
  readonly dataConsulta: string | null
  readonly sexo: Sexo | null
  readonly idadeAnos: number | null
  /** Meses além dos anos completos (0 a 11), usados nas curvas da OMS (CA-02a). */
  readonly idadeMesesAdicionais: number
  readonly pesoKg: number | null
  readonly estaturaCm: number | null
  readonly ocupacao: string
  readonly estagiario: string
  readonly preceptor: string
  readonly objetivo: Objetivo | null
  readonly observacoes: string
  readonly circunferenciaCinturaCm: number | null
  readonly circunferenciaPanturrilhaCm: number | null
  readonly condicao: CondicaoFisiologica
  readonly modo: ModoPlano
  /** Meta de energia digitada no modo rápido, em kcal. */
  readonly metaEnergiaKcal: number | null
  readonly composicao: ComposicaoCorporal
  readonly energia: PreferenciasEnergia
  readonly metasMacros: MetasMacros
  readonly adequacao: PreferenciasAdequacao
  /** Orientações gerais escritas para o documento de aconselhamento (CA-44). */
  readonly orientacoes: string
  /** Receitas anexadas ao documento (CA-44). */
  readonly receitas: string
}

export type OpcaoId = 'principal' | 'substituto1' | 'substituto2'

export const OPCOES: readonly OpcaoId[] = ['principal', 'substituto1', 'substituto2']

/** Um ingrediente de receita: um alimento da base (ou de "Meus produtos") e o peso usado na receita inteira. */
export interface IngredienteReceita {
  readonly alimentoId: number
  readonly gramas: number
}

/**
 * A cópia da receita que o item do plano guarda (spec receitas-com-calculo, D-273): mudar ou excluir a receita da
 * biblioteca depois não muda o plano.
 */
export interface ReceitaDoPlano {
  /** A receita da biblioteca de onde a cópia saiu; só referência, nunca relida. */
  readonly origemId: string
  readonly nome: string
  readonly ingredientes: readonly IngredienteReceita[]
  /** Quantas porções a receita inteira rende (D-271). */
  readonly porcoes: number
  /** Como a porção se chama: "unidade", "fatia", "porção"… */
  readonly nomeDaPorcao: string
  /** O peso da receita pronta; `null` = a soma dos ingredientes. */
  readonly pesoProntoG: number | null
  readonly preparo: string
}

export interface ItemPlano {
  readonly id: string
  /** Na receita, `ID_DE_RECEITA` (0): nenhum alimento da base tem esse id. */
  readonly alimentoId: number
  /** Na receita, o peso da receita pronta servida. */
  readonly gramas: number
  /** Só no item de receita: a cópia dela (spec receitas-com-calculo). */
  readonly receita?: ReceitaDoPlano
}

export interface Refeicao {
  readonly id: string
  readonly nome: string
  /** Horário no formato HH:MM. */
  readonly horario: string
  readonly opcoes: Readonly<Record<OpcaoId, readonly ItemPlano[]>>
}

export interface Plano {
  readonly refeicoes: readonly Refeicao[]
}

/** Chaves de nutrientes de um alimento: as da TACO e as do complemento do USDA (spec vitaminas-usda). */
export type ChaveNutrienteAlimento =
  | 'energia_kcal'
  | 'proteina_g'
  | 'lipideos_g'
  | 'carboidrato_g'
  /* Açúcares e gordura saturada não existem na TACO: vêm do rótulo de produto cadastrado. */
  | 'acucares_g'
  | 'gordura_saturada_g'
  | 'fibra_g'
  | 'colesterol_mg'
  | 'calcio_mg'
  | 'magnesio_mg'
  | 'manganes_mg'
  | 'fosforo_mg'
  | 'ferro_mg'
  | 'sodio_mg'
  | 'potassio_mg'
  | 'cobre_mg'
  | 'zinco_mg'
  | 'vitamina_a_rae_mcg'
  | 'tiamina_mg'
  | 'riboflavina_mg'
  | 'piridoxina_mg'
  | 'niacina_mg'
  | 'vitamina_c_mg'
  /* A TACO não traz estas seis: vêm de alimento equivalente do USDA FoodData Central (spec vitaminas-usda, D-300). */
  | 'vitamina_d_mcg'
  | 'vitamina_e_mg'
  | 'folato_dfe_mcg'
  | 'vitamina_b12_mcg'
  | 'selenio_mcg'
  | 'gordura_trans_g'

/** De onde vêm os valores do complemento: o alimento equivalente no USDA FoodData Central. */
export interface OrigemUsda {
  readonly fdcId: number
  /** "SR Legacy" ou "Foundation Foods". */
  readonly conjunto: string
  /** Ano e mês da versão do conjunto, "2018-04". */
  readonly versao: string
}

export interface Alimento {
  readonly id: number
  readonly descricao: string
  readonly categoria: string
  readonly base: string | null
  readonly preparo: string | null
  readonly qualificadores: string | null
  /** Valores por 100 g. `null` = não analisado; 0 pode ser traço (ver `tracos`). */
  readonly nutrientes: Readonly<Record<ChaveNutrienteAlimento, number | null>>
  readonly tracos: readonly ChaveNutrienteAlimento[]
  /** Presente quando o alimento da TACO tem equivalente no USDA (spec vitaminas-usda, D-303). */
  readonly usda?: OrigemUsda
}

export type BuscarAlimento = (id: number) => Alimento | undefined

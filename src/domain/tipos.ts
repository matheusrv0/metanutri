// Tipos centrais do domínio do planejador (SPEC planejador-metanutri).

export type Sexo = 'M' | 'F'

export type Objetivo = 'emagrecer' | 'manter' | 'ganhar'

/** Gestação e lactação são mutuamente exclusivas por construção (CB-02a). */
export type CondicaoFisiologica =
  | { readonly tipo: 'nenhuma' }
  | { readonly tipo: 'gestante'; readonly semanasGestacao: number | null; readonly pesoPreGestacionalKg: number | null }
  | { readonly tipo: 'lactante'; readonly mesesPosParto: number | null }

/** Dados do caso (CA-01). Campos numéricos ficam `null` enquanto não preenchidos. */
export interface Caso {
  readonly id: string
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
}

export type OpcaoId = 'principal' | 'substituto1' | 'substituto2'

export const OPCOES: readonly OpcaoId[] = ['principal', 'substituto1', 'substituto2']

export interface ItemPlano {
  readonly id: string
  readonly alimentoId: number
  readonly gramas: number
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

/** Chaves de nutrientes presentes na tabela de alimentos (TACO). */
export type ChaveNutrienteAlimento =
  | 'energia_kcal'
  | 'proteina_g'
  | 'lipideos_g'
  | 'carboidrato_g'
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
}

export type BuscarAlimento = (id: number) => Alimento | undefined

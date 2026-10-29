// Tipos de importar-base-ampliada.mjs, para os testes de src/data importarem o script com tipo.
import type { AlimentoUsda, PorcaoUsda } from './usda-fonte.mjs'

export interface ItemDaCuradoria {
  readonly fdcId: number
  readonly decisao: string
  readonly motivo?: string
  readonly id?: number
  readonly nome?: string
  readonly grupo?: string
  readonly preparo?: string | null
  readonly paciente?: string
  readonly sugerivel?: boolean
  readonly porqueNao?: string
  readonly complemento?: number
  readonly naoCopiar?: readonly string[]
  readonly ml?: boolean
}

export interface AlimentoDaBase {
  readonly id: number
  readonly fdcId: number
  readonly conjunto: string
  readonly nome: string
  readonly grupo: string
  readonly preparo: string | null
  readonly paciente: string
  readonly original: string
  readonly sugerivel: boolean
  readonly valores: readonly (number | null)[]
  readonly medidas: readonly (readonly [string, number])[]
  readonly ml?: true
  readonly complemento?: { readonly fdcId: number; readonly chaves: readonly string[] }
  /** Os fatores de Atwater da fonte (proteína, gordura, carboidrato), quando ela os publica. */
  readonly atwater?: readonly [number, number, number]
}

export const PRIMEIRO_ID: number
export const ULTIMO_ID: number
export const GRUPOS: readonly string[]
export const PREPAROS: readonly string[]
export const CHAVES: readonly string[]
export const MAXIMOS: Readonly<Record<string, number>>
export function energiaIncoerente(v: Readonly<Record<string, number | null>>, fatores: readonly [number, number, number] | null): boolean
export function medidasDaCuradoria(item: Pick<ItemDaCuradoria, 'nome' | 'grupo' | 'preparo'>, porcoes: readonly PorcaoUsda[]): [string, number][]
export function montarBase(
  curadoria: readonly ItemDaCuradoria[],
  usda: ReadonlyMap<number, AlimentoUsda>,
  nomesDaTaco: ReadonlySet<string>,
  idsDeAntes?: ReadonlyMap<number, number>,
): { readonly chaves: readonly string[]; readonly alimentos: readonly AlimentoDaBase[] }

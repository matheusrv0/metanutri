// Tipos de importar-catalogo-off.mjs, para os testes de src/data importarem o script com tipo.

/** Uma linha do CSV do OFF, coluna → texto. */
export type RegistroOff = Readonly<Partial<Record<string, string>>>

export type ValoresDoCatalogo = Readonly<Record<string, number | null>>

export interface ProdutoDoCatalogo {
  readonly codigo: string
  readonly nome: string
  readonly marca: string
  readonly porcaoG: number | null
  readonly porcaoTexto: string
  readonly unidade: 'g' | 'ml'
  readonly valores: ValoresDoCatalogo
  readonly alergenicos: AlergenicosDoCatalogo
}

export interface AlergenicosDoCatalogo {
  readonly contem: readonly string[]
  readonly podeConter: readonly string[]
  readonly semInformacao: boolean
}

export const ALERGENICOS: readonly string[]
export const EH_PO: RegExp
export function alergenicosDoRegistro(r: RegistroOff): AlergenicosDoCatalogo
export function mascara(lista: readonly string[]): number

export const URL_DA_EXPORTACAO: string
export const CACHE: string
export const CHAVES_DO_CATALOGO: readonly string[]
export function colunasQueFaltam(cabecalho: readonly string[]): readonly string[]
export function porCem(r: RegistroOff): ValoresDoCatalogo
export function energiaIncoerente(v: Readonly<Record<string, number | null | undefined>>): boolean
export function produtoDoRegistro(r: RegistroOff): ProdutoDoCatalogo | { readonly descartado: string }
export function montarCatalogo(registros: Iterable<RegistroOff>): {
  readonly produtos: readonly ProdutoDoCatalogo[]
  readonly doBrasil: number
  readonly descartados: Readonly<Record<string, number>>
}

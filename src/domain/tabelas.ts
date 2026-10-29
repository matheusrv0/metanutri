// Acesso tipado às tabelas geradas em src/data (TACO, complemento do USDA e DRI).
import tabelaAlimentos from '../data/alimentos.json'
import tabelaDri from '../data/dri.json'
import { COMPLEMENTO_USDA, juntarComplemento, juntarMacros, MACROS_USDA, type AlimentoTaco } from './complementoUsda.ts'
import { motivoParaNaoSugerir } from './sugestaoDoProprio.ts'
import type { Alimento, BuscarAlimento, Sexo } from './tipos.ts'

// O JSON importado é tipado pelo TypeScript de forma ampla (string em vez de união de chaves);
// a forma exata é garantida pelo script de importação e por src/data/alimentos.test.ts.
// A TACO fica como está; o complemento do USDA entra aqui, ao carregar (spec vitaminas-usda, D-303).
// Os macros do USDA entram depois, só onde a TACO é nula (spec alimentos-e-gramaturas, D-380).
export const ALIMENTOS: readonly Alimento[] = juntarMacros(
  juntarComplemento(tabelaAlimentos.alimentos as unknown as readonly AlimentoTaco[], COMPLEMENTO_USDA),
  MACROS_USDA,
)

export const FONTE_ALIMENTOS = tabelaAlimentos.fonte

const alimentosPorId = new Map<number, Alimento>(ALIMENTOS.map((a) => [a.id, a]))

/** Produtos cadastrados pelo rótulo, registrados pela interface ao abrir o app. */
const extras = new Map<number, Alimento>()

export function registrarProdutos(lista: readonly Alimento[]): void {
  extras.clear()
  for (const a of lista) extras.set(a.id, a)
  esquecerListas()
}

/**
 * A base ampliada (spec base-ampliada, D-710): chega sob demanda, e a interface a registra aqui. Até lá (e nos testes que
 * não a registram), as listas são as de antes.
 */
let ampliada: readonly Alimento[] = []
const ampliadaPorId = new Map<number, Alimento>()

export function registrarBaseAmpliada(lista: readonly Alimento[]): void {
  ampliada = lista
  ampliadaPorId.clear()
  for (const a of lista) ampliadaPorId.set(a.id, a)
  esquecerListas()
}

function esquecerListas(): void {
  comProdutos = null
  paraSugerir = null
  daBase = null
}

/**
 * A mesma lista enquanto os produtos não mudam. A identidade importa: o índice da
 * busca é guardado por array, então devolver uma cópia nova a cada chamada fazia
 * o sistema reindexar os 597 alimentos a cada tecla digitada.
 */
let comProdutos: readonly Alimento[] | null = null

/** A tabela, os produtos cadastrados e a base ampliada; a busca usa esta lista. */
export function alimentosComProdutos(): readonly Alimento[] {
  if (extras.size === 0 && ampliada.length === 0) return ALIMENTOS
  comProdutos ??= [...ALIMENTOS, ...extras.values(), ...ampliada]
  return comProdutos
}

let daBase: readonly Alimento[] | null = null

/** A Base MetaNutri inteira: a TACO e a base ampliada, sem os alimentos próprios (a Tabela de alimentos, D-385). */
export function alimentosDaBase(): readonly Alimento[] {
  if (ampliada.length === 0) return ALIMENTOS
  daBase ??= [...ALIMENTOS, ...ampliada]
  return daBase
}

export const buscarAlimento: BuscarAlimento = (id) => alimentosPorId.get(id) ?? extras.get(id) ?? ampliadaPorId.get(id)

/**
 * D-386 (spec alimentos-e-gramaturas): o alimento próprio entra nas sugestões automáticas (Cobrir e trocas da folha) só
 * com "Pode aparecer no Cobrir e nas trocas" ligado, com energia, fora do grupo "Suplementos", sem o aviso de energia
 * incoerente e sem um motivo da regra do alimento próprio (D-493: gordura trans, industrializado, açúcar, nome livre),
 * que vale também para o item gravado antes dela. O nutriente pedido e a forma de ingrediente são conferidos por quem
 * sugere; a regra "nunca" não se desliga.
 */
export function proprioPodeSerSugerido(a: Alimento): boolean {
  return a.proprio !== undefined && a.proprio.sugerir && !a.proprio.energiaIncoerente && a.nutrientes.energia_kcal !== null && motivoParaNaoSugerir(a) === null
}

let paraSugerir: readonly Alimento[] | null = null

/**
 * A base, os alimentos próprios que podem ser sugeridos (D-386) e, da base ampliada, só os que a curadoria marcou
 * `sugerivel` (spec base-ampliada, D-716; a regra prescritível vale depois, para todos). A mesma lista enquanto nada muda.
 */
export function alimentosParaSugerir(): readonly Alimento[] {
  if (extras.size === 0 && ampliada.length === 0) return ALIMENTOS
  paraSugerir ??= [...ALIMENTOS, ...[...extras.values()].filter(proprioPodeSerSugerido), ...ampliada.filter((a) => a.ampliada?.sugerivel === true)]
  return paraSugerir
}

export type CampoDri = 'ear' | 'rda' | 'ai' | 'ul'

export interface ValorDri {
  readonly ear: number | null
  readonly rda: number | null
  readonly ai: number | null
  readonly ul: number | null
}

export type EscopoUl = 'total' | 'sintetica' | 'farmacologico' | 'vitamina-a-pre-formada'

export interface NutrienteDri {
  readonly rotulo: string
  readonly unidade: string
  readonly ul: { readonly escopo: EscopoUl; readonly nota: string | null }
}

export interface EstagioDri {
  readonly id: string
  readonly sexo: Sexo | null
  readonly gestante: boolean
  readonly lactante: boolean
  readonly idadeMin: number
  readonly idadeMax: number | null
}

export interface FaixaAmdr {
  readonly id: string
  readonly idadeMin: number
  readonly idadeMax: number | null
  readonly gordura_pct: { readonly min: number; readonly max: number }
  readonly carboidrato_pct: { readonly min: number; readonly max: number }
  readonly proteina_pct: { readonly min: number; readonly max: number }
}

export interface TabelaDri {
  readonly fonte: { readonly nome: string; readonly publicacao: string; readonly url: string; readonly baixadoEm: string }
  readonly nutrientes: Readonly<Record<string, NutrienteDri>>
  readonly estagios: readonly EstagioDri[]
  readonly valores: Readonly<Record<string, Readonly<Record<string, ValorDri>>>>
  readonly sodioCdrr: readonly { readonly idadeMin: number; readonly idadeMax: number | null; readonly valor: number }[]
  readonly amdr: readonly FaixaAmdr[]
}

// Mesma observação do cast acima: a forma é conferida em src/data/dri.test.ts.
export const DRI: TabelaDri = tabelaDri as unknown as TabelaDri

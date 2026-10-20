// Complemento do USDA FoodData Central para o que a TACO não traz (spec vitaminas-usda, D-300 a D-303).
// O arquivo é gerado por scripts/dados/importar-usda.mjs; aqui ele só é juntado aos alimentos ao carregar.
import complemento from '../data/complemento-usda.json'
import type { Alimento, ChaveNutrienteAlimento, OrigemUsda } from './tipos.ts'

/** As seis chaves do complemento, na ordem da ficha do alimento (D-308). */
export const CHAVES_USDA = [
  'vitamina_d_mcg',
  'vitamina_e_mg',
  'folato_dfe_mcg',
  'vitamina_b12_mcg',
  'selenio_mcg',
  'gordura_trans_g',
] as const satisfies readonly ChaveNutrienteAlimento[]

export type ChaveUsda = (typeof CHAVES_USDA)[number]

/** Alimento como está no `alimentos.json`: sem as chaves do complemento. */
export type AlimentoTaco = Omit<Alimento, 'nutrientes' | 'usda'> & {
  readonly nutrientes: Readonly<Record<Exclude<ChaveNutrienteAlimento, ChaveUsda>, number | null>>
}

export interface ItemComplementoUsda {
  /** Id do alimento na TACO. */
  readonly id: number
  readonly fdcId: number
  readonly conjunto: string
  readonly versao: string
  readonly confianca: string
  readonly valores: Readonly<Record<ChaveUsda, number | null>>
  readonly ajuste?: { readonly fator: number; readonly base: string }
}

export interface ConjuntoUsda {
  readonly nome: string
  readonly versao: string
  readonly arquivo: string
  readonly url: string
  readonly sha256: string
}

export interface FonteUsda {
  readonly nome: string
  readonly autor: string
  readonly citacao: string
  readonly licenca: string
  readonly url: string
  readonly baixadoEm: string
  readonly base: string
  readonly conjuntos: readonly ConjuntoUsda[]
  readonly criterio: string
}

export interface ComplementoUsda {
  readonly fonte: FonteUsda
  readonly nutrientes: readonly { readonly chave: ChaveUsda; readonly unidade: string; readonly rotulo: string }[]
  readonly alimentos: readonly ItemComplementoUsda[]
}

// O JSON importado é tipado de forma ampla; a forma exata é conferida em src/data/complemento-usda.test.ts.
export const COMPLEMENTO_USDA: ComplementoUsda = complemento as unknown as ComplementoUsda

export const FONTE_USDA: FonteUsda = COMPLEMENTO_USDA.fonte

const NULOS: Readonly<Record<ChaveUsda, null>> = Object.fromEntries(CHAVES_USDA.map((c) => [c, null])) as Record<ChaveUsda, null>

/**
 * Cada alimento ganha as seis chaves: os valores do equivalente, ou nulo quando não há equivalente (D-303).
 * O que é da TACO não muda; a origem só existe no alimento que tem equivalente.
 */
export function juntarComplemento(alimentos: readonly AlimentoTaco[], dados: Pick<ComplementoUsda, 'alimentos'>): readonly Alimento[] {
  const porId = new Map(dados.alimentos.map((i) => [i.id, i]))
  return alimentos.map((a): Alimento => {
    const item = porId.get(a.id)
    if (!item) return { ...a, nutrientes: { ...a.nutrientes, ...NULOS } }
    const usda: OrigemUsda = { fdcId: item.fdcId, conjunto: item.conjunto, versao: item.versao }
    return { ...a, nutrientes: { ...a.nutrientes, ...NULOS, ...item.valores }, usda }
  })
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2018-04" vira "abril de 2018"; versão fora do formato fica como veio. */
export function mesDaVersao(versao: string): string {
  const [ano, mes] = versao.split('-')
  const nomeDoMes = MESES[Number(mes) - 1]
  return nomeDoMes && ano ? `${nomeDoMes} de ${ano}` : versao
}

/** "SR Legacy, abril de 2018": o conjunto e o mês da versão, para a ficha do alimento (CA-960). */
export function descreverOrigemUsda(origem: OrigemUsda): string {
  return `${origem.conjunto}, ${mesDaVersao(origem.versao)}`
}

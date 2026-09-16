// Acesso tipado às tabelas geradas em src/data (TACO e DRI).
import tabelaAlimentos from '../data/alimentos.json'
import tabelaDri from '../data/dri.json'
import type { Alimento, BuscarAlimento, Sexo } from './tipos.ts'

// O JSON importado é tipado pelo TypeScript de forma ampla (string em vez de união de chaves);
// a forma exata é garantida pelo script de importação e por src/data/alimentos.test.ts.
export const ALIMENTOS: readonly Alimento[] = tabelaAlimentos.alimentos as unknown as readonly Alimento[]

export const FONTE_ALIMENTOS = tabelaAlimentos.fonte

const alimentosPorId = new Map<number, Alimento>(ALIMENTOS.map((a) => [a.id, a]))

export const buscarAlimento: BuscarAlimento = (id) => alimentosPorId.get(id)

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

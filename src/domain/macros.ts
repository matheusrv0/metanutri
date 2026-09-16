// Distribuição de macronutrientes (SPEC CA-22, CA-23, CA-24, CA-31a).
import { DRI } from './tabelas.ts'
import type { FaixaAmdr } from './tabelas.ts'
import type { Totais } from './totais.ts'
import type { MetaGKg, MetaPct, MetasMacros } from './tipos.ts'

/** Fatores de Atwater (kcal por grama). */
export const KCAL_POR_GRAMA = { proteina: 4, carboidrato: 4, gordura: 9 } as const

/** Casas decimais consideradas ao comparar com os limites, para não reprovar 19,99999999% como abaixo de 20%. */
const PRECISAO = 1e6

export type EstadoFaixa = 'abaixo' | 'dentro' | 'acima'

export type { MetaGKg, MetaPct, MetasMacros } from './tipos.ts'

export interface ResultadoMacro {
  readonly gramas: number
  /** % das kcal do plano; `null` se o plano não tem energia. */
  readonly pctKcal: number | null
  /** g por kg de peso; `null` sem peso. */
  readonly gPorKg: number | null
  /** Meta aplicada; `null` quando não há meta do usuário nem faixa etária para a AMDR. */
  readonly meta: MetaPct | MetaGKg | null
  readonly origemMeta: 'amdr' | 'usuario' | null
  readonly estado: EstadoFaixa | null
}

export interface ResultadoMacros {
  readonly kcal: number
  /** Faixa AMDR usada (`1-3`, `4-18`, `adulto`) ou `null` sem idade. */
  readonly faixa: string | null
  readonly proteina: ResultadoMacro
  readonly carboidrato: ResultadoMacro
  readonly gordura: ResultadoMacro
}

export function faixaAmdr(idadeAnos: number | null): FaixaAmdr | null {
  if (idadeAnos === null) return null
  return DRI.amdr.find((f) => idadeAnos >= f.idadeMin && (f.idadeMax === null || idadeAnos <= f.idadeMax)) ?? null
}

const arredondar = (v: number) => Math.round(v * PRECISAO) / PRECISAO

function estado(valor: number | null, meta: MetaPct | MetaGKg | null): EstadoFaixa | null {
  if (valor === null || meta === null) return null
  const v = arredondar(valor)
  if (v < meta.min) return 'abaixo'
  if (v > meta.max) return 'acima'
  return 'dentro'
}

function macro(
  gramas: number,
  kcalPorGrama: number,
  kcal: number,
  pesoKg: number | null,
  metaUsuario: MetaPct | MetaGKg | undefined,
  metaAmdr: MetaPct | null,
): ResultadoMacro {
  const pctKcal = kcal > 0 ? ((gramas * kcalPorGrama) / kcal) * 100 : null
  const gPorKg = pesoKg !== null && pesoKg > 0 ? gramas / pesoKg : null
  const meta = metaUsuario ?? metaAmdr
  const origemMeta = metaUsuario ? 'usuario' : metaAmdr ? 'amdr' : null
  const valorComparado = meta?.tipo === 'g_kg' ? gPorKg : pctKcal
  return { gramas, pctKcal, gPorKg, meta, origemMeta, estado: estado(valorComparado, meta) }
}

export function calcularMacros(
  totais: Totais,
  caso: { readonly idadeAnos: number | null; readonly pesoKg: number | null },
  metas: MetasMacros = {},
): ResultadoMacros {
  const kcal = totais.nutrientes.energia_kcal.total
  const faixa = faixaAmdr(caso.idadeAnos)
  const pct = (f: { readonly min: number; readonly max: number } | undefined): MetaPct | null =>
    f ? { tipo: 'pct', min: f.min, max: f.max } : null

  return {
    kcal,
    faixa: faixa?.id ?? null,
    proteina: macro(totais.nutrientes.proteina_g.total, KCAL_POR_GRAMA.proteina, kcal, caso.pesoKg, metas.proteina, pct(faixa?.proteina_pct)),
    carboidrato: macro(totais.nutrientes.carboidrato_g.total, KCAL_POR_GRAMA.carboidrato, kcal, caso.pesoKg, metas.carboidrato, pct(faixa?.carboidrato_pct)),
    gordura: macro(totais.nutrientes.lipideos_g.total, KCAL_POR_GRAMA.gordura, kcal, caso.pesoKg, metas.gordura, pct(faixa?.gordura_pct)),
  }
}

// Quanto de um alimento a tabela realmente sabe. Escolher sabendo é diferente de descobrir depois.
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

/**
 * Os nutrientes cobrados na adequação. Açúcares e gordura saturada ficam de fora
 * porque a TACO não os traz para alimento nenhum: cobrá-los puniria todos por igual.
 */
export const NUTRIENTES_CONFERIDOS: readonly ChaveNutrienteAlimento[] = [
  'energia_kcal',
  'proteina_g',
  'lipideos_g',
  'carboidrato_g',
  'fibra_g',
  'calcio_mg',
  'magnesio_mg',
  'manganes_mg',
  'fosforo_mg',
  'ferro_mg',
  'sodio_mg',
  'potassio_mg',
  'cobre_mg',
  'zinco_mg',
  'vitamina_a_rae_mcg',
  'tiamina_mg',
  'riboflavina_mg',
  'piridoxina_mg',
  'niacina_mg',
  'vitamina_c_mg',
]

export type NivelCompletude = 'completo' | 'parcial' | 'minimo'

export interface Completude {
  readonly nivel: NivelCompletude
  readonly preenchidos: number
  readonly total: number
  /** Nomes curtos do que falta, para explicar sem despejar a lista inteira. */
  readonly faltando: readonly ChaveNutrienteAlimento[]
  /** Sem energia não dá para somar o dia: é a falta que mais atrapalha. */
  readonly semEnergia: boolean
}

const ROTULOS: Readonly<Partial<Record<ChaveNutrienteAlimento, string>>> = {
  energia_kcal: 'energia',
  proteina_g: 'proteína',
  lipideos_g: 'gordura',
  carboidrato_g: 'carboidrato',
  fibra_g: 'fibra',
  calcio_mg: 'cálcio',
  magnesio_mg: 'magnésio',
  manganes_mg: 'manganês',
  fosforo_mg: 'fósforo',
  ferro_mg: 'ferro',
  sodio_mg: 'sódio',
  potassio_mg: 'potássio',
  cobre_mg: 'cobre',
  zinco_mg: 'zinco',
  vitamina_a_rae_mcg: 'vitamina A',
  tiamina_mg: 'tiamina',
  riboflavina_mg: 'riboflavina',
  piridoxina_mg: 'piridoxina',
  niacina_mg: 'niacina',
  vitamina_c_mg: 'vitamina C',
}

export const nomeDoNutriente = (chave: ChaveNutrienteAlimento): string => ROTULOS[chave] ?? chave

/**
 * Traço (`Tr`) conta como dado: a tabela mediu e achou quantidade desprezível.
 * `null` é o que ninguém mediu.
 */
export function completudeDe(alimento: Alimento): Completude {
  const faltando = NUTRIENTES_CONFERIDOS.filter((c) => alimento.nutrientes[c] === null && !alimento.tracos.includes(c))
  const total = NUTRIENTES_CONFERIDOS.length
  const preenchidos = total - faltando.length
  const proporcao = preenchidos / total
  const nivel: NivelCompletude = faltando.length === 0 ? 'completo' : proporcao >= 0.7 ? 'parcial' : 'minimo'
  return { nivel, preenchidos, total, faltando, semEnergia: faltando.includes('energia_kcal') }
}

/** Frase pronta para o title do elemento; `null` quando não falta nada. */
export function explicarCompletude(alimento: Alimento): string | null {
  const c = completudeDe(alimento)
  if (c.nivel === 'completo') return null
  const primeiros = c.faltando.slice(0, 4).map(nomeDoNutriente).join(', ')
  const resto = c.faltando.length > 4 ? ` e mais ${c.faltando.length - 4}` : ''
  return `A tabela de composição traz ${c.preenchidos} dos ${c.total} nutrientes deste alimento. Falta: ${primeiros}${resto}.`
}

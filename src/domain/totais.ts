// Totais de nutrientes de uma lista de itens e do plano (SPEC CA-32, CA-43, CB-04, CB-05).
import { ehItemDeReceita, ingredientesNaQuantidade, receitaDoItem } from './receitaNoPlano.ts'
import type { BuscarAlimento, ChaveNutrienteAlimento, ItemPlano, Plano } from './tipos.ts'

export const CHAVES_NUTRIENTES: readonly ChaveNutrienteAlimento[] = [
  'energia_kcal',
  'proteina_g',
  'lipideos_g',
  'carboidrato_g',
  'acucares_g',
  'gordura_saturada_g',
  'fibra_g',
  'colesterol_mg',
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

export interface TotalNutriente {
  /** Soma dos alimentos que têm o dado. */
  readonly total: number
  /** Quantos alimentos (com quantidade > 0) não têm dado para este nutriente. */
  readonly semDado: number
}

export interface Totais {
  /** Itens com quantidade maior que zero. */
  readonly itens: number
  readonly nutrientes: Readonly<Record<ChaveNutrienteAlimento, TotalNutriente>>
}

export function totaisDeItens(itens: readonly ItemPlano[], buscar: BuscarAlimento): Totais {
  const total = Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, 0])) as Record<ChaveNutrienteAlimento, number>
  const semDado = Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, 0])) as Record<ChaveNutrienteAlimento, number>
  let contados = 0

  for (const item of itens) {
    if (item.gramas < 0 || !Number.isFinite(item.gramas)) {
      throw new RangeError(`Quantidade inválida (${item.gramas} g) no item ${item.id}.`)
    }
    if (item.gramas === 0) continue
    // Spec receitas-com-calculo: a receita soma pelos ingredientes, na quantidade servida (CA-874). Ingrediente sem o
    // nutriente, que não existe mais ou cópia estragada contam como sem dado, nunca como zero (D-275, CB-271, CB-273).
    if (ehItemDeReceita(item)) {
      contados++
      const receita = receitaDoItem(item)
      if (receita === null) {
        for (const chave of CHAVES_NUTRIENTES) semDado[chave]++
        continue
      }
      for (const ingrediente of ingredientesNaQuantidade(receita, item.gramas)) {
        if (!(ingrediente.gramas > 0)) continue
        const alimento = buscar(ingrediente.alimentoId)
        for (const chave of CHAVES_NUTRIENTES) {
          // D-248 (revisao-geral-trabalho): o que não é número (produto apagado, nutriente que falta) é falta de dado.
          const valor = alimento?.nutrientes[chave]
          if (typeof valor !== 'number') semDado[chave]++
          else total[chave] += (valor * ingrediente.gramas) / 100
        }
      }
      continue
    }
    // D-248 (spec revisao-geral-trabalho): o produto apagado em "Meus produtos" (ou o alimento que saiu da base) continua
    // no plano e conta como falta de dado em tudo; o nutriente que o alimento não traz também. Nunca zero, nunca NaN.
    const alimento = buscar(item.alimentoId)
    contados++
    const fator = item.gramas / 100
    for (const chave of CHAVES_NUTRIENTES) {
      const valor = alimento?.nutrientes[chave]
      if (typeof valor !== 'number') semDado[chave]++
      else total[chave] += valor * fator
    }
  }

  const nutrientes = Object.fromEntries(
    CHAVES_NUTRIENTES.map((k) => [k, { total: total[k], semDado: semDado[k] }]),
  ) as Record<ChaveNutrienteAlimento, TotalNutriente>

  return { itens: contados, nutrientes }
}

/** Soma apenas a opção Principal de cada refeição (SPEC D-2). */
export function totaisDoPlano(plano: Plano, buscar: BuscarAlimento): Totais {
  return totaisDeItens(
    plano.refeicoes.flatMap((r) => r.opcoes.principal),
    buscar,
  )
}

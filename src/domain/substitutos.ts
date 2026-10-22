// Porção equivalente de um substituto (SPEC CA-41, CA-42).
import { medidaParaMostrar, medidasDoAlimento, type MedidaEquivalente } from './busca.ts'
import type { BuscarAlimento, ChaveNutrienteAlimento, MedidaDoItem } from './tipos.ts'

export type CriterioEquivalencia = 'kcal' | 'proteina' | 'carboidrato'

const CHAVE_DO_CRITERIO: Readonly<Record<CriterioEquivalencia, ChaveNutrienteAlimento>> = {
  kcal: 'energia_kcal',
  proteina: 'proteina_g',
  carboidrato: 'carboidrato_g',
}

const NOME_DO_CRITERIO: Readonly<Record<CriterioEquivalencia, string>> = {
  kcal: 'energia',
  proteina: 'proteína',
  carboidrato: 'carboidrato',
}

const MACROS = ['energia_kcal', 'proteina_g', 'carboidrato_g', 'lipideos_g'] as const
type Macro = (typeof MACROS)[number]

export interface ResultadoSubstituto {
  /** Porção do substituto em gramas inteiras; `null` quando não dá para calcular. */
  readonly gramas: number | null
  /** A mesma porção na medida caseira mais legível, quando houver (CA-42). */
  readonly medida: MedidaEquivalente | null
  /** A medida que o item guarda ao entrar no plano (spec alimentos-e-gramaturas, G1 e D-379); `null` sem medida. */
  readonly medidaDoItem: MedidaDoItem | null
  /** Substituto − original, na porção calculada. Zeros quando não há cálculo. */
  readonly diferencas: Readonly<Record<Macro, number>>
  readonly motivoSemCalculo: string | null
}

export function calcularSubstituto(
  original: { readonly alimentoId: number; readonly gramas: number },
  substitutoId: number,
  criterio: CriterioEquivalencia,
  buscar: BuscarAlimento,
): ResultadoSubstituto {
  const a = buscar(original.alimentoId)
  const b = buscar(substitutoId)
  if (!a) throw new Error(`Alimento ${original.alimentoId} não existe na tabela.`)
  if (!b) throw new Error(`Alimento ${substitutoId} não existe na tabela.`)

  const zeros = { energia_kcal: 0, proteina_g: 0, carboidrato_g: 0, lipideos_g: 0 }
  const chave = CHAVE_DO_CRITERIO[criterio]
  const nome = NOME_DO_CRITERIO[criterio]
  const semCalculo = (motivo: string): ResultadoSubstituto => ({ gramas: null, medida: null, medidaDoItem: null, diferencas: zeros, motivoSemCalculo: motivo })

  if (original.gramas === 0) return { gramas: 0, medida: null, medidaDoItem: null, diferencas: zeros, motivoSemCalculo: null }

  const porCemOriginal = a.nutrientes[chave]
  const porCemSubstituto = b.nutrientes[chave]
  if (porCemOriginal === null || porCemOriginal <= 0) {
    return semCalculo(`O alimento original não tem ${nome} na tabela; escolha outro critério.`)
  }
  if (porCemSubstituto === null || porCemSubstituto <= 0) {
    return semCalculo(`${b.descricao} não tem ${nome} na tabela; escolha outro critério ou outro alimento.`)
  }

  const equivalentes = Math.round((porCemOriginal * original.gramas) / porCemSubstituto)
  // G8 e D-379 (spec alimentos-e-gramaturas): a porção é a meia medida caseira mais perto dos gramas equivalentes, e as
  // diferenças são calculadas sobre ela. Sem medida que sirva, os gramas inteiros.
  const medida = medidaParaMostrar(substitutoId, equivalentes)
  const peso = medida ? medidasDoAlimento(substitutoId).find((m) => m.nome === medida.medida)?.gramas : undefined
  const medidaDoItem: MedidaDoItem | null = medida && peso ? { nome: medida.medida, quantidade: medida.quantidade, gramasPorMedida: peso } : null
  const gramas = medidaDoItem ? Math.round(medidaDoItem.quantidade * medidaDoItem.gramasPorMedida * 10) / 10 : equivalentes
  const valor = (porCem: number | null, g: number) => ((porCem ?? 0) * g) / 100
  const diferencas = Object.fromEntries(
    MACROS.map((m) => [m, valor(b.nutrientes[m], gramas) - valor(a.nutrientes[m], original.gramas)]),
  ) as Record<Macro, number>

  return { gramas, medida, medidaDoItem, diferencas, motivoSemCalculo: null }
}

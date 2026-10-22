// A quantidade que a paciente lê na folha, no link e no Word (spec conduta-da-nutricionista, D-297; spec
// alimentos-e-gramaturas, D-376 a D-378).
//
// A nutricionista escolhe, por plano: "Medida e gramas" (o padrão de plano novo: "1 concha e meia (210 g)"), "Só
// medida" (`medida-caseira`: "1 concha e meia") ou "Só gramas" (`gramas`: "210 g"). A medida é a que ela escolheu no
// item (G1); sem escolha, a automática de antes (`medidaParaMostrar`: ponta de faca, gordura nunca em fatia, até 4
// pedaços). Medida escolhida que não fecha em meia medida sai "190 g (cerca de 1 concha e meia)". Líquido sai em ml.
import { medidaNaLinha } from './medidaDoItem.ts'
import { unidadeDo, type UnidadeDoAlimento } from './liquido.ts'
import { buscarAlimento } from './tabelas.ts'
import type { MedidaDoItem, ModoQuantidade } from './tipos.ts'

export interface QuantidadeNaFolha {
  /** A medida caseira ("1 unidade e meia"); nula em "Só gramas" ou quando nenhuma serve: aí sai só o peso. */
  readonly medida: string | null
  /** O peso prescrito, em gramas (ou ml, com densidade 1). */
  readonly gramas: number
  readonly unidade: UnidadeDoAlimento
  /** A medida (escolhida ou automática) fica a mais de 5% dos gramas: o peso vem primeiro, e a medida, "cerca de" (D-434). */
  readonly aproximada: boolean
  /** "Medida e gramas": o peso vai entre parênteses depois da medida. */
  readonly comPeso: boolean
}

/**
 * A quantidade de um alimento para a paciente: na refeição, na lista de compras, nas trocas, no link e no Word.
 * `medida` é a do item (G1): objeto, `null` (só gramas) ou nada (a automática).
 */
export function quantidadeNaFolha(
  alimentoId: number,
  gramas: number,
  modo: ModoQuantidade = 'medida-caseira',
  medida?: MedidaDoItem | null,
): QuantidadeNaFolha {
  const unidade = unidadeDo(buscarAlimento(alimentoId))
  const daLinha = modo === 'gramas' ? null : medidaNaLinha({ alimentoId, gramas, ...(medida === undefined ? {} : { medida }) })
  return {
    medida: daLinha?.texto ?? null,
    gramas,
    unidade,
    aproximada: daLinha?.aproximada === true,
    comPeso: modo === 'medida-e-gramas',
  }
}

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** "210 g", "1.000 ml". */
export const textoDoPeso = (gramas: number, unidade: UnidadeDoAlimento): string => `${inteiro.format(gramas)} ${unidade}`

/**
 * O texto que a paciente lê, igual em todo lugar: "1 concha e meia (210 g)", "1 concha e meia", "210 g" e, com a medida
 * escolhida que não fecha, "190 g (cerca de 1 concha e meia)".
 */
export function textoDaQuantidade(q: QuantidadeNaFolha): string {
  const peso = textoDoPeso(q.gramas, q.unidade)
  if (q.medida === null) return peso
  if (q.aproximada) return `${peso} (cerca de ${q.medida})`
  return q.comPeso ? `${q.medida} (${peso})` : q.medida
}

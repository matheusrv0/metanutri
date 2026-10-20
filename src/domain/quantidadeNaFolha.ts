// A quantidade que a paciente lê na folha, no link e no Word (spec conduta-da-nutricionista, D-297).
//
// A nutricionista escolhe, por plano: "Gramas" mostra só o peso; "Medida caseira" mostra só a medida caseira para a
// paciente (`medidaParaMostrar`, a mesma do planejador desde a D-242 da revisao-geral-trabalho: manteiga e margarina em
// "ponta de faca" quando ela serve, gordura nunca em fatia, e outra medida de até 4 pedaços quando ela serve, D-295), e
// o peso só quando o alimento não tem medida que sirva. Substitui o D-183 e o D-189 da impressao-do-plano (o peso ao
// lado da medida vaga e "mais de 4 pedaços vira peso").
import { medidaParaMostrar } from './busca.ts'
import type { ModoQuantidade } from './tipos.ts'

export interface QuantidadeNaFolha {
  /** A medida caseira ("1 unidade e meia"); nula em "Gramas" ou quando nenhuma serve: aí sai só o peso. */
  readonly medida: string | null
  /** O peso prescrito, em gramas. */
  readonly gramas: number
}

/** A quantidade de um alimento para a paciente: na refeição, na lista de compras, nas trocas, no link e no Word. */
export function quantidadeNaFolha(alimentoId: number, gramas: number, modo: ModoQuantidade = 'medida-caseira'): QuantidadeNaFolha {
  if (modo === 'gramas') return { medida: null, gramas }
  return { medida: medidaParaMostrar(alimentoId, gramas)?.texto ?? null, gramas }
}

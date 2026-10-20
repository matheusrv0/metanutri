// A quantidade que a paciente lê na folha, no link e no Word (spec conduta-da-nutricionista, D-297).
//
// A nutricionista escolhe, por plano: "Gramas" mostra só o peso; "Medida caseira" mostra só a medida caseira para a
// paciente (a do planejador, ou outra de até 4 pedaços quando ela serve, D-295), com a manteiga e a margarina em "ponta
// de faca" quando ela serve (CA-642 da impressao-do-plano), e o peso só quando o alimento não tem medida que sirva.
// Substitui o D-183 e o D-189 da impressao-do-plano (o peso ao lado da medida vaga e "mais de 4 pedaços vira peso").
import { medidaCaseiraParaPaciente, medidasDoAlimento } from './busca.ts'
import type { ModoQuantidade } from './tipos.ts'

export interface QuantidadeNaFolha {
  /** A medida caseira ("1 unidade e meia"); nula em "Gramas" ou quando nenhuma serve: aí sai só o peso. */
  readonly medida: string | null
  /** O peso prescrito, em gramas. */
  readonly gramas: number
}

const PONTA_DE_FACA = 'ponta de faca'
const MAXIMO_DE_PONTAS = 3
const ERRO_MAXIMO = 0.15

/** "meia ponta de faca", "1 ponta de faca e meia", "2 pontas de faca". */
function pontasDeFaca(quantidade: number): string {
  const inteiro = Math.floor(quantidade)
  const meia = quantidade - inteiro === 0.5
  if (inteiro === 0) return 'meia ponta de faca'
  const nome = inteiro >= 2 ? 'pontas de faca' : 'ponta de faca'
  return meia ? `${inteiro} ${nome} e meia` : `${inteiro} ${nome}`
}

/** CA-642: manteiga e margarina em ponta de faca, quando a base tem essa medida e ela fica dentro de 15% do peso. */
function emPontaDeFaca(alimentoId: number, gramas: number): string | null {
  const ponta = medidasDoAlimento(alimentoId).find((m) => m.nome === PONTA_DE_FACA)
  if (!ponta || !(gramas > 0)) return null
  const quantidade = Math.max(0.5, Math.round((gramas / ponta.gramas) * 2) / 2)
  if (quantidade > MAXIMO_DE_PONTAS) return null
  return Math.abs(quantidade * ponta.gramas - gramas) / gramas <= ERRO_MAXIMO ? pontasDeFaca(quantidade) : null
}

/** A quantidade de um alimento para a paciente: na refeição, na lista de compras, nas trocas, no link e no Word. */
export function quantidadeNaFolha(alimentoId: number, gramas: number, modo: ModoQuantidade = 'medida-caseira'): QuantidadeNaFolha {
  if (modo === 'gramas') return { medida: null, gramas }
  const medida = emPontaDeFaca(alimentoId, gramas) ?? medidaCaseiraParaPaciente(alimentoId, gramas)?.texto ?? null
  return { medida, gramas }
}

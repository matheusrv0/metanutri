// "Meu plano" com as regras da folha impressa (spec revisao-geral-publica, D-231; resolve o R-182 da impressao-do-plano).
//
// A cópia guardada no link tem o nome da tabela; o desenho, na hora, usa o nome para o paciente e a quantidade da folha
// na escolha do plano (spec conduta-da-nutricionista, D-297; a cópia diz "Gramas" pelo campo `quantidades`, D-319 da
// integracao-rodada-1910). Assim uma cópia antiga, feita com a medida do planejador, também sai como a folha. A cópia
// não tem o id do alimento; ele é achado pela descrição guardada, que é a descrição exata da base (as 597 são únicas).
// O item de receita vem marcado e não passa pela procura (D-310 da integracao-rodada-1910).
import type { ItemDaDieta } from './dietaDoLink.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { quantidadeNaFolha, type QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento, ModoQuantidade } from './tipos.ts'

export interface ItemParaPaciente {
  readonly nome: string
  readonly quantidade: QuantidadeNaFolha
}

const PELA_DESCRICAO = new Map<string, Alimento>(ALIMENTOS.map((a) => [a.descricao, a]))

/**
 * O que o paciente lê de um item da cópia, na escolha de quantidade do plano. Achou o alimento da base: o nome e a
 * quantidade da folha impressa. Não achou (produto do nutricionista, nome que a base mudou) ou é receita: o nome guardado
 * e a medida guardada; sem ela, ou em "Gramas", o peso (CA-750).
 */
export function paraOPaciente(item: ItemDaDieta, modo: ModoQuantidade = 'medida-caseira'): ItemParaPaciente {
  const comoGuardado = { medida: modo === 'gramas' ? null : item.medida, gramas: item.gramas }
  // Item de receita (spec integracao-rodada-1910, D-310): o nome da receita e a porção, como a folha impressa
  // (receitas-com-calculo, CA-879). Nunca é procurado na base: "Feijoada" também é um prato da TACO.
  if (item.receita) return { nome: item.alimento, quantidade: comoGuardado }
  const alimento = PELA_DESCRICAO.get(item.alimento)
  if (!alimento) return { nome: item.alimento, quantidade: comoGuardado }
  return { nome: nomeParaPaciente(alimento), quantidade: quantidadeNaFolha(alimento.id, item.gramas, modo) }
}

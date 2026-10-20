// "Meu plano" com as regras da folha impressa (spec revisao-geral-publica, D-231; resolve o R-182 da impressao-do-plano).
//
// A cópia guardada no link não muda: ela continua com o nome da tabela e a medida do planejador (spec dieta-no-link,
// D-151), e a comparação "o plano mudou" continua entre ela e o plano. Só o desenho muda, na hora: o nome para o
// paciente e a quantidade da folha. A cópia não tem o id do alimento; ele é achado pela descrição guardada, que é a
// descrição exata da base (as 597 são únicas).
import type { ItemDaDieta } from './dietaDoLink.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { quantidadeNaFolha, type QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

export interface ItemParaPaciente {
  readonly nome: string
  readonly quantidade: QuantidadeNaFolha
}

const PELA_DESCRICAO = new Map<string, Alimento>(ALIMENTOS.map((a) => [a.descricao, a]))

/**
 * O que o paciente lê de um item da cópia. Achou o alimento da base: o nome e a quantidade da folha impressa. Não achou
 * (produto do nutricionista, "Alimento removido", nome que a base mudou): o nome guardado e a quantidade de antes, com o
 * peso ao lado da medida, porque sem o alimento não dá para saber se a medida é vaga (CA-750).
 */
export function paraOPaciente(item: ItemDaDieta): ItemParaPaciente {
  const alimento = PELA_DESCRICAO.get(item.alimento)
  if (!alimento) return { nome: item.alimento, quantidade: { medida: item.medida, gramas: item.gramas, comPeso: item.medida !== null } }
  return { nome: nomeParaPaciente(alimento), quantidade: quantidadeNaFolha(alimento.id, item.gramas, buscarAlimento) }
}

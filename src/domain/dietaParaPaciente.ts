// "Meu plano" com as regras da folha impressa (spec revisao-geral-publica, D-231; resolve o R-182 da impressao-do-plano).
//
// A cópia guardada no link tem o nome da tabela; o desenho, na hora, usa o nome para o paciente e a quantidade da folha
// na escolha do plano (spec conduta-da-nutricionista, D-297; a cópia diz "Gramas" pelo campo `quantidades`, D-319 da
// integracao-rodada-1910). Assim uma cópia antiga, feita com a medida do planejador, também sai como a folha. A cópia
// não tem o id do alimento; ele é achado pela descrição guardada, que é a descrição exata da base (as 597 são únicas).
// O item de receita vem marcado e não passa pela procura (D-310 da integracao-rodada-1910).
import type { DietaDoLink, ItemDaDieta } from './dietaDoLink.ts'
import { unidadeDo } from './liquido.ts'
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
  const alimento = item.receita ? undefined : PELA_DESCRICAO.get(item.alimento)
  const comoGuardado: QuantidadeNaFolha = {
    medida: modo === 'gramas' ? null : item.medida,
    gramas: item.gramas,
    unidade: item.unidade ?? unidadeDo(alimento),
    aproximada: modo !== 'gramas' && item.aproximada === true,
    comPeso: modo === 'medida-e-gramas',
  }
  // Item de receita (spec integracao-rodada-1910, D-310): o nome da receita e a porção, como a folha impressa
  // (receitas-com-calculo, CA-879). Nunca é procurado na base: "Feijoada" também é um prato da TACO.
  if (item.receita) return { nome: item.alimento, quantidade: comoGuardado }
  if (!alimento) return { nome: item.alimento, quantidade: comoGuardado }
  // G1 e D-377 (spec alimentos-e-gramaturas): a medida que a nutricionista escolheu vai como foi guardada.
  if (item.escolhida) return { nome: nomeParaPaciente(alimento), quantidade: comoGuardado }
  return { nome: nomeParaPaciente(alimento), quantidade: quantidadeNaFolha(alimento.id, item.gramas, modo) }
}

/** O alimento da base daria uma medida caseira hoje (em "Medida caseira"). */
const teriaMedida = (item: ItemDaDieta): boolean => {
  if (item.receita) return false
  const alimento = PELA_DESCRICAO.get(item.alimento)
  return alimento !== undefined && quantidadeNaFolha(alimento.id, item.gramas).medida !== null
}

/**
 * A escolha de quantidade da cópia (D-319 da integracao-rodada-1910). O campo `quantidades: 'gramas'` decide. Sem ele,
 * uma cópia com toda medida vazia (refeições e ingredientes) em que algum alimento da base teria medida hoje também é
 * "Gramas": foi gravada em "Gramas" e uma aba com a versão de antes apagou o campo ao regravar o link (CB-316).
 */
export function modoDaCopia(dieta: DietaDoLink): ModoQuantidade {
  if (dieta.quantidades === 'gramas' || dieta.quantidades === 'medida-e-gramas') return dieta.quantidades
  const itens = [...dieta.refeicoes.flatMap((r) => r.opcoes.flat()), ...(dieta.receitasDoPlano ?? []).flatMap((r) => r.ingredientes)]
  if (itens.length === 0 || itens.some((i) => i.medida !== null)) return 'medida-caseira'
  return itens.some(teriaMedida) ? 'gramas' : 'medida-caseira'
}

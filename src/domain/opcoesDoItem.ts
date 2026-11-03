// As opções de um item do plano (spec busca-substitutos, D-1114): outro alimento na porção equivalente, que o paciente
// lê com "ou" embaixo do item. O campo é opcional e vem de dado gravado: é lido sempre por aqui (CB-1101).
import { lerMedidaDoItem } from './medidaDoItem.ts'
import type { ItemPlano, OpcaoDoItem } from './tipos.ts'

/** No máximo 2 opções por item (o protótipo aprovado). */
export const MAXIMO_DE_OPCOES_DO_ITEM = 2

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function lerOpcao(v: unknown): OpcaoDoItem | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  const alimentoId = o['alimentoId']
  const gramas = o['gramas']
  if (!ehNumero(alimentoId) || !Number.isInteger(alimentoId) || !ehNumero(gramas) || gramas <= 0) return null
  // A medida estragada vira a automática, como no item (CB-363).
  const medida = lerMedidaDoItem(o['medida'])
  return { alimentoId, gramas, ...(medida === undefined ? {} : { medida }) }
}

/** CB-1101: as opções válidas do item, sem repetir alimento, no máximo 2; o item de antes, sem o campo, não tem. */
export function lerOpcoesDoItem(item: Pick<ItemPlano, 'opcoesDoItem'>): readonly OpcaoDoItem[] {
  const bruto: unknown = item.opcoesDoItem
  if (!Array.isArray(bruto)) return []
  const opcoes: OpcaoDoItem[] = []
  for (const v of bruto) {
    const opcao = lerOpcao(v)
    if (!opcao || opcoes.some((o) => o.alimentoId === opcao.alimentoId)) continue
    opcoes.push(opcao)
    if (opcoes.length === MAXIMO_DE_OPCOES_DO_ITEM) break
  }
  return opcoes
}

/** Se o alimento pode virar mais uma opção do item (CB-1106): o botão diz o porquê quando não pode. */
export type VagaParaOpcao = 'livre' | 'ja-e-opcao' | 'cheia' | 'e-o-item'

export function vagaParaOpcao(item: Pick<ItemPlano, 'alimentoId' | 'opcoesDoItem'>, alimentoId: number): VagaParaOpcao {
  if (item.alimentoId === alimentoId) return 'e-o-item'
  const opcoes = lerOpcoesDoItem(item)
  if (opcoes.some((o) => o.alimentoId === alimentoId)) return 'ja-e-opcao'
  return opcoes.length >= MAXIMO_DE_OPCOES_DO_ITEM ? 'cheia' : 'livre'
}

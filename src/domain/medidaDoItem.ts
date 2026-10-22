// A medida do item do plano (spec alimentos-e-gramaturas, G1 a G5 e D-374).
//
// O item guarda a medida escolhida (`medida`), `null` para "só gramas", ou nada (a medida automática de antes). Os
// gramas são a verdade da conta: a quantidade que se mostra sai deles, arredondada para meia medida. Quando a meia
// medida não fecha com os gramas, a medida é aproximada, e o peso prescrito não muda sozinho.
import { formatarQuantidadeMedida, medidaParaMostrar, medidasDoAlimento, PREFERENCIA_MEDIDAS, type MedidaCaseira } from './busca.ts'
import type { ItemPlano, MedidaDoItem } from './tipos.ts'

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/**
 * A medida guardada, lida com segurança (CB-363): um objeto com nome e peso válidos, `null` (só gramas) ou `undefined`
 * (sem escolha, ou estragada: vale a automática).
 */
export function lerMedidaDoItem(v: unknown): MedidaDoItem | null | undefined {
  if (v === null) return null
  if (typeof v !== 'object' || v === undefined) return undefined
  const o = v as Record<string, unknown>
  const nome = o['nome']
  const gramasPorMedida = o['gramasPorMedida']
  const quantidade = o['quantidade']
  if (typeof nome !== 'string' || nome.trim() === '' || !ehNumero(gramasPorMedida) || gramasPorMedida <= 0) return undefined
  return { nome: nome.trim(), gramasPorMedida, quantidade: ehNumero(quantidade) && quantidade >= 0 ? quantidade : 1 }
}

export interface MedidaNaLinha {
  readonly nome: string
  readonly gramasPorMedida: number
  /** Os gramas em meias medidas ("1 concha e meia" = 1,5). */
  readonly quantidade: number
  /** A meia medida não fecha com os gramas: diferença maior que 1 g e que 1% (D-374). */
  readonly aproximada: boolean
  /** Escolhida pela nutricionista (G1) ou a automática de antes (G5). */
  readonly origem: 'escolhida' | 'automatica'
  /** "1 concha e meia". */
  readonly texto: string
}

/** Meia medida mais perto dos gramas; com gramas, nunca menos que meia. */
export function emMeiasMedidas(gramas: number, gramasPorMedida: number): number {
  if (!(gramas > 0)) return 0
  return Math.max(0.5, Math.round((gramas / gramasPorMedida) * 2) / 2)
}

/** A meia medida fecha com os gramas (diferença de até 1 g ou 1%). */
export function fechaEmMeiaMedida(gramas: number, quantidade: number, gramasPorMedida: number): boolean {
  return Math.abs(quantidade * gramasPorMedida - gramas) <= Math.max(1, gramas * 0.01)
}

/**
 * A medida que a linha do plano mostra e que o paciente lê: a escolhida, ou a automática quando ninguém escolheu.
 * `null` quando o item é "só gramas" ou nenhuma medida serve.
 */
export function medidaNaLinha(item: Pick<ItemPlano, 'alimentoId' | 'gramas' | 'medida'>): MedidaNaLinha | null {
  const medida = lerMedidaDoItem(item.medida)
  if (medida === null) return null
  if (medida !== undefined) {
    const quantidade = emMeiasMedidas(item.gramas, medida.gramasPorMedida)
    return {
      nome: medida.nome,
      gramasPorMedida: medida.gramasPorMedida,
      quantidade,
      aproximada: item.gramas > 0 && !fechaEmMeiaMedida(item.gramas, quantidade, medida.gramasPorMedida),
      origem: 'escolhida',
      texto: formatarQuantidadeMedida(quantidade, medida.nome),
    }
  }
  const automatica = medidaParaMostrar(item.alimentoId, item.gramas)
  if (!automatica) return null
  const peso = medidasDoAlimento(item.alimentoId).find((m) => m.nome === automatica.medida)?.gramas ?? automatica.gramasEquivalentes / automatica.quantidade
  return { nome: automatica.medida, gramasPorMedida: peso, quantidade: automatica.quantidade, aproximada: false, origem: 'automatica', texto: automatica.texto }
}

/**
 * As medidas do seletor da linha (G3): as do alimento, na ordem de preferência das legíveis, e depois as outras em
 * ordem alfabética. As medidas próprias da conta chegam primeiro por `medidasDoAlimento` (D-387).
 */
export function medidasDoSeletor(alimentoId: number): readonly MedidaCaseira[] {
  const medidas = medidasDoAlimento(alimentoId)
  const posicao = (nome: string) => {
    const i = PREFERENCIA_MEDIDAS.indexOf(nome)
    return i < 0 ? PREFERENCIA_MEDIDAS.length : i
  }
  const proprias = medidas.filter((m) => m.propria === true)
  const daBase = medidas
    .filter((m) => m.propria !== true)
    .sort((a, b) => posicao(a.nome) - posicao(b.nome) || a.nome.localeCompare(b.nome, 'pt-BR'))
  return [...proprias, ...daBase]
}

/** A medida escolhida com a quantidade dada: os gramas são quantidade × peso (G2). */
export function medidaEscolhida(medida: Pick<MedidaCaseira, 'nome' | 'gramas'>, quantidade: number): { readonly medida: MedidaDoItem; readonly gramas: number } {
  return {
    medida: { nome: medida.nome, quantidade, gramasPorMedida: medida.gramas },
    gramas: Math.round(quantidade * medida.gramas * 10) / 10,
  }
}

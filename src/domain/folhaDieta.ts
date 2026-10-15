// O que a folha da dieta mostra e como ela lembra as escolhas de impressão
// (spec pdf-e-telas-limpas, US-B1).
import { nutricionistaDoWord, type AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Armazenamento } from './persistencia.ts'
import { OPCOES, type BuscarAlimento, type Caso, type ItemPlano, type Plano, type Refeicao } from './tipos.ts'
import type { GrupoDeTrocas, Troca } from './trocas.ts'

export type AssinaturaDaFolha =
  | { readonly tipo: 'nutricionista'; readonly linha: string }
  | { readonly tipo: 'estagio'; readonly estagiario: string; readonly preceptor: string }
  | { readonly tipo: 'vazia' }

/** CA-313: as mesmas regras do Word (spec ajustes-de-uso, CA-252 e CB-51). */
export function assinaturaDaFolha(assinatura: AssinaturaDoPlano | null, caso: Caso): AssinaturaDaFolha {
  const nutricionista = nutricionistaDoWord(assinatura, caso)
  if (nutricionista !== null) return { tipo: 'nutricionista', linha: nutricionista }
  const estagiario = caso.estagiario.trim()
  const preceptor = caso.preceptor.trim()
  if (estagiario || preceptor) return { tipo: 'estagio', estagiario, preceptor }
  return { tipo: 'vazia' }
}

/**
 * As opções de uma refeição que têm alimento, na ordem principal, substituto 1, substituto 2 (spec
 * impressao-do-plano, CA-631 e CA-632): na folha, a primeira vem sem "ou" e as outras depois de "ou".
 */
export function opcoesDaRefeicao(refeicao: Refeicao): readonly (readonly ItemPlano[])[] {
  return OPCOES.map((opcao) => refeicao.opcoes[opcao].filter((i) => i.gramas > 0)).filter((itens) => itens.length > 0)
}

export interface CompraDaFolha {
  readonly nome: string
  readonly gramas: number
  /** O primeiro alimento do plano com esse nome: dá a medida caseira da linha (CA-643). */
  readonly alimentoId: number
}

/**
 * A lista de compras da folha: a principal do dia, somada pelo nome que o paciente lê, em ordem alfabética (spec
 * impressao-do-plano, CA-628 e CB-181). Dois alimentos com o mesmo nome viram uma linha só.
 */
export function comprasDaFolha(plano: Plano, buscar: BuscarAlimento): readonly CompraDaFolha[] {
  const porNome = new Map<string, CompraDaFolha>()
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      if (item.gramas <= 0) continue
      const nome = nomeParaPaciente(buscar(item.alimentoId))
      const antes = porNome.get(nome)
      porNome.set(nome, { nome, gramas: (antes?.gramas ?? 0) + item.gramas, alimentoId: antes?.alimentoId ?? item.alimentoId })
    }
  }
  return [...porNome.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Quem assina numa linha só, para a linha fina (CA-316; também nas folhas do paciente, spec anamnese-e-prescricoes). */
export function assinaturaEmTexto(assinatura: AssinaturaDaFolha): string {
  return assinatura.tipo === 'nutricionista'
    ? assinatura.linha
    : assinatura.tipo === 'estagio'
      ? [assinatura.estagiario, assinatura.preceptor].filter(Boolean).join(' · ')
      : ''
}

/** CA-316: o texto da linha fina do topo, da segunda página em diante. */
export function linhaFinaDaFolha(caso: Caso, assinatura: AssinaturaDaFolha): { readonly esquerda: string; readonly direita: string } {
  return { esquerda: `Plano alimentar · ${caso.nome.trim() || 'Sem nome'}`, direita: assinaturaEmTexto(assinatura) }
}

export interface TrocasDaFolha {
  /** O alimento do plano. */
  readonly alimentoId: number
  readonly nome: string
  readonly trocas: readonly (Troca & { readonly nome: string })[]
}

/** No máximo 2 trocas por alimento na folha (spec pdf-e-telas-limpas, CA-319). */
export const TROCAS_NA_FOLHA = 2

/**
 * Quantas trocas a folha pede a `trocas.ts`: mais do que mostra, porque o corte por nome (CB-188) pode tirar uma, e a
 * vaga não deve ficar vazia (revisão final da integração: o arroz branco do exemplo imprimia só a polenta).
 */
export const TROCAS_PEDIDAS_PELA_FOLHA = 4

/**
 * As trocas como a folha mostra, pelo nome que o paciente lê (spec impressao-do-plano, CB-188): sai a troca com o mesmo
 * nome do alimento do plano (arroz tipo 1 por tipo 2 seria "Arroz branco cozido" por "Arroz branco cozido"), a troca
 * repetida pelo nome, o alimento do plano que fica sem troca e o alimento do plano repetido pelo nome. Das que sobram,
 * ficam as `TROCAS_NA_FOLHA` primeiras.
 */
export function trocasDaFolha(grupos: readonly GrupoDeTrocas[], buscar: BuscarAlimento): readonly TrocasDaFolha[] {
  const vistos = new Set<string>()
  const folha: TrocasDaFolha[] = []
  for (const grupo of grupos) {
    const nome = nomeParaPaciente(buscar(grupo.alimentoId))
    if (vistos.has(nome)) continue
    const nomes = new Set([nome])
    const trocas = grupo.trocas
      .map((t) => ({ ...t, nome: nomeParaPaciente(buscar(t.alimentoId)) }))
      .filter((t) => {
        if (nomes.has(t.nome)) return false
        nomes.add(t.nome)
        return true
      })
      .slice(0, TROCAS_NA_FOLHA)
    if (trocas.length === 0) continue
    vistos.add(nome)
    folha.push({ alimentoId: grupo.alimentoId, nome, trocas })
  }
  return folha
}

export interface OpcoesImpressao {
  readonly listaDeCompras: boolean
  readonly trocas: boolean
}

export const OPCOES_IMPRESSAO_PADRAO: OpcoesImpressao = { listaDeCompras: false, trocas: false }

const CHAVE = 'metanutri:impressao'

/** CA-320: o que foi marcado na última impressão. Dado estragado volta ao padrão. */
export function lerOpcoesImpressao(armazenamento: Armazenamento | null): OpcoesImpressao {
  if (!armazenamento) return OPCOES_IMPRESSAO_PADRAO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return OPCOES_IMPRESSAO_PADRAO
    const { listaDeCompras, trocas } = bruto as { listaDeCompras?: unknown; trocas?: unknown }
    return { listaDeCompras: listaDeCompras === true, trocas: trocas === true }
  } catch {
    return OPCOES_IMPRESSAO_PADRAO
  }
}

/** `false` quando o aparelho não guardou: as opções valem só para esta impressão (CB-72). */
export function gravarOpcoesImpressao(armazenamento: Armazenamento | null, opcoes: OpcoesImpressao): boolean {
  if (!armazenamento) return false
  try {
    armazenamento.setItem(CHAVE, JSON.stringify({ listaDeCompras: opcoes.listaDeCompras, trocas: opcoes.trocas }))
    return true
  } catch {
    return false
  }
}

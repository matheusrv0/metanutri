// O que a folha da dieta mostra e como ela lembra as escolhas de impressão
// (spec pdf-e-telas-limpas, US-B1).
import { nutricionistaDoWord, type AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import type { Armazenamento } from './persistencia.ts'
import { OPCOES, type BuscarAlimento, type Caso, type ItemPlano, type Plano, type Refeicao } from './tipos.ts'

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
}

/**
 * A lista de compras da folha: a principal do dia, somada pelo nome que o paciente lê, em ordem alfabética (spec
 * impressao-do-plano, CA-628 e CB-181). Dois alimentos com o mesmo nome viram uma linha só.
 */
export function comprasDaFolha(plano: Plano, buscar: BuscarAlimento): readonly CompraDaFolha[] {
  const porNome = new Map<string, number>()
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      if (item.gramas <= 0) continue
      const nome = nomeParaPaciente(buscar(item.alimentoId))
      porNome.set(nome, (porNome.get(nome) ?? 0) + item.gramas)
    }
  }
  return [...porNome.entries()].map(([nome, gramas]) => ({ nome, gramas })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
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

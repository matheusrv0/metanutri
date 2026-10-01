// O que a folha da dieta mostra e como ela lembra as escolhas de impressão
// (spec pdf-e-telas-limpas, US-B1).
import { nutricionistaDoWord, type AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import type { Missao } from './missoes.ts'
import type { Armazenamento } from './persistencia.ts'
import type { Caso } from './tipos.ts'

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

/** CA-312: no papel, só as missões que não repetem o horário das refeições. */
export function lembretesDoDia(missoes: readonly Missao[]): readonly Missao[] {
  return missoes.filter((m) => !m.id.startsWith('refeicao-'))
}

/** CA-316: o texto da linha fina do topo, da segunda página em diante. */
export function linhaFinaDaFolha(caso: Caso, assinatura: AssinaturaDaFolha): { readonly esquerda: string; readonly direita: string } {
  const direita =
    assinatura.tipo === 'nutricionista'
      ? assinatura.linha
      : assinatura.tipo === 'estagio'
        ? [assinatura.estagiario, assinatura.preceptor].filter(Boolean).join(' · ')
        : ''
  return { esquerda: `Plano alimentar · ${caso.nome.trim() || 'Sem nome'}`, direita }
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

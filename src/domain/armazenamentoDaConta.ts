// Cada conta tem os próprios dados no aparelho (spec dados-por-conta, D-120).
//
// Os dados continuam no `localStorage`, cada conta num espaço com prefixo próprio. Por
// fora, nada muda: os repositórios, o backup e a cópia na nuvem leem e gravam pelos
// nomes de sempre (`metanutri:casos`…), e o adaptador põe e tira o prefixo (D-125).
import type { Armazenamento, ArmazenamentoListavel } from './persistencia.ts'

const PREFIXO = 'metanutri:'
export const PREFIXO_DE_CONTA = `${PREFIXO}conta:`

export interface ArmazenamentoDaConta extends ArmazenamentoListavel {
  readonly usuarioId: string
  /** Apaga só as chaves desta conta (D-124). */
  clear(): void
  /** O nome original de uma chave do aparelho, ou `null` quando ela não é desta conta. */
  chaveOriginal(chaveDoAparelho: string): string | null
}

/** O começo de toda chave da conta. O id vai codificado: sem `:`, um prefixo nunca é começo de outro. */
export const prefixoDaConta = (usuarioId: string): string => `${PREFIXO_DE_CONTA}${encodeURIComponent(usuarioId)}:`

export function ehArmazenamentoDaConta(arm: Armazenamento): arm is ArmazenamentoDaConta {
  return typeof (arm as Partial<ArmazenamentoDaConta>).chaveOriginal === 'function'
}

/** Os dados de uma conta por cima do armazenamento do aparelho. */
export function armazenamentoDaConta(base: ArmazenamentoListavel, usuarioId: string): ArmazenamentoDaConta {
  if (usuarioId === '') throw new Error('A conta precisa de um id para guardar dados no aparelho.')
  const prefixo = prefixoDaConta(usuarioId)

  const noAparelho = (chave: string): string => {
    if (!chave.startsWith(PREFIXO)) throw new Error(`Chave fora do MetaNutri: ${chave}`)
    return `${prefixo}${chave.slice(PREFIXO.length)}`
  }

  const chaveOriginal = (chaveDoAparelho: string): string | null =>
    chaveDoAparelho.startsWith(prefixo) ? `${PREFIXO}${chaveDoAparelho.slice(prefixo.length)}` : null

  /** As chaves desta conta, com o nome original, na ordem do aparelho. */
  const minhas = (): string[] => {
    const lista: string[] = []
    for (let i = 0; i < base.length; i += 1) {
      const chave = base.key(i)
      const original = chave === null ? null : chaveOriginal(chave)
      if (original !== null) lista.push(original)
    }
    return lista
  }

  return {
    usuarioId,
    getItem: (chave) => base.getItem(noAparelho(chave)),
    setItem: (chave, valor) => base.setItem(noAparelho(chave), valor),
    removeItem: (chave) => base.removeItem(noAparelho(chave)),
    get length() {
      return minhas().length
    },
    key: (indice) => minhas()[indice] ?? null,
    clear: () => {
      // Lista antes de apagar: apagar no meio da leitura muda os índices do aparelho.
      for (const chave of minhas()) base.removeItem(noAparelho(chave))
    },
    chaveOriginal,
  }
}

/**
 * A chave de um evento `storage` com o nome que os repositórios conhecem, ou `null` quando ela
 * não é deste armazenamento: no da conta, só as dela; no do aparelho, só as sem prefixo de conta.
 */
export function chaveDoEvento(arm: Armazenamento | null, chaveDoAparelho: string): string | null {
  if (arm !== null && ehArmazenamentoDaConta(arm)) return arm.chaveOriginal(chaveDoAparelho)
  return chaveDoAparelho.startsWith(PREFIXO_DE_CONTA) ? null : chaveDoAparelho
}

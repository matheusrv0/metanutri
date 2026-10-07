import { createContext, useContext, useEffect } from 'react'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import type { FonteAcompanhamentos, RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'

export interface ValorAcompanhamentos {
  readonly repositorio: RepositorioAcompanhamentos
  /** A costura com o servidor: é ela que a tela do paciente usa. */
  readonly fonte: FonteAcompanhamentos
  /** Todos os links criados, do mais novo para o mais antigo. */
  readonly acompanhamentos: readonly Acompanhamento[]
  readonly avisoArmazenamento: string | null
  /**
   * Grava no aparelho e, com conta, na nuvem (D-103). Devolve o motivo quando a nuvem não
   * gravou, ou nulo. No limite do plano nada fica pela metade: o aparelho volta ao que era.
   */
  readonly salvar: (acompanhamento: Acompanhamento) => Promise<string | null>
  /** Tira da nuvem e do aparelho. Falhando a nuvem, o link continua e volta o motivo (CA-440). */
  readonly remover: (id: string) => Promise<string | null>
  /** Lê os links da conta na nuvem e sobe os que só existem aqui (D-104, D-105). */
  readonly lerDaNuvem: () => Promise<void>
  /** A última leitura da nuvem falhou: a tela mostra a cópia do aparelho (CB-106). */
  readonly avisoNuvem: string | null
  /** Links que ainda não estão na nuvem, com o motivo (CA-439, CA-443). */
  readonly foraDaNuvem: ReadonlyMap<string, string>
}

export const ContextoAcompanhamentos = createContext<ValorAcompanhamentos | null>(null)

export function useAcompanhamentos(): ValorAcompanhamentos {
  const valor = useContext(ContextoAcompanhamentos)
  if (!valor) throw new Error('useAcompanhamentos precisa estar dentro de <ProvedorAcompanhamentos>.')
  return valor
}

/** D-104: a tela lê a nuvem ao abrir e ao voltar para a aba. */
export function useLerDaNuvemAoAbrir(): void {
  const { lerDaNuvem } = useAcompanhamentos()
  useEffect(() => {
    void lerDaNuvem()
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void lerDaNuvem()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [lerDaNuvem])
}

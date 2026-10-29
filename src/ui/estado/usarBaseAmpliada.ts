import { useEffect, useSyncExternalStore } from 'react'
import { carregamentoAutomatico, carregarBaseAmpliada, estadoDaBaseAmpliada, inscreverNaBaseAmpliada, versaoDaBaseAmpliada, type EstadoBaseAmpliada } from './baseAmpliada.ts'

export interface ValorBaseAmpliada {
  readonly estado: EstadoBaseAmpliada
  /** Muda quando a base chega: entra nas dependências do que busca ou sugere (busca, Cobrir, Tabela de alimentos). */
  readonly versao: number
  readonly tentarDeNovo: () => void
}

/**
 * A base ampliada (spec base-ampliada, D-710): pedida depois de a tela aparecer (o efeito roda depois da pintura), uma
 * vez por sessão; quem usa o gancho se redesenha quando ela chega.
 */
export function useBaseAmpliada(): ValorBaseAmpliada {
  const versao = useSyncExternalStore(inscreverNaBaseAmpliada, versaoDaBaseAmpliada)
  useEffect(() => {
    if (carregamentoAutomatico()) void carregarBaseAmpliada()
  }, [])
  return { estado: estadoDaBaseAmpliada(), versao, tentarDeNovo: () => void carregarBaseAmpliada() }
}

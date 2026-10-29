import { useEffect, useSyncExternalStore } from 'react'
import type { IndiceDoCatalogo } from '@/domain/catalogoOff.ts'
import {
  carregamentoAutomaticoDoCatalogo,
  carregarIndiceDoCatalogo,
  estadoDoCatalogo,
  indiceDoCatalogo,
  inscreverNoCatalogo,
  versaoDoCatalogo,
  type EstadoDoCatalogo,
} from './catalogoOff.ts'

export interface ValorCatalogoOff {
  readonly estado: EstadoDoCatalogo
  readonly indice: IndiceDoCatalogo | null
  /** Muda quando o índice chega: entra nas dependências de quem busca. */
  readonly versao: number
}

/**
 * O catálogo de rótulos (spec base-ampliada, fase 2, D-758 e CA-1764): o índice só é pedido quando `ativo` (a primeira
 * busca com 3 letras); antes disso, nada do catálogo sai da página.
 */
export function useCatalogoOff(ativo: boolean): ValorCatalogoOff {
  const versao = useSyncExternalStore(inscreverNoCatalogo, versaoDoCatalogo)
  useEffect(() => {
    if (ativo && carregamentoAutomaticoDoCatalogo() && estadoDoCatalogo() !== 'pronto') void carregarIndiceDoCatalogo()
  }, [ativo])
  return { estado: estadoDoCatalogo(), indice: indiceDoCatalogo(), versao }
}

import type { EstadoAdequacao, LinhaAdequacao } from '@/domain/adequacao.ts'
import { arredondarNoEstado } from '@/domain/arredondarNoEstado.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

/* A barra carrega o estado da linha: cor sempre significa alguma coisa. */
export const VARIANTE_BARRA: Record<EstadoAdequacao, 'success' | 'warning' | 'error'> = {
  adequado: 'success',
  abaixo: 'warning',
  'acima-limite': 'error',
}

/* O texto da adequação leva a mesma cor da barra: abaixo em âmbar, dentro em verde, acima do limite em vermelho. */
export const COR_TEXTO: Record<EstadoAdequacao, string> = {
  adequado: 'text-successtext',
  abaixo: 'text-warningtext',
  'acima-limite': 'text-errortext',
}

/**
 * "28% da referência" (spec ficha-unica, D-459): a porcentagem diz de que ela é. "28% abaixo" se lia como "faltam 28%".
 * Abaixo da meta, 89,6% com meta de 90% nunca sai "90%"; longe da meta, o mais perto (D-211).
 */
export function pctDaReferencia(linha: LinhaAdequacao): string {
  return `${formatarNumero(arredondarNoEstado(linha.adequacaoPct, linha.estado === 'abaixo' ? 'abaixo' : 'dentro', { min: linha.metaPct }), 0)}% da referência`
}

/** "28% da referência · abaixo da meta", "104% da referência" ou "230% da referência · acima do limite" (D-459). */
export function textoDaAdequacao(linha: LinhaAdequacao): string {
  const pct = pctDaReferencia(linha)
  if (linha.estado === 'abaixo') return `${pct} · abaixo da meta`
  if (linha.estado === 'acima-limite') return `${pct} · acima do limite`
  return pct
}

/** A primeira frase da gaveta do Cobrir: "O plano tem 28% da referência. " (D-459); sem a linha, nada. */
export const aberturaDoCobrir = (linha: LinhaAdequacao | undefined): string => (linha ? `O plano tem ${pctDaReferencia(linha)}. ` : '')

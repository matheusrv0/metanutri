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

/** "66% abaixo", "104%" ou "230% · acima do limite", na tabela e na lista do celular. */
export function textoDaAdequacao(linha: LinhaAdequacao): string {
  // Abaixo da meta, 89,6% com meta de 90% nunca sai "90% abaixo"; longe da meta, o mais perto (D-211).
  const pct = `${formatarNumero(arredondarNoEstado(linha.adequacaoPct, linha.estado === 'abaixo' ? 'abaixo' : 'dentro', { min: linha.metaPct }), 0)}%`
  if (linha.estado === 'abaixo') return `${pct} abaixo`
  if (linha.estado === 'acima-limite') return `${pct} · acima do limite`
  return pct
}

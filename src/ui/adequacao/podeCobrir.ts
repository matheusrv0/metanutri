import type { LinhaAdequacao } from '@/domain/adequacao.ts'

/**
 * Se a linha mostra o Cobrir: só abaixo da meta, e nunca no sódio (spec painel-lateral-enxuto, D-206).
 * O sal de cozinha não entra no plano, então o sódio dos alimentos fica quase sempre abaixo da AI;
 * subir sódio por alimento não é conduta, e o que importa nele é o excesso.
 */
export function podeCobrir(linha: LinhaAdequacao): boolean {
  return linha.estado === 'abaixo' && linha.chave !== 'sodio_mg'
}

import type { EstadoDaNuvem } from '@/domain/sincronia.ts'

/**
 * Fechar a aba com mudança que ainda não chegou à nuvem pede confirmação do navegador (DP-27). A trava de
 * espaço pede para recarregar a página: aí o navegador não pergunta se pode sair (DP-28).
 */
export function avisarAoFechar(estado: EstadoDaNuvem): boolean {
  return (estado.pendente || estado.salvando) && estado.trava !== 'sem-espaco'
}

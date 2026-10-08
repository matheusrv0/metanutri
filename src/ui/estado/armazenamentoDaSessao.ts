// Qual armazenamento a árvore de dados usa, conforme a sessão (spec dados-por-conta).
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { migrarDadosSemConta } from '@/domain/donoDosDados.ts'
import type { Armazenamento, ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { criarRepositorioProdutos, produtoComoAlimento } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { esquecerOcultosEmMemoria } from './ocultosGlobais.ts'

/**
 * Com sessão, o espaço da conta (D-120), depois de levar para o dono os dados de antes desta
 * mudança (D-123). Sem sessão ou sem servidor de conta, o aparelho, sem prefixo, como antes (DP-3).
 */
export function armazenamentoDaSessao(base: ArmazenamentoListavel | null, usuarioId: string | null): Armazenamento | null {
  if (usuarioId === null || base === null) return base
  migrarDadosSemConta(base, usuarioId)
  return armazenamentoDaConta(base, usuarioId)
}

/**
 * O que fica em memória de módulo troca junto com a conta (DP-7): os produtos que a busca
 * conhece e a reserva das sugestões ocultas.
 */
export function trocarDadosEmMemoria(armazenamento: Armazenamento | null): void {
  try {
    registrarProdutos(criarRepositorioProdutos(armazenamento).listar().map(produtoComoAlimento))
  } catch {
    // navegador sem armazenamento: a busca segue só com a tabela
    registrarProdutos([])
  }
  esquecerOcultosEmMemoria()
}

// Qual armazenamento a árvore de dados usa, conforme a sessão (spec dados-por-conta).
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { CHAVE_DONO, migrarDadosSemConta, type ResultadoMigracao } from '@/domain/donoDosDados.ts'
import type { Armazenamento, ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { criarRepositorioProdutos, produtoComoAlimento } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { esquecerOcultosEmMemoria } from './ocultosGlobais.ts'

export interface DadosDaSessao {
  readonly armazenamento: Armazenamento | null
  /** Como foi levar os dados de antes para a conta; `incompleto` pede o aviso do CA-473. */
  readonly migracao: ResultadoMigracao
}

function donoDosDados(base: ArmazenamentoListavel): string | null {
  try {
    return base.getItem(CHAVE_DONO)
  } catch {
    return null
  }
}

/**
 * Com sessão, o espaço da conta (D-120), depois de levar para o dono os dados de antes desta
 * mudança (D-123). Sem sessão ou sem servidor de conta, o aparelho, sem prefixo, como antes (DP-3).
 */
export function armazenamentoDaSessao(base: ArmazenamentoListavel | null, usuarioId: string | null): DadosDaSessao {
  if (usuarioId === null || base === null) return { armazenamento: base, migracao: 'nada' }
  const resultado = migrarDadosSemConta(base, usuarioId)
  // DP-18: o aviso do CA-473 é do dono do que sobrou. Se é de outra conta, para quem entrou nada ficou para trás.
  const migracao = resultado === 'incompleto' && donoDosDados(base) !== usuarioId ? 'nada' : resultado
  return { armazenamento: armazenamentoDaConta(base, usuarioId), migracao }
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

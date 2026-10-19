// A limpeza dos comprovantes de matrícula (spec seguranca-lote-5, D-263 e D-264). Núcleo puro: sem Deno, sem
// relógio solto e sem registro direto; o Vitest o executa com um banco de mentira
// (src/data/servidorLimpeza.test.ts) e, no Supabase local, com o banco e o armazenamento de verdade
// (testes/seguranca/limpeza.test.ts).
//
// Quem chama é o agendamento diário do banco (pg_cron + pg_net), com a chave do cofre no cabeçalho. Sem a
// chave certa, nada é listado nem apagado. O arquivo sai do armazenamento antes de o pedido perder o caminho:
// se o armazenamento recusar, nenhum pedido é marcado e a próxima rodada tenta de novo.
import type { Registro, RespostaDaFuncao } from './portas.ts'

/** O cabeçalho em que o agendamento manda a chave da limpeza. */
export const CABECALHO_DA_CHAVE = 'x-chave-da-limpeza'

/** No máximo 1000 arquivos por rodada (CB-265); o resto sai nas próximas. */
export const LIMITE_POR_RODADA = 1000

export interface BancoDaLimpeza {
  /** Sim só para a chave guardada no cofre. Falha do banco: rejeita. */
  chaveConfere(chave: string): Promise<boolean>
  /** Os caminhos vencidos na data de referência (D-43), até o limite. Falha do banco: rejeita. */
  vencidos(agora: Date, limite: number): Promise<readonly string[]>
  /** Apaga do armazenamento. `falha` traz o motivo quando o armazenamento recusa; `apagados`, quantos saíram. */
  apagar(caminhos: readonly string[]): Promise<{ readonly falha: string | null; readonly apagados: number }>
  /** Tira o caminho dos pedidos cujo arquivo já saiu; devolve quantos foram marcados. Falha do banco: rejeita. */
  anotar(caminhos: readonly string[]): Promise<number>
}

export interface PedidoDeLimpeza {
  readonly metodo: string
  /** O valor do cabeçalho da chave, como chegou; nulo quando não veio. */
  readonly chave: string | null
}

export interface DependenciasDaLimpeza {
  readonly banco: BancoDaLimpeza
  readonly agora: () => Date
  /** Leva só números e mensagens fixas: nunca caminho de arquivo nem id de conta (CA-851). */
  readonly log: Registro
}

export async function limparComprovantes(pedido: PedidoDeLimpeza, deps: DependenciasDaLimpeza): Promise<RespostaDaFuncao> {
  if (pedido.metodo !== 'POST') return { status: 405, corpo: { erro: 'Use POST.' } }
  const chave = pedido.chave?.trim() ?? ''
  // CA-847: sem a chave, nem pergunta ao banco; com a errada, para logo depois de conferir.
  if (chave === '' || !(await deps.banco.chaveConfere(chave))) return { status: 401, corpo: { erro: 'Chave da limpeza ausente ou errada.' } }

  const caminhos = await deps.banco.vencidos(deps.agora(), LIMITE_POR_RODADA)
  if (caminhos.length === 0) return { status: 200, corpo: { apagados: 0, marcados: 0 } }

  const { falha, apagados } = await deps.banco.apagar(caminhos)
  if (falha !== null) {
    // CA-848: nenhum pedido é marcado; o arquivo continua lá e a próxima rodada tenta de novo.
    deps.log('A limpeza não apagou os comprovantes:', falha)
    return { status: 502, corpo: { erro: 'O armazenamento não apagou os comprovantes. A próxima rodada tenta de novo.' } }
  }
  // CA-849 e CB-266: o banco só marca o pedido cujo arquivo já não está no balde.
  const marcados = await deps.banco.anotar(caminhos)
  deps.log('Limpeza dos comprovantes:', { apagados, marcados })
  return { status: 200, corpo: { apagados, marcados } }
}

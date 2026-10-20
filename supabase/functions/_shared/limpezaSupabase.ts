// A ligação da limpeza ao banco e ao armazenamento de verdade (spec seguranca-lote-5, D-263): o supabase-js
// com a chave de serviço. Não importa o supabase-js: recebe o cliente pelo formato que usa, então roda igual
// no Deno (limpar-comprovantes/index.ts) e no Node (testes/seguranca/limpeza.test.ts, contra o Supabase local).
import type { BancoDaLimpeza } from './limpeza.ts'

interface ErroDoCliente {
  readonly message: string
}

/** O pedaço do supabase-js que a limpeza usa. */
export interface ClienteDaLimpeza {
  rpc(funcao: string, argumentos: Record<string, unknown>): PromiseLike<{ readonly data: unknown; readonly error: ErroDoCliente | null }>
  readonly storage: {
    from(balde: string): {
      remove(caminhos: string[]): PromiseLike<{ readonly data: unknown; readonly error: ErroDoCliente | null }>
    }
  }
}

const caminhoDa = (linha: unknown): string | null =>
  typeof linha === 'object' && linha !== null && 'caminho' in linha && typeof linha.caminho === 'string' ? linha.caminho : null

export function criarBancoDaLimpeza(cliente: ClienteDaLimpeza): BancoDaLimpeza {
  return {
    async chaveConfere(chave) {
      const { data, error } = await cliente.rpc('conferir_chave_da_limpeza', { p_chave: chave })
      if (error) throw new Error(`Não consegui conferir a chave da limpeza: ${error.message}`)
      return data === true
    },
    async vencidos(agora, limite) {
      const { data, error } = await cliente.rpc('comprovantes_vencidos', { p_agora: agora.toISOString(), p_limite: limite })
      if (error) throw new Error(`Não consegui listar os comprovantes vencidos: ${error.message}`)
      return Array.isArray(data) ? data.map(caminhoDa).filter((caminho): caminho is string => caminho !== null) : []
    },
    async apagar(caminhos) {
      // O armazenamento devolve os arquivos que apagou; o que já tinha saído não volta e não é erro (CB-266).
      const { data, error } = await cliente.storage.from('comprovantes').remove([...caminhos])
      if (error) return { falha: error.message, apagados: 0 }
      return { falha: null, apagados: Array.isArray(data) ? data.length : 0 }
    },
    async anotar(caminhos) {
      const { data, error } = await cliente.rpc('anotar_comprovantes_apagados', { p_caminhos: [...caminhos] })
      if (error) throw new Error(`Não consegui anotar os comprovantes apagados: ${error.message}`)
      return typeof data === 'number' ? data : 0
    },
  }
}

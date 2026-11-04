// A marca publicada na nuvem (spec marca-no-link, D-952 e DP-ML-1): o "Salvar" de "Sua marca" grava a logo e a cor na
// linha da conta, na tabela `marcas`, que a função do link lê pelo token (supabase/015-marca-no-link.sql).
import { FALHA_DE_REDE, LOGO_PESADA_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'
import { comPrazo, comSinal, traduzido, usuarioEsperado, type ClienteMissoes, type Pedido } from './fonteSupabase.ts'
import { ehLogoPublicavel } from './logoDaMarca.ts'
import type { MarcaDoLink } from './marca.ts'

/** A tabela da marca publicada (DP-ML-1). */
export const TABELA_DE_MARCAS = 'marcas'

/** CB-964 e DP-ML-34: o site saiu antes do SQL da marca (o 015); a internet está boa, a função é que ainda não existe. */
export const MARCA_INDISPONIVEL = 'Esta função ainda não está disponível. Tente de novo mais tarde.'
/** A API não conhece a tabela (PGRST205) ou o banco não a tem (42P01). */
const TABELA_QUE_NAO_EXISTE: readonly string[] = ['PGRST205', '42P01']

/** O pedaço do cliente Supabase que publicar a marca usa. */
export interface ClienteDaMarca {
  from(tabela: string): { upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string }): Pedido }
  auth: ClienteMissoes['auth']
}

/**
 * D-952 e CA-1963: "Salvar" grava a marca na linha da conta. Uma linha por conta, sempre por cima (a mais nova vale,
 * CB-955); sem logo e sem cor, a linha fica vazia e o link volta ao MetaNutri. Devolve o motivo traduzido, ou nulo
 * quando gravou. Sessão de outra conta ou sem sessão: nada sai do aparelho.
 */
export async function publicarMarca(cliente: ClienteDaMarca, marca: MarcaDoLink, esperado?: string | null): Promise<string | null> {
  if (marca.logo !== null && !ehLogoPublicavel(marca.logo)) return LOGO_PESADA_DEMAIS
  return comPrazo<string | null>(
    async (sinal) => {
      const usuario = await usuarioEsperado(cliente, esperado)
      if (usuario === null) return FALHA_DE_REDE
      const linha = { nutricionista_id: usuario, logo: marca.logo, cor: marca.cor, atualizado_em: new Date().toISOString() }
      const { error } = await comSinal(cliente.from(TABELA_DE_MARCAS).upsert(linha, { onConflict: 'nutricionista_id' }), sinal)
      if (!error) return null
      return error.code !== undefined && TABELA_QUE_NAO_EXISTE.includes(error.code) ? MARCA_INDISPONIVEL : traduzido(error)
    },
    (texto) => texto,
  )
}

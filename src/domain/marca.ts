// A marca da nutricionista no link do paciente (spec marca-no-link, D-952): a logo e a cor que o link mostra. Ela mora
// no perfil (de onde sai o plano impresso e a prévia) e numa marca publicada, a tabela `marcas`, que a função do link
// lê junto com as missões, pelo token, sem dizer de quem é (supabase/015-marca-no-link.sql).
import { FALHA_DE_REDE, LOGO_PESADA_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'
import { avaliarCor, ehCorPadrao, normalizarCor } from './corDaMarca.ts'
import { comPrazo, comSinal, traduzido, usuarioEsperado, type ClienteMissoes, type Pedido } from './fonteSupabase.ts'
import { ehLogoPublicavel } from './logoDaMarca.ts'
import type { Perfil } from './perfil.ts'

export interface MarcaDoLink {
  /** PNG em data URI, de até 150 KB; nula sem logo (o topo é o do MetaNutri). */
  readonly logo: string | null
  /** `#rrggbb`; nula é a padrão do MetaNutri (o link de hoje). */
  readonly cor: string | null
}

export const SEM_MARCA: MarcaDoLink = { logo: null, cor: null }

export const temMarca = (marca: MarcaDoLink): boolean => marca.logo !== null || marca.cor !== null

/** A cor que o link aceita: no formato, não padrão e com 4,5:1 ou mais com o branco (DP-ML-13). */
function corDoLink(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor !== valor.trim()) return null
  const cor = normalizarCor(valor)
  if (cor === null || ehCorPadrao(cor)) return null
  return avaliarCor(cor).aceita ? cor : null
}

/**
 * DP-ML-13 e CA-1973: o link desconfia do que lê. Só PNG em data URI dentro do teto vira logo; o resto (a função de
 * antes, sem as colunas; uma gravação que contornou o app) vira "sem logo" ou "sem cor", e o link abre do mesmo jeito.
 */
export function lerMarcaDoLink(linha: unknown): MarcaDoLink {
  if (typeof linha !== 'object' || linha === null) return SEM_MARCA
  const o = linha as Record<string, unknown>
  const logo = o['marca_logo']
  return { logo: typeof logo === 'string' && ehLogoPublicavel(logo) ? logo : null, cor: corDoLink(o['marca_cor']) }
}

/** A marca guardada no perfil: a da prévia e a do plano impresso (D-952). */
export const marcaDoPerfil = (perfil: Perfil): MarcaDoLink => ({ logo: perfil.logo, cor: perfil.cor })

/** A tabela da marca publicada (DP-ML-1). */
export const TABELA_DE_MARCAS = 'marcas'

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
      return error ? traduzido(error) : null
    },
    (texto) => texto,
  )
}

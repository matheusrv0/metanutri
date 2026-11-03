// A marca da nutricionista no link do paciente (spec marca-no-link, D-952): a logo e a cor que o link mostra. Ela mora
// no perfil (de onde sai o plano impresso e a prévia) e numa marca publicada, a tabela `marcas`, que a função do link
// lê junto com as missões, pelo token, sem dizer de quem é (supabase/015-marca-no-link.sql).
import { avaliarCor, ehCorPadrao, normalizarCor } from './corDaMarca.ts'
import { ehLogoPublicavel, logoCabeNoLink } from './logoDaMarca.ts'
import type { Acompanhamento } from './acompanhamento.ts'
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

/** CB-966 e DP-ML-36: a cor própria vale no link? A que não passa na regra de hoje vira a do MetaNutri (DP-ML-13). */
export const corValeNoLink = (cor: string): boolean => corDoLink(cor) !== null

/**
 * DP-ML-13 e CA-1973: o link desconfia do que lê. Só PNG em data URI dentro do teto e do tamanho da cópia (DP-ML-33)
 * vira logo; o resto (a função de antes, sem as colunas; uma gravação que contornou o app) vira "sem logo" ou "sem cor",
 * e o link abre do mesmo jeito.
 */
export function lerMarcaDoLink(linha: unknown): MarcaDoLink {
  if (typeof linha !== 'object' || linha === null) return SEM_MARCA
  const o = linha as Record<string, unknown>
  const logo = o['marca_logo']
  return { logo: typeof logo === 'string' && ehLogoPublicavel(logo) && logoCabeNoLink(logo) ? logo : null, cor: corDoLink(o['marca_cor']) }
}

/** A marca guardada no perfil: a da prévia e a do plano impresso (D-952). */
export const marcaDoPerfil = (perfil: Perfil): MarcaDoLink => ({ logo: perfil.logo, cor: perfil.cor })

/**
 * DP-ML-14: o link aberto, separado em acompanhamento (o que o paciente marca e o aparelho guarda) e marca (o que só se
 * mostra). Sem marca na leitura (a cópia do aparelho, o modo local), a marca é vazia.
 */
export function separarMarca(link: Acompanhamento & { readonly marca?: MarcaDoLink }): { readonly acompanhamento: Acompanhamento; readonly marca: MarcaDoLink } {
  if (!('marca' in link)) return { acompanhamento: link, marca: SEM_MARCA }
  // O link sem a chave `marca`: todos os outros campos são os do acompanhamento.
  const acompanhamento = Object.fromEntries(Object.entries(link).filter(([campo]) => campo !== 'marca')) as unknown as Acompanhamento
  return { acompanhamento, marca: link.marca ?? SEM_MARCA }
}

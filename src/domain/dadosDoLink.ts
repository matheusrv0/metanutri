// O que o link aberto traz além do acompanhamento (spec lado-do-paciente): o nome da nutricionista (D-1210), o e-mail do
// link mascarado (D-1221) e o estado de cada aviso (CA-2256). Como a marca (spec marca-no-link, DP-ML-14), só se mostra:
// nunca é gravado de volta e nunca entra na cópia do aparelho.
import { AVISOS_NAO_OFERECIDOS, TIPOS_DE_AVISO, type AvisosDoLink, type EstadoDoAvisoNoLink } from '../../supabase/functions/_shared/avisos/tipos.ts'
import type { Acompanhamento } from './acompanhamento.ts'

export interface DadosDoLink {
  /** O nome da nutricionista: o do Perfil publicado, ou o da conta (DP-LP-8). Nulo quando a nuvem não disse. */
  readonly nutricionista: string | null
  /** "j•••a@gmail.com": o e-mail do link, mascarado pelo servidor; nulo sem e-mail (CA-2235). */
  readonly emailMascarado: string | null
  /** Cada aviso: ligado, desligado ou não oferecido pela nutricionista (CA-2242). */
  readonly avisos: AvisosDoLink
}

export const SEM_DADOS_DO_LINK: DadosDoLink = { nutricionista: null, emailMascarado: null, avisos: AVISOS_NAO_OFERECIDOS }

const texto = (valor: unknown, maximo: number): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim().slice(0, maximo) : null)

const ehEstado = (valor: unknown): valor is EstadoDoAvisoNoLink => valor === 'ligado' || valor === 'desligado' || valor === 'nao-oferecido'

/**
 * O que a função do link devolveu (`missoes_por_token`, supabase/017). Como a marca, o link desconfia do que lê: campo
 * estranho vira "sem" (a função de antes do 017 não traz nenhum, e o link abre do mesmo jeito).
 */
export function lerDadosDoLink(linha: unknown): DadosDoLink {
  if (typeof linha !== 'object' || linha === null) return SEM_DADOS_DO_LINK
  const o = linha as Record<string, unknown>
  const brutos = typeof o['avisos'] === 'object' && o['avisos'] !== null ? (o['avisos'] as Record<string, unknown>) : {}
  const avisos = Object.fromEntries(TIPOS_DE_AVISO.map((tipo) => [tipo, ehEstado(brutos[tipo]) ? brutos[tipo] : 'nao-oferecido'])) as AvisosDoLink
  return { nutricionista: texto(o['nutricionista'], 120), emailMascarado: texto(o['email_mascarado'], 260), avisos }
}

/** O link como o paciente o abre, com a marca (spec marca-no-link) e os dados do link. */
export type ComDadosDoLink<T extends Acompanhamento = Acompanhamento> = T & { readonly doLink?: DadosDoLink }

/** Os dados do link e o resto, separados: o resto é o que se marca e se grava. */
export function separarDadosDoLink<T extends Acompanhamento>(link: ComDadosDoLink<T>): { readonly link: T; readonly dados: DadosDoLink } {
  if (!('doLink' in link)) return { link, dados: SEM_DADOS_DO_LINK }
  const resto = Object.fromEntries(Object.entries(link).filter(([campo]) => campo !== 'doLink')) as unknown as T
  return { link: resto, dados: link.doLink ?? SEM_DADOS_DO_LINK }
}

/** Quantos avisos estão ligados: "3 ligados", "1 ligado" ou "Desligados" (folha "Meu plano", D-1212). */
export function textoDosAvisosLigados(avisos: AvisosDoLink): string {
  const ligados = TIPOS_DE_AVISO.filter((tipo) => avisos[tipo] === 'ligado').length
  if (ligados === 0) return 'Desligados'
  return ligados === 1 ? '1 ligado' : `${ligados} ligados`
}

/** Algum aviso foi oferecido pela nutricionista (sem nenhum, a folha não oferece avisos). */
export const temAvisoOferecido = (avisos: AvisosDoLink): boolean => TIPOS_DE_AVISO.some((tipo) => avisos[tipo] !== 'nao-oferecido')

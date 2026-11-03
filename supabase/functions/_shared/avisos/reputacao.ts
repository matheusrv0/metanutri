// A pausa automática dos avisos (spec lado-do-paciente, D-1239, CA-2278): nos últimos 7 dias, com 200 envios ou mais, a
// devolução acima de 2% ou a queixa acima de 0,05% param os avisos, antes de o Resend pausar a conta (4% e 0,08%). Puro.
import type { Taxas } from './portas.ts'

export const ENVIOS_PARA_AVALIAR = 200
export const DEVOLUCAO_MAXIMA = 0.02
export const QUEIXA_MAXIMA = 0.0005
export const JANELA_DA_REPUTACAO_MS = 7 * 24 * 60 * 60 * 1000

/** "2,4%", "0,06%": uma casa a partir de 0,1%; duas abaixo disso; sem ",0" sobrando. */
export function porcentagem(fracao: number): string {
  const valor = fracao * 100
  const casas = valor >= 0.1 ? 1 : 2
  return `${valor.toFixed(casas).replace(/\.?0+$/, '').replace('.', ',')}%`
}

/** O motivo da pausa ("devolução 2,4%" ou "queixa 0,06%"), ou nulo quando está tudo dentro. */
export function motivoDaPausa(t: Taxas): string | null {
  if (t.envios < ENVIOS_PARA_AVALIAR) return null
  const devolucao = t.devolvidos / t.envios
  if (devolucao > DEVOLUCAO_MAXIMA) return `devolução ${porcentagem(devolucao)}`
  const queixa = t.queixas / t.envios
  if (queixa > QUEIXA_MAXIMA) return `queixa ${porcentagem(queixa)}`
  return null
}

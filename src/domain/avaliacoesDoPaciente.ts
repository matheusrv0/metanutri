// As avaliações antropométricas de um paciente (spec antropometria-telas, D-1400): cada plano completo dele é uma
// avaliação, na data da consulta do plano. Plano rápido não tem medidas e não entra.
import { diaLocal } from './acompanhamento.ts'
import type { CasoSalvo } from './persistencia.ts'

export interface AvaliacaoNaLista {
  readonly casoId: string
  /** AAAA-MM-DD: a data da consulta; sem ela, o dia da última alteração no relógio de quem usa (D-1528). */
  readonly data: string
  readonly registro: CasoSalvo
}

/**
 * AAAA-MM-DD da avaliação: a data da consulta; sem ela, o dia da última alteração no relógio de quem usa (D-1528). O
 * `atualizadoEm` é UTC: depois das 21h de Brasília, o recorte dele já seria o dia seguinte (o mesmo da CB-1448).
 */
export function dataDaAvaliacao(r: CasoSalvo): string {
  if (r.caso.dataConsulta) return r.caso.dataConsulta
  const alterado = new Date(r.atualizadoEm)
  return Number.isNaN(alterado.getTime()) ? r.atualizadoEm.slice(0, 10) : diaLocal(alterado)
}

/** D-1404: da avaliação mais nova à mais velha; na mesma data, a alterada por último primeiro. */
export function avaliacoesDoPaciente(pacienteId: string, registros: readonly CasoSalvo[]): AvaliacaoNaLista[] {
  return registros
    .filter((r) => r.caso.pacienteId === pacienteId && r.caso.modo === 'completo')
    .map((registro) => ({ casoId: registro.caso.id, data: dataDaAvaliacao(registro), registro }))
    .sort((a, b) => b.data.localeCompare(a.data) || b.registro.atualizadoEm.localeCompare(a.registro.atualizadoEm))
}

/** D-1401: a avaliação que a aba "Antropometria" da ficha abre. */
export function avaliacaoMaisRecente(pacienteId: string, registros: readonly CasoSalvo[]): AvaliacaoNaLista | null {
  return avaliacoesDoPaciente(pacienteId, registros)[0] ?? null
}

/** "Primeira avaliação" ou "Retorno · 4ª avaliação", pela ordem das datas (pesquisa 7.3, bloco 3); fora da lista, `null`. */
export function tipoDaAvaliacao(casoId: string, avaliacoes: readonly AvaliacaoNaLista[]): string | null {
  const daMaisVelha = [...avaliacoes].reverse()
  const posicao = daMaisVelha.findIndex((a) => a.casoId === casoId)
  if (posicao < 0) return null
  return posicao === 0 ? 'Primeira avaliação' : `Retorno · ${posicao + 1}ª avaliação`
}

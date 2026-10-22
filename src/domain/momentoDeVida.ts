// Gestação e lactação moram na ficha e andam sozinhas com o calendário (spec ficha-unica, D-342 e D-343). A ficha
// guarda as semanas com a data em que foram informadas, ou a data do parto; o plano recebe a condição na data da
// consulta dele.
import { FAIXAS } from './caso.ts'
import type { CondicaoFisiologica } from './tipos.ts'

/** D-455: lactante é quem amamenta; quem teve bebê e não amamenta marca "Não". */
export type Amamentacao = 'exclusiva' | 'mista'

export const AMAMENTACOES: readonly { readonly valor: Amamentacao; readonly rotulo: string }[] = [
  { valor: 'exclusiva', rotulo: 'Só no peito' },
  { valor: 'mista', rotulo: 'Peito e outros alimentos' },
]

/** A opção que saiu (D-455): gravada antes com "Lactante", é lida como "Não" (o plano já não era de lactante). */
const NAO_AMAMENTA = 'nao-amamenta'

export type MomentoDeVida =
  | { readonly tipo: 'nenhum' }
  | {
      readonly tipo: 'gestante'
      /** A idade gestacional informada, em semanas. */
      readonly semanas: number | null
      /** O dia (AAAA-MM-DD) em que as semanas foram informadas. */
      readonly semanasEm: string | null
      readonly pesoPreGestacionalKg: number | null
    }
  | { readonly tipo: 'lactante'; readonly dataDoParto: string | null; readonly amamentacao: Amamentacao | null }

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/

/** O dia no calendário, sem fuso: `null` quando a data não se lê. */
export function lerDia(texto: unknown): Date | null {
  if (typeof texto !== 'string') return null
  const m = DIA.exec(texto)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia ? data : null
}

const diaValido = (texto: unknown): string | null => (lerDia(texto) ? (texto as string) : null)

/** Dias de `de` até `ate` (negativo quando `ate` vem antes). */
export function diasEntreDias(de: string, ate: string): number | null {
  const a = lerDia(de)
  const b = lerDia(ate)
  return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) : null
}

/** Meses completos de `inicio` até `fim`; `null` quando `fim` vem antes. */
export function mesesEntre(inicio: string, fim: string): number | null {
  const a = lerDia(inicio)
  const b = lerDia(fim)
  if (!a || !b || b < a) return null
  let meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  if (b.getUTCDate() < a.getUTCDate()) meses -= 1
  return meses
}

const numeroPositivo = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)
const numeroInteiro = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null)

/** D-365: o que está guardado; tipo que não se lê é "não informado" (`null`), campo estragado vira vazio. */
export function lerMomento(valor: unknown): MomentoDeVida | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null
  const o = valor as Record<string, unknown>
  if (o['tipo'] === 'nenhum') return { tipo: 'nenhum' }
  if (o['tipo'] === 'gestante') {
    return {
      tipo: 'gestante',
      semanas: numeroInteiro(o['semanas']),
      semanasEm: diaValido(o['semanasEm']),
      pesoPreGestacionalKg: numeroPositivo(o['pesoPreGestacionalKg']),
    }
  }
  if (o['tipo'] === 'lactante') {
    if (o['amamentacao'] === NAO_AMAMENTA) return { tipo: 'nenhum' }
    const amamentacao = AMAMENTACOES.find((a) => a.valor === o['amamentacao'])?.valor ?? null
    return { tipo: 'lactante', dataDoParto: diaValido(o['dataDoParto']), amamentacao }
  }
  return null
}

export type MomentoGestante = Extract<MomentoDeVida, { tipo: 'gestante' }>

/** As semanas de gestação no dia pedido: as informadas mais as semanas que se passaram (CA-1039). */
export function semanasNaData(momento: MomentoGestante, dia: string): number | null {
  if (momento.semanas === null || momento.semanasEm === null) return null
  const dias = diasEntreDias(momento.semanasEm, dia)
  return dias === null ? null : momento.semanas + Math.floor(dias / 7)
}

/** D-343: a condição do plano na data da consulta. */
export function condicaoNaData(momento: MomentoDeVida | null, dia: string): CondicaoFisiologica {
  if (momento === null || momento.tipo === 'nenhum') return { tipo: 'nenhuma' }
  if (momento.tipo === 'gestante') {
    if (momento.semanas === null || momento.semanasEm === null) return { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: momento.pesoPreGestacionalKg }
    const semanas = semanasNaData(momento, dia)
    if (semanas === null || semanas < FAIXAS.semanasGestacao.min || semanas > FAIXAS.semanasGestacao.max) return { tipo: 'nenhuma' }
    return { tipo: 'gestante', semanasGestacao: semanas, pesoPreGestacionalKg: momento.pesoPreGestacionalKg }
  }
  if (momento.dataDoParto === null) return { tipo: 'lactante', mesesPosParto: null }
  const meses = mesesEntre(momento.dataDoParto, dia)
  // D-457: acima de 60 meses do parto não há referência de lactação; a ficha e a etapa 1 avisam.
  if (meses === null || meses > FAIXAS.mesesPosParto.max) return { tipo: 'nenhuma' }
  // D-456: a amamentação com outros alimentos muda a energia; só no peito (ou sem resposta) é a de sempre.
  return momento.amamentacao === 'mista' ? { tipo: 'lactante', mesesPosParto: meses, amamentacao: 'mista' } : { tipo: 'lactante', mesesPosParto: meses }
}

/** O dia `meses` antes de `dia`, no mesmo dia do mês (ou no último dia, quando o mês é mais curto). */
function mesesAntes(dia: string, meses: number): string | null {
  const data = lerDia(dia)
  if (!data) return null
  const alvo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() - meses, 1))
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(data.getUTCDate(), ultimoDia))
  return alvo.toISOString().slice(0, 10)
}

/** D-344, "Levar para a ficha": a condição que o plano antigo gravou, como momento da ficha. */
export function momentoDaCondicao(condicao: CondicaoFisiologica, dia: string): MomentoDeVida {
  if (condicao.tipo === 'gestante') {
    return {
      tipo: 'gestante',
      semanas: condicao.semanasGestacao,
      semanasEm: condicao.semanasGestacao === null ? null : dia,
      pesoPreGestacionalKg: condicao.pesoPreGestacionalKg,
    }
  }
  if (condicao.tipo === 'lactante') {
    return { tipo: 'lactante', dataDoParto: condicao.mesesPosParto === null ? null : mesesAntes(dia, condicao.mesesPosParto), amamentacao: null }
  }
  return { tipo: 'nenhum' }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** "Gestante, 28 semanas" ou "Lactante, 3 meses após o parto", no dia pedido; `null` sem gestação nem lactação. */
export function descricaoDoMomento(momento: MomentoDeVida | null, dia: string): string | null {
  if (momento === null || momento.tipo === 'nenhum') return null
  if (momento.tipo === 'gestante') {
    const semanas = semanasNaData(momento, dia)
    return semanas === null ? 'Gestante' : `Gestante, ${plural(semanas, 'semana', 'semanas')}`
  }
  const meses = momento.dataDoParto === null ? null : mesesEntre(momento.dataDoParto, dia)
  return meses === null ? 'Lactante' : `Lactante, ${plural(meses, 'mês', 'meses')} após o parto`
}

// O retorno marcado (spec whatsapp-e-retorno): a próxima consulta de cada paciente e os
// aniversários, contados no fuso de Brasília, para o Painel responder "quem eu atendo esta semana?".
import type { Acompanhamento } from './acompanhamento.ts'
import { dataCompleta, dataCurta, diaDaSemana } from './formatarData.ts'
import type { Paciente } from './pacientes.ts'

export interface Consulta {
  /** AAAA-MM-DD, na hora de Brasília. */
  readonly dia: string
  /** HH:MM, ou nulo quando o horário ainda não foi marcado. */
  readonly hora: string | null
}

const DIA = /^(\d{4})-(\d{2})-(\d{2})$/
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

/** O primeiro ano aceito. No meio da digitação o navegador manda anos como 0002 e 0202 (CA-514). */
const PRIMEIRO_ANO = 1900

/** O dia existe no calendário (2026-02-30 não existe) e é de 1900 em diante. */
export function diaValido(dia: string): boolean {
  const m = DIA.exec(dia)
  if (!m) return false
  const [ano, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (ano < PRIMEIRO_ANO) return false
  const data = new Date(Date.UTC(ano, mes - 1, d))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === d
}

/**
 * Lê o `proximaConsulta` da ficha: `AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM` (D-143). Qualquer outra coisa,
 * inclusive o campo ausente da ficha antiga, é "sem consulta" (CA-526).
 */
export function lerConsulta(valor: unknown): Consulta | null {
  if (typeof valor !== 'string') return null
  const [dia = '', hora, ...resto] = valor.split('T')
  if (resto.length > 0 || !diaValido(dia)) return null
  if (hora === undefined) return { dia, hora: null }
  return HORA.test(hora) ? { dia, hora } : null
}

/** O valor guardado na ficha. Sem dia, nada (CB-149); horário com segundos fica HH:MM; horário inválido sai. */
export function escreverConsulta(dia: string, hora: string): string | null {
  if (!diaValido(dia)) return null
  const hhmm = hora.slice(0, 5)
  return HORA.test(hhmm) ? `${dia}T${hhmm}` : dia
}

export interface Momento {
  readonly dia: string
  readonly hora: string
}

const BRASILIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Dia e hora agora em Brasília, seja qual for o fuso do aparelho (D-144). */
export function agoraEmBrasilia(agora: Date): Momento {
  const partes = new Map(BRASILIA.formatToParts(agora).map((p) => [p.type, p.value]))
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.get(tipo) ?? '00'
  return { dia: `${parte('year')}-${parte('month')}-${parte('day')}`, hora: `${parte('hour')}:${parte('minute')}` }
}

/** O dia de calendário `n` dias depois (ou antes, com `n` negativo). */
export function somarDias(dia: string, n: number): string {
  const [ano, mes, d] = dia.split('-').map(Number)
  const data = new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, (d ?? 1) + n))
  return data.toISOString().slice(0, 10)
}

/** Quanto tempo a consulta continua no Painel depois do horário: o paciente que atrasa, a consulta em andamento. */
export const TOLERANCIA_EM_MINUTOS = 60

/** Minutos desde 1970 de um dia e hora de Brasília; só serve para comparar dois deles. */
const minutos = (dia: string, hora: string): number => Date.parse(`${dia}T${hora}:00Z`) / 60_000

/** Com horário, passou 1 hora depois do horário; sem horário, quando o dia acaba (D-145). */
export function consultaPassou(consulta: Consulta, agora: Momento): boolean {
  if (consulta.hora === null) return consulta.dia < agora.dia
  return minutos(agora.dia, agora.hora) > minutos(consulta.dia, consulta.hora) + TOLERANCIA_EM_MINUTOS
}

/** Os 7 dias corridos do bloco: hoje e os 6 seguintes (D-144). */
export const DIAS_DA_SEMANA = 7

/**
 * Quando, para quem lê: "hoje às 14:30", "amanhã", "sexta, 16/10 às 10:00" até 6 dias,
 * "30/10" mais longe, e com o ano quando é outro.
 */
export function quando(consulta: Consulta, hoje: string): string {
  const distancia = Math.round((Date.parse(`${consulta.dia}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000)
  const dia =
    distancia === 0
      ? 'hoje'
      : distancia === 1
        ? 'amanhã'
        : distancia > 1 && distancia < DIAS_DA_SEMANA
          ? `${diaDaSemana(consulta.dia).replace('-feira', '')}, ${dataCurta(consulta.dia)}`
          : consulta.dia.slice(0, 4) === hoje.slice(0, 4)
            ? dataCurta(consulta.dia)
            : dataCompleta(consulta.dia)
  return consulta.hora ? `${dia} às ${consulta.hora}` : dia
}

/** "sexta, 16/10" → "Sexta, 16/10", para o começo da linha. */
export function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const ehBissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0

/**
 * O dia do aniversário entre hoje e os 6 dias seguintes, ou nulo (D-148). Quem nasceu em 29/02
 * faz aniversário em 28/02 nos anos que não são bissextos (CB-146).
 */
export function aniversarioNaJanela(nascimento: string | null, hoje: string, dias: number = DIAS_DA_SEMANA): string | null {
  if (!nascimento || !diaValido(nascimento)) return null
  const mesDia = nascimento.slice(5)
  for (let i = 0; i < dias; i += 1) {
    const dia = somarDias(hoje, i)
    const ano = Number(dia.slice(0, 4))
    if (ano <= Number(nascimento.slice(0, 4))) continue
    const noAno = mesDia === '02-29' && !ehBissexto(ano) ? '02-28' : mesDia
    if (dia.slice(5) === noAno) return dia
  }
  return null
}

export type ItemAgenda =
  | { readonly tipo: 'consulta'; readonly paciente: Paciente; readonly dia: string; readonly hora: string | null }
  | { readonly tipo: 'aniversario'; readonly paciente: Paciente; readonly dia: string; readonly hora: null }

/**
 * O bloco "Hoje e esta semana" (D-146): as consultas que ainda não passaram e os aniversários de
 * hoje até 6 dias. Por dia; no mesmo dia, o aniversário primeiro e as consultas por horário.
 */
export function agendaDaSemana(pacientes: readonly Paciente[], agora: Momento): readonly ItemAgenda[] {
  const ultimo = somarDias(agora.dia, DIAS_DA_SEMANA - 1)
  const itens: ItemAgenda[] = []
  for (const paciente of pacientes) {
    const consulta = lerConsulta(paciente.proximaConsulta)
    if (consulta && consulta.dia <= ultimo && !consultaPassou(consulta, agora)) {
      itens.push({ tipo: 'consulta', paciente, dia: consulta.dia, hora: consulta.hora })
    }
    const aniversario = aniversarioNaJanela(paciente.nascimento, agora.dia)
    if (aniversario) itens.push({ tipo: 'aniversario', paciente, dia: aniversario, hora: null })
  }
  const ordem = (i: ItemAgenda) => `${i.dia} ${i.tipo === 'aniversario' ? '0' : '1'} ${i.hora ?? ''}`
  return itens.sort((a, b) => ordem(a).localeCompare(ordem(b)) || a.paciente.nome.localeCompare(b.paciente.nome, 'pt-BR'))
}

/**
 * O paciente de um link, com uma regra só em todo lugar (D-147): o paciente do plano primeiro, porque o
 * plano pode ter sido trocado de paciente depois de gerar o link; o gravado no link só vale quando o plano
 * não tem paciente ou não existe mais. O cartão do link segue a mesma regra.
 */
export function pacienteDoAcompanhamento(
  acompanhamento: Acompanhamento,
  casos: readonly { readonly id: string; readonly pacienteId: string | null }[],
): string | null {
  return casos.find((c) => c.id === acompanhamento.casoId)?.pacienteId ?? acompanhamento.pacienteId ?? null
}

/** O link mais recente de cada paciente: é dele o estado que o Painel mostra (D-147, CB-145). */
export function ultimoLinkPorPaciente(
  acompanhamentos: readonly Acompanhamento[],
  casos: readonly { readonly id: string; readonly pacienteId: string | null }[],
): ReadonlyMap<string, Acompanhamento> {
  const mapa = new Map<string, Acompanhamento>()
  for (const acompanhamento of acompanhamentos) {
    const pacienteId = pacienteDoAcompanhamento(acompanhamento, casos)
    if (pacienteId === null) continue
    const atual = mapa.get(pacienteId)
    if (!atual || acompanhamento.criadoEm > atual.criadoEm) mapa.set(pacienteId, acompanhamento)
  }
  return mapa
}

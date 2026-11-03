// O que fica da importação depois dela (spec importar-pacientes, D-912, D-913): quem sai no "Desfazer" e a linha das
// 24 horas em Pacientes. Não importa os leitores de planilha: este arquivo vai no pacote principal, junto com a lista de
// pacientes; a tela de importar é um pedaço separado (DP-IP-1).
import type { Acompanhamento } from '../acompanhamento.ts'
import type { Paciente } from '../pacientes.ts'
import { pacienteDoAcompanhamento } from '../retorno.ts'

/** D-913: o "Desfazer" fica na linha de Pacientes por 24 horas. */
export const JANELA_DO_DESFAZER_MS = 24 * 60 * 60 * 1000

interface CasoDoPaciente {
  readonly id: string
  readonly pacienteId: string | null
}

export interface Desfazer {
  /** Os ids que saem: os da importação que não mudaram desde então. */
  readonly saem: readonly string[]
  /** Os da importação que ficam porque já foram mudados. */
  readonly ficam: number
}

/**
 * D-913 e DP-IP-19: sai o paciente daquela importação que ainda existe, sem edição na ficha (o `atualizadoEm` é a hora
 * da importação), sem plano e sem link (o do plano dele ou o que aponta para ele). O excluído à mão já não está na
 * lista e não conta (CB-917).
 */
export function pacientesQueSaem(importacaoId: string, pacientes: readonly Paciente[], casos: readonly CasoDoPaciente[], acompanhamentos: readonly Acompanhamento[]): Desfazer {
  const daImportacao = pacientes.filter((p) => p.importacao?.id === importacaoId)
  const comPlano = new Set(casos.flatMap((c) => (c.pacienteId === null ? [] : [c.pacienteId])))
  const comLink = new Set(acompanhamentos.flatMap((a) => [pacienteDoAcompanhamento(a, casos), a.pacienteId].filter((id): id is string => id !== null)))
  const saem = daImportacao.filter((p) => p.atualizadoEm === p.importacao?.em && !comPlano.has(p.id) && !comLink.has(p.id)).map((p) => p.id)
  return { saem, ficam: daImportacao.length - saem.length }
}

export interface ImportacaoRecente {
  readonly id: string
  readonly em: string
  /** Quantos pacientes daquela importação continuam na conta. */
  readonly pacientes: number
  /** Quantos sairiam no "Desfazer". */
  readonly desfaziveis: number
}

/** DP-IP-20: as importações de menos de 24 horas que ainda têm quem desfazer, a mais nova primeiro. */
export function importacoesRecentes(pacientes: readonly Paciente[], casos: readonly CasoDoPaciente[], acompanhamentos: readonly Acompanhamento[], agora: Date): ImportacaoRecente[] {
  const porId = new Map<string, { em: string; pacientes: number }>()
  for (const paciente of pacientes) {
    const importacao = paciente.importacao
    if (importacao === null) continue
    const decorrido = agora.getTime() - Date.parse(importacao.em)
    if (!(decorrido < JANELA_DO_DESFAZER_MS) || decorrido < -JANELA_DO_DESFAZER_MS) continue
    const atual = porId.get(importacao.id)
    porId.set(importacao.id, { em: importacao.em, pacientes: (atual?.pacientes ?? 0) + 1 })
  }
  return [...porId.entries()]
    .map(([id, { em, pacientes: quantos }]) => ({ id, em, pacientes: quantos, desfaziveis: pacientesQueSaem(id, pacientes, casos, acompanhamentos).saem.length }))
    .filter((importacao) => importacao.desfaziveis > 0)
    .sort((a, b) => b.em.localeCompare(a.em))
}

const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const inicioDoDia = (d: Date): number => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** "Importação de hoje, 14:32" ou "Importação de ontem, 22:10", no relógio de quem usa (D-913). */
export function rotuloDaImportacao(em: string, agora: Date): string {
  const quando = new Date(em)
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(quando)) / 86_400_000)
  return `Importação de ${dias >= 1 ? 'ontem' : 'hoje'}, ${HORA.format(quando)}`
}

const DIA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** CA-1937: o dia da importação no relógio de quem usa ("Importado em 29/10/2026"). */
export function diaDaImportacao(em: string): string {
  const quando = new Date(em)
  return Number.isNaN(quando.getTime()) ? '' : DIA.format(quando)
}

/** CA-1941 e CA-1942: o que a tela diz depois do "Desfazer". */
export function textoDoDesfeito(ficaram: number): string {
  if (ficaram === 0) return 'Importação desfeita.'
  return ficaram === 1 ? 'Importação desfeita. 1 paciente ficou porque já foi mudado.' : `Importação desfeita. ${ficaram} pacientes ficaram porque já foram mudados.`
}

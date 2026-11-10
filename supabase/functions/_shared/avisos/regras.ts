// As regras dos avisos ao paciente (spec lado-do-paciente, D-1228 a D-1232): quando sai o lembrete (A3 e A4), o resumo
// da semana (A2) e o aviso de plano atualizado (A1), a janela de envio e o limite por endereço. Também o próximo aviso
// de um link, que a ficha mostra em "Próximo e-mail" (DP-LP-25): a ficha e a função `avisos` decidem com o mesmo código.
//
// Puro: sem Deno, sem rede e sem relógio solto; o "agora" chega de fora. Os dias são os de Brasília (CB-1206); a hora de
// Brasília é UTC−3 o ano inteiro, sem horário de verão desde 2019 (CB-1215).
import { diasEntre, diasMarcadosNaSemana, ultimaMarcacao, type MarcacaoDia } from '../adesao.ts'
import type { TipoDeAviso, TipoDeEmail } from './tipos.ts'

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS
/** Brasília está 3 horas atrás do UTC (CB-1215). */
const ATRASO_DE_BRASILIA_MS = 3 * HORA_MS

/** D-1232: os avisos ao paciente só saem das 8h às 21h de Brasília. */
export const INICIO_DA_JANELA = 8
export const FIM_DA_JANELA = 21
/** D-1228: o lembrete sai às 18h; D-1229, o resumo às 8h. */
export const HORA_DO_LEMBRETE = 18
export const HORA_DO_RESUMO = 8
/** D-1230: o A1 sai 30 minutos depois da última atualização. */
export const ESPERA_DO_PLANO_ATUALIZADO_MS = 30 * 60 * 1000

/** D-1228: o A3 sai no terceiro dia seguido sem marcar; o número que ele diz vai de 3 a 6. */
export const DIAS_PARA_O_PRIMEIRO_LEMBRETE = 3
export const DIAS_MAXIMOS_NO_PRIMEIRO_LEMBRETE = 6
/** D-1228: o A4 sai no sétimo dia sem marcar, pelo menos 3 dias depois do A3. */
export const DIAS_PARA_O_SEGUNDO_LEMBRETE = 7
export const DIAS_ENTRE_OS_LEMBRETES = 3
/** D-1229: com 3 resumos seguidos de zero dia marcado, o resumo para sozinho. */
export const RESUMOS_VAZIOS_PARA_PAUSAR = 3
/** D-1232: por endereço, 1 aviso por dia e 3 por semana. */
export const AVISOS_POR_DIA = 1
export const AVISOS_POR_SEMANA = 3

export interface Momento {
  /** AAAA-MM-DD, em Brasília. */
  readonly dia: string
  readonly hora: number
  readonly minuto: number
  /** 0 é domingo. */
  readonly diaDaSemana: number
}

/** O instante em Brasília. */
export function emBrasilia(agora: Date): Momento {
  const local = new Date(agora.getTime() - ATRASO_DE_BRASILIA_MS)
  return { dia: local.toISOString().slice(0, 10), hora: local.getUTCHours(), minuto: local.getUTCMinutes(), diaDaSemana: local.getUTCDay() }
}

/** O dia de Brasília de um instante (ISO ou Date). */
export const diaDeBrasilia = (instante: string | Date): string => emBrasilia(typeof instante === 'string' ? new Date(instante) : instante).dia

/** O instante de um dia de Brasília, na hora dada. */
export function instanteEmBrasilia(dia: string, hora: number, minuto = 0): Date {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + hora * HORA_MS + minuto * 60_000 + ATRASO_DE_BRASILIA_MS)
}

/** O dia `n` dias depois (ou antes, com `n` negativo). */
export const somarDias = (dia: string, n: number): string => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10)

/** O dia da semana de um dia de calendário (0 é domingo). */
export const diaDaSemanaDe = (dia: string): number => new Date(`${dia}T00:00:00Z`).getUTCDay()

/** CA-2251: das 8h às 21h de Brasília. */
export function dentroDaJanela(agora: Date): boolean {
  const { hora } = emBrasilia(agora)
  return hora >= INICIO_DA_JANELA && hora < FIM_DA_JANELA
}

/** O primeiro instante na janela, a partir deste: ele mesmo, as 8h do mesmo dia ou as 8h do dia seguinte. */
export function proximaJanela(instante: Date): Date {
  const { dia, hora } = emBrasilia(instante)
  if (hora < INICIO_DA_JANELA) return instanteEmBrasilia(dia, INICIO_DA_JANELA)
  if (hora >= FIM_DA_JANELA) return instanteEmBrasilia(somarDias(dia, 1), INICIO_DA_JANELA)
  return instante
}

/** O maior dos dias de calendário (AAAA-MM-DD), ignorando os nulos. */
function maisRecente(...dias: readonly (string | null)[]): string | null {
  return dias.reduce<string | null>((a, b) => (b === null ? a : a === null || b > a ? b : a), null)
}

// ---------- O lembrete (A3 e A4) ----------

export interface LembreteEnviado {
  readonly tipo: 'A3' | 'A4'
  /** O dia de Brasília em que saiu. */
  readonly dia: string
}

export interface EstadoDoLembrete {
  /** Hoje, em Brasília. */
  readonly hoje: string
  readonly marcacoes: readonly MarcacaoDia[]
  /** Quando o paciente aceitou o lembrete (ISO). */
  readonly aceitoEm: string
  /** Quando o plano do link mudou por último (ISO); nulo sem a informação. */
  readonly planoEm: string | null
  /** O dia em que o paciente abriu o link por último (D-1223). */
  readonly ultimoAcesso: string | null
  /** Os lembretes que já saíram para este link. */
  readonly lembretes: readonly LembreteEnviado[]
}

export type Lembrete = { readonly tipo: 'A3' | 'A4'; readonly dias: number }

/**
 * D-1228: o dia de onde os dias sem marcar são contados: a última marcação, o aceite ou a atualização do plano, o que
 * for mais recente. Um plano novo, assim, não tem lembrete nos 2 primeiros dias (CA-2246).
 */
export function inicioDaConta(e: Pick<EstadoDoLembrete, 'marcacoes' | 'aceitoEm' | 'planoEm'>): string {
  return maisRecente(ultimaMarcacao(e), diaDeBrasilia(e.aceitoEm), e.planoEm === null ? null : diaDeBrasilia(e.planoEm)) ?? diaDeBrasilia(e.aceitoEm)
}

/**
 * D-1228, CA-2244 a CA-2246 e CB-1207: o lembrete das 18h. O A3 sai no terceiro dia seguido sem marcar, contando hoje,
 * se o paciente não abriu o link hoje (abriu: a regra roda de novo amanhã, e o A3 diz quantos dias são, até 6). O A4 sai
 * no sétimo dia sem marcar, pelo menos 3 dias depois do A3, e depois dele nada até a próxima marcação. Um lembrete que
 * saiu no dia em que a conta recomeçou (a marcação das 18h01) não conta para a pausa nova.
 *
 * `ignorarAcesso`: a previsão da manhã (CA-2250), quando ainda não se sabe se ele vai abrir o link.
 */
export function avaliarLembrete(e: EstadoDoLembrete, opcoes: { readonly ignorarAcesso?: boolean } = {}): Lembrete | null {
  const inicio = inicioDaConta(e)
  const dias = diasEntre(inicio, e.hoje)
  if (Number.isNaN(dias)) return null
  const daPausa = e.lembretes.filter((l) => l.dia > inicio)
  if (daPausa.some((l) => l.tipo === 'A4')) return null
  const ultimoA3 = maisRecente(...daPausa.filter((l) => l.tipo === 'A3').map((l) => l.dia))
  if (ultimoA3 === null) {
    const abriuHoje = !opcoes.ignorarAcesso && e.ultimoAcesso === e.hoje
    return dias >= DIAS_PARA_O_PRIMEIRO_LEMBRETE && dias <= DIAS_MAXIMOS_NO_PRIMEIRO_LEMBRETE && !abriuHoje ? { tipo: 'A3', dias } : null
  }
  return dias >= DIAS_PARA_O_SEGUNDO_LEMBRETE && diasEntre(ultimoA3, e.hoje) >= DIAS_ENTRE_OS_LEMBRETES ? { tipo: 'A4', dias } : null
}

// ---------- O resumo da semana (A2) ----------

/** Como um resumo anterior ficou: os que saíram contam (com os dias marcados); o adiado volta no dia seguinte. */
export interface ResumoAnterior {
  readonly dia: string
  readonly estado: 'enviado' | 'entregue' | 'devolvido' | 'devolucao-temporaria' | 'queixa' | 'adiado' | 'pausado' | 'falhou'
  /** Os dias marcados que o resumo mostrou; nulo no que não saiu. */
  readonly dias: number | null
}

export interface EstadoDoResumo {
  readonly hoje: string
  readonly marcacoes: readonly MarcacaoDia[]
  /** Quantas missões o link tem hoje: a célula diz "3/4". */
  readonly missoes: number
  /** Quando o paciente aceitou o resumo (ISO). */
  readonly aceitoEm: string
  /** O dia da semana do aceite (0 é domingo): o resumo sai nesse dia (D-1229). */
  readonly diaDaSemana: number
  readonly resumos: readonly ResumoAnterior[]
}

export interface DiaDoResumo {
  readonly dia: string
  /** Quantas missões ele marcou no dia; zero é o traço (CA-2247). */
  readonly feitas: number
}

export type Resumo = { readonly tipo: 'A2'; readonly dias: number; readonly missoes: number; readonly semana: readonly DiaDoResumo[] } | { readonly pausado: true }

const SAIU: readonly ResumoAnterior['estado'][] = ['enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa']

/** Os 7 dias que o resumo de hoje mostra: de 7 dias atrás até ontem (CA-2247: de quinta a quarta). */
export function semanaDoResumo(marcacoes: readonly MarcacaoDia[], hoje: string): readonly DiaDoResumo[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(hoje, i - 7)
    return { dia, feitas: marcacoes.find((m) => m.dia === dia)?.feitas.length ?? 0 }
  })
}

/**
 * D-1229, CA-2247 e CA-2248: o resumo das 8h. Sai no dia da semana do aceite (nunca no próprio dia do aceite), com os
 * últimos 7 dias até ontem, na mesma conta da Adesão (`diasMarcadosNaSemana` contada até ontem). O adiado pelo teto sai no
 * dia seguinte (D-1237). Depois de 3 resumos seguidos com zero dia marcado, para sozinho (`pausado`) até a próxima
 * marcação.
 */
export function avaliarResumo(e: EstadoDoResumo): Resumo | null {
  if (e.hoje <= diaDeBrasilia(e.aceitoEm)) return null
  const saidos = e.resumos.filter((r) => SAIU.includes(r.estado)).sort((a, b) => b.dia.localeCompare(a.dia))
  const ultimoSaido = saidos[0]?.dia ?? null
  if (ultimoSaido === e.hoje) return null
  const adiadoPendente = e.resumos.some((r) => r.estado === 'adiado' && r.dia < e.hoje && r.dia >= somarDias(e.hoje, -6) && (ultimoSaido === null || r.dia > ultimoSaido))
  if (diaDaSemanaDe(e.hoje) !== e.diaDaSemana && !adiadoPendente) return null

  const ultimosTres = saidos.slice(0, RESUMOS_VAZIOS_PARA_PAUSAR)
  const marcou = ultimaMarcacao(e)
  if (ultimosTres.length === RESUMOS_VAZIOS_PARA_PAUSAR && ultimosTres.every((r) => r.dias === 0) && (marcou === null || marcou <= (ultimoSaido ?? ''))) {
    return { pausado: true }
  }
  return { tipo: 'A2', dias: diasMarcadosNaSemana(e, somarDias(e.hoje, -1)), missoes: e.missoes, semana: semanaDoResumo(e.marcacoes, e.hoje) }
}

// ---------- O plano atualizado (A1) ----------

/** CA-2249: o A1 sai 30 minutos depois da atualização; fora da janela, às 8h seguintes. */
export const agendarPlanoAtualizado = (atualizadoEm: Date): Date => proximaJanela(new Date(atualizadoEm.getTime() + ESPERA_DO_PLANO_ATUALIZADO_MS))

export interface EstadoDoPlanoAtualizado {
  readonly agora: Date
  /** O A1 agendado (`acompanhamentos.a1_para`); nulo sem A1. */
  readonly a1Para: string | null
  /** Os e-mails que já saíram hoje (Brasília) para este link. */
  readonly enviosDeHoje: readonly TipoDeEmail[]
}

/**
 * D-1230 e CA-2249: na hora de mandar. Antes do horário, ou fora da janela, espera. Com o S2 já enviado hoje, ou com um A1
 * já enviado hoje (um por dia), o A1 é cancelado.
 */
export function avaliarPlanoAtualizado(e: EstadoDoPlanoAtualizado): 'mandar' | 'esperar' | 'cancelar' {
  if (e.a1Para === null) return 'esperar'
  const vence = Date.parse(e.a1Para)
  if (Number.isNaN(vence)) return 'cancelar'
  if (e.agora.getTime() < vence || !dentroDaJanela(e.agora)) return 'esperar'
  return e.enviosDeHoje.includes('S2') || e.enviosDeHoje.includes('A1') ? 'cancelar' : 'mandar'
}

// ---------- O limite por endereço e a prioridade ----------

export interface EnvioDoEndereco {
  readonly linkId: string | null
  readonly nutricionistaId: string | null
  readonly tipo: TipoDeEmail
  /** O dia de Brasília em que saiu. */
  readonly dia: string
}

const AVISOS: readonly TipoDeEmail[] = ['A1', 'A2', 'A3', 'A4']

/**
 * D-1232 e CA-2250: por endereço, 1 aviso por dia e 3 nos últimos 7 dias. `envios` são os avisos que já saíram para o
 * endereço (de qualquer conta). CB-1210: dois links da mesma conta com o mesmo endereço contam cada um por si; um link
 * de outra conta divide o limite do endereço (CB-1200).
 */
export function cabeNoEndereco(envios: readonly EnvioDoEndereco[], alvo: { readonly linkId: string; readonly nutricionistaId: string }, hoje: string): boolean {
  const desdeASemana = somarDias(hoje, -6)
  const contam = envios.filter((e) => AVISOS.includes(e.tipo) && (e.nutricionistaId !== alvo.nutricionistaId || e.linkId === alvo.linkId))
  const hojeN = contam.filter((e) => e.dia === hoje).length
  const semanaN = contam.filter((e) => e.dia >= desdeASemana && e.dia <= hoje).length
  return hojeN < AVISOS_POR_DIA && semanaN < AVISOS_POR_SEMANA
}

/** D-1237: serviço > N1 > A1 > A3/A4 > A2. */
export const PRIORIDADE: Readonly<Record<TipoDeEmail, number>> = { S1: 0, S2: 0, S3: 0, S4: 0, N1: 1, A1: 2, A3: 3, A4: 3, A2: 4 }

/** A fila na ordem da prioridade, mantendo a ordem de chegada entre os iguais. */
export function porPrioridade<T extends { readonly tipo: TipoDeEmail }>(fila: readonly T[]): T[] {
  return fila
    .map((item, ordem) => ({ item, ordem }))
    .sort((a, b) => PRIORIDADE[a.item.tipo] - PRIORIDADE[b.item.tipo] || a.ordem - b.ordem)
    .map(({ item }) => item)
}

// ---------- O próximo aviso de um link (DP-LP-25) ----------

export interface AceiteAtivo {
  readonly tipo: TipoDeAviso
  readonly aceitoEm: string
  readonly diaDaSemana: number
  /** O resumo parado por 3 semanas sem uso (D-1229). */
  readonly pausado: boolean
}

export interface EstadoParaOProximo {
  readonly agora: Date
  readonly marcacoes: readonly MarcacaoDia[]
  readonly planoEm: string | null
  readonly ultimoAcesso: string | null
  readonly a1Para: string | null
  /** Os aceites que valem agora: oferecidos pela nutricionista, do e-mail de agora, sem descadastro. */
  readonly aceites: readonly AceiteAtivo[]
  readonly lembretes: readonly LembreteEnviado[]
}

export interface ProximoAviso {
  readonly tipo: 'A1' | 'A2' | 'A3' | 'A4'
  readonly quando: Date
}

/** A próxima ocorrência do dia da semana às 8h, a partir de agora (hoje, se ainda não deu 8h), depois do dia do aceite. */
function proximoResumo(agora: Date, aceite: AceiteAtivo): Date {
  const { dia, hora } = emBrasilia(agora)
  const diaDoAceite = diaDeBrasilia(aceite.aceitoEm)
  for (let n = 0; n < 8; n++) {
    const candidato = somarDias(dia, n)
    if (candidato <= diaDoAceite || diaDaSemanaDe(candidato) !== aceite.diaDaSemana) continue
    if (n === 0 && hora >= HORA_DO_RESUMO) continue
    return instanteEmBrasilia(candidato, HORA_DO_RESUMO)
  }
  return instanteEmBrasilia(somarDias(dia, 7), HORA_DO_RESUMO)
}

/** O próximo lembrete, supondo que o paciente não marque nem abra o link até lá. */
function proximoLembrete(e: EstadoParaOProximo, aceite: AceiteAtivo): ProximoAviso | null {
  const { dia: hoje, hora } = emBrasilia(e.agora)
  const inicio = inicioDaConta({ marcacoes: e.marcacoes, aceitoEm: aceite.aceitoEm, planoEm: e.planoEm })
  const daPausa = e.lembretes.filter((l) => l.dia > inicio)
  if (daPausa.some((l) => l.tipo === 'A4')) return null
  const ultimoA3 = maisRecente(...daPausa.filter((l) => l.tipo === 'A3').map((l) => l.dia))
  const tipo = ultimoA3 === null ? 'A3' : 'A4'
  const alvo =
    ultimoA3 === null
      ? somarDias(inicio, DIAS_PARA_O_PRIMEIRO_LEMBRETE)
      : (maisRecente(somarDias(inicio, DIAS_PARA_O_SEGUNDO_LEMBRETE), somarDias(ultimoA3, DIAS_ENTRE_OS_LEMBRETES)) ?? hoje)
  // O dia já passou (ele abriu o link): o próximo é hoje às 18h, ou amanhã, se já passou das 18h.
  const dia = alvo > hoje ? alvo : hora < HORA_DO_LEMBRETE ? hoje : somarDias(hoje, 1)
  if (tipo === 'A3' && diasEntre(inicio, dia) > DIAS_MAXIMOS_NO_PRIMEIRO_LEMBRETE) return null
  return { tipo, quando: instanteEmBrasilia(dia, HORA_DO_LEMBRETE) }
}

/**
 * DP-LP-25 e CA-2264: o próximo aviso que a função `avisos` mandaria para este link, se nada mudar: o A1 agendado, o
 * próximo resumo da semana ou o próximo lembrete, o que vier primeiro. Nulo sem aviso a caminho. Não considera o teto
 * nem o limite por endereço (a ficha mostra a intenção; "Enviados" mostra o que aconteceu).
 */
export function proximoAviso(e: EstadoParaOProximo): ProximoAviso | null {
  const candidatos: ProximoAviso[] = []
  if (e.a1Para !== null && e.aceites.some((a) => a.tipo === 'plano')) {
    const vence = new Date(e.a1Para)
    if (!Number.isNaN(vence.getTime())) candidatos.push({ tipo: 'A1', quando: proximaJanela(vence.getTime() > e.agora.getTime() ? vence : e.agora) })
  }
  const semana = e.aceites.find((a) => a.tipo === 'semana' && !a.pausado)
  if (semana) candidatos.push({ tipo: 'A2', quando: proximoResumo(e.agora, semana) })
  const lembrete = e.aceites.find((a) => a.tipo === 'lembrete')
  if (lembrete) {
    const proximo = proximoLembrete(e, lembrete)
    if (proximo) candidatos.push(proximo)
  }
  return candidatos.sort((a, b) => a.quando.getTime() - b.quando.getTime())[0] ?? null
}

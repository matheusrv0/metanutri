// A semana do paciente, no link (spec lado-do-paciente, D-1207 e CA-2211): os últimos 7 dias com as missões de cada um,
// as 4 semanas anteriores e a frase da meta. A conta dos dias é a mesma da Adesão (`diasMarcadosNaSemana`, de
// `supabase/functions/_shared/adesao.ts`): o paciente vê o que a nutricionista vê.
import { diasMarcadosNaSemana, feitasNoDia, DIAS_NA_SEMANA_PARA_EM_DIA, type Acompanhamento } from './acompanhamento.ts'
import { somarDias } from './retorno.ts'

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
const MESES_CURTOS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'] as const

const diaDaSemana = (dia: string): number => new Date(`${dia}T00:00:00Z`).getUTCDay()
const numeroDoDia = (dia: string): number => Number(dia.slice(8, 10))
const numeroDoMes = (dia: string): number => Number(dia.slice(5, 7))

/** "qua", "sáb". */
export const diaCurto = (dia: string): string => DIAS_CURTOS[diaDaSemana(dia)] ?? ''

/** Um dia da semana do paciente, como a coluna de Semana o desenha. */
export interface DiaDaSemana {
  readonly dia: string
  /** "qua". */
  readonly nome: string
  /** "28". */
  readonly numero: string
  readonly feitas: number
  readonly total: number
  /** "3/4", ou "–" no dia sem missão (D-1207: traço, nunca zero). */
  readonly texto: string
  readonly hoje: boolean
  /** Para o leitor de tela: "qua, 28: 3 de 4 missões" ou "qui, 29: nenhuma missão", com ", hoje". */
  readonly rotulo: string
}

/** As missões feitas num dia: as que o paciente marcou. */
const feitasDoDia = (acompanhamento: Acompanhamento, dia: string): number => feitasNoDia(acompanhamento, dia).length

/** D-1207: os últimos 7 dias, do mais antigo (à esquerda) até hoje (à direita, com contorno). */
export function ultimosSeteDias(acompanhamento: Acompanhamento, hoje: string): readonly DiaDaSemana[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(hoje, i - 6)
    const feitas = feitasDoDia(acompanhamento, dia)
    const total = Math.max(acompanhamento.missoes.length, feitas)
    const ehHoje = dia === hoje
    const nome = diaCurto(dia)
    const numero = String(numeroDoDia(dia))
    const quanto = feitas > 0 ? `${feitas} de ${total} ${total === 1 ? 'missão' : 'missões'}` : 'nenhuma missão'
    return {
      dia,
      nome,
      numero,
      feitas,
      total,
      texto: feitas > 0 ? `${feitas}/${total}` : '–',
      hoje: ehHoje,
      rotulo: `${nome}, ${numero}: ${quanto}${ehHoje ? ', hoje' : ''}`,
    }
  })
}

/** "3 de 7 dias". */
export const textoDosDias = (dias: number): string => `${dias} de 7 dias`

/** D-1207: "Dentro da meta." com 4 dias ou mais; senão, "A meta é 4 dias.". */
export const fraseDaMeta = (dias: number): string => (dias >= DIAS_NA_SEMANA_PARA_EM_DIA ? 'Dentro da meta.' : `A meta é ${DIAS_NA_SEMANA_PARA_EM_DIA} dias.`)

/** Os dias marcados nos últimos 7, contando hoje: a conta da Adesão. */
export const diasDaSemana = (acompanhamento: Acompanhamento, hoje: string): number => diasMarcadosNaSemana(acompanhamento, hoje)

export interface SemanaAnterior {
  readonly inicio: string
  readonly fim: string
  /** "21 a 27 de out." ou "30/9 a 6 de out.". */
  readonly datas: string
  readonly dias: number
  /** "5 dias", "1 dia". */
  readonly texto: string
  /** Os 7 dias, do primeiro ao último: com missão ou não. */
  readonly pontos: readonly boolean[]
}

/** "21 a 27 de out."; com dois meses, "30/9 a 6 de out.". */
export function datasDaSemana(inicio: string, fim: string): string {
  const mesDoFim = MESES_CURTOS[numeroDoMes(fim) - 1] ?? ''
  const comeco = numeroDoMes(inicio) === numeroDoMes(fim) ? `${numeroDoDia(inicio)}` : `${numeroDoDia(inicio)}/${numeroDoMes(inicio)}`
  return `${comeco} a ${numeroDoDia(fim)} de ${mesDoFim}`
}

/** D-1207: as 4 semanas antes destes 7 dias, da mais recente para a mais antiga, cada uma de 7 dias corridos. */
export function semanasAnteriores(acompanhamento: Acompanhamento, hoje: string, quantas = 4): readonly SemanaAnterior[] {
  return Array.from({ length: quantas }, (_, k) => {
    const fim = somarDias(hoje, -7 * (k + 1))
    const inicio = somarDias(fim, -6)
    const pontos = Array.from({ length: 7 }, (_, i) => feitasDoDia(acompanhamento, somarDias(inicio, i)) > 0)
    const dias = pontos.filter(Boolean).length
    return { inicio, fim, datas: datasDaSemana(inicio, fim), dias, texto: `${dias} ${dias === 1 ? 'dia' : 'dias'}`, pontos }
  })
}

/** Os 7 pontos da linha da semana em Hoje: com missão ou não, do mais antigo até hoje. */
export const pontosDaSemana = (acompanhamento: Acompanhamento, hoje: string): readonly boolean[] => ultimosSeteDias(acompanhamento, hoje).map((d) => d.feitas > 0)


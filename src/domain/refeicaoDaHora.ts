// A refeição da hora no Plano do link (spec lado-do-paciente, D-1206 e CA-2210): a primeira refeição, na ordem do plano,
// cujo horário mais 1 hora ainda não passou leva "Agora" (de 30 minutos antes até 1 hora depois do horário) ou "Próxima"
// (antes disso), e o Plano abre rolado até ela. Depois da última refeição mais 1 hora, nenhuma tem rótulo.

export type RotuloDaRefeicao = 'Agora' | 'Próxima'

/** Até quantos minutos depois do horário a refeição ainda é "Agora". */
export const AGORA_ATE_MINUTOS = 60
/** A partir de quantos minutos antes do horário a refeição já é "Agora". */
export const AGORA_DESDE_MINUTOS = 30

const HORARIO = /^([01]?\d|2[0-3]):([0-5]\d)$/

/** "12:30" → 750; fora do formato, nulo. */
export function minutosDoHorario(horario: string): number | null {
  const m = HORARIO.exec(horario.trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Os minutos desde a meia-noite, na hora do aparelho (o "hoje" das missões é o do aparelho, CB-1206). */
export const minutosAgora = (agora: Date): number => agora.getHours() * 60 + agora.getMinutes()

/** A refeição marcada e o rótulo, ou nulo. Refeição sem horário que se leia não conta. */
export function refeicaoDaHora(horarios: readonly string[], agora: number): { readonly indice: number; readonly rotulo: RotuloDaRefeicao } | null {
  for (const [indice, horario] of horarios.entries()) {
    const minutos = minutosDoHorario(horario)
    if (minutos === null || agora > minutos + AGORA_ATE_MINUTOS) continue
    return { indice, rotulo: agora >= minutos - AGORA_DESDE_MINUTOS ? 'Agora' : 'Próxima' }
  }
  return null
}

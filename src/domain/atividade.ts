// Atividade das últimas semanas, lida dos planos salvos. Serve ao painel.
import type { ResumoCaso } from './persistencia.ts'

export interface DiaDeAtividade {
  /** AAAA-MM-DD */
  readonly data: string
  /** Rótulo curto para o eixo: "12/09". */
  readonly rotulo: string
  readonly planos: number
}

const DIA_MS = 24 * 60 * 60 * 1000

const soData = (iso: string): string => iso.slice(0, 10)

/** "2026-09-12" → "12/09" */
export function rotuloCurto(data: string): string {
  const [, mes, dia] = data.split('-')
  return dia && mes ? `${dia}/${mes}` : data
}

/**
 * Um ponto por dia, do mais antigo ao mais recente, incluindo os dias sem nada.
 * Sem os dias vazios o gráfico mentiria sobre o ritmo de trabalho.
 */
export function atividadePorDia(casos: readonly ResumoCaso[], dias: number, hoje: Date): readonly DiaDeAtividade[] {
  if (dias <= 0) return []

  const contagem = new Map<string, number>()
  for (const caso of casos) {
    const data = soData(caso.atualizadoEm)
    contagem.set(data, (contagem.get(data) ?? 0) + 1)
  }

  const fim = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  return Array.from({ length: dias }, (_, i) => {
    const data = new Date(fim - (dias - 1 - i) * DIA_MS).toISOString().slice(0, 10)
    return { data, rotulo: rotuloCurto(data), planos: contagem.get(data) ?? 0 }
  })
}

export interface ResumoAtividade {
  readonly total: number
  readonly maior: number
  /** Dias, dentro da janela, em que algum plano foi mexido. */
  readonly diasAtivos: number
}

export function resumirAtividade(dias: readonly DiaDeAtividade[]): ResumoAtividade {
  return {
    total: dias.reduce((soma, d) => soma + d.planos, 0),
    maior: dias.reduce((maior, d) => Math.max(maior, d.planos), 0),
    diasAtivos: dias.filter((d) => d.planos > 0).length,
  }
}

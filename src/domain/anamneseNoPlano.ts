// O que a anamnese leva para o plano (spec ficha-unica, D-356 e seção 4.6 do levantamento): o nível de atividade
// sugerido e os lembretes da etapa 1. É sugestão: a nutricionista escolhe.
import type { RespostaAnamnese } from './anamnese.ts'
import { NIVEIS_ATIVIDADE } from './energia.ts'

export interface SugestaoDeNivel {
  readonly nivelId: string
  readonly fator: number
  /** "Na anamnese: musculação, 4 vezes por semana, 60 minutos por vez. Sugere Moderadamente ativo." */
  readonly frase: string
}

const resposta = (respostas: readonly RespostaAnamnese[], id: string): string => respostas.find((r) => r.perguntaId === id)?.resposta.trim() ?? ''

const inteiro = (texto: string): number | null => (/^\d{1,3}$/.test(texto) ? Number(texto) : null)

/** O índice em `NIVEIS_ATIVIDADE` pelas vezes por semana (D-356); "Extremamente ativo" nunca é sugerido. */
function indicePelasVezes(vezes: number): number {
  if (vezes <= 0) return 0
  if (vezes <= 2) return 1
  if (vezes <= 5) return 2
  return 3
}

const MINUTOS_PARA_CONTAR = 30

export function nivelSugerido(respostas: readonly RespostaAnamnese[]): SugestaoDeNivel | null {
  const pratica = resposta(respostas, 'atividade-pratica')
  let indice: number
  let partes: string[]
  if (pratica === 'Não') {
    indice = 0
    partes = ['não pratica exercício']
  } else if (pratica === 'Sim') {
    const vezes = inteiro(resposta(respostas, 'atividade-vezes'))
    if (vezes === null) return null
    const minutos = inteiro(resposta(respostas, 'atividade-minutos'))
    indice = Math.max(0, indicePelasVezes(vezes) - (minutos !== null && minutos < MINUTOS_PARA_CONTAR ? 1 : 0))
    const tipo = resposta(respostas, 'atividade-tipo')
    partes = [
      ...(tipo ? [tipo.charAt(0).toLowerCase() + tipo.slice(1)] : []),
      `${vezes} ${vezes === 1 ? 'vez' : 'vezes'} por semana`,
      ...(minutos !== null ? [`${minutos} minutos por vez`] : []),
    ]
  } else {
    return null
  }
  const nivel = NIVEIS_ATIVIDADE[indice]
  if (!nivel) return null
  return { nivelId: nivel.id, fator: nivel.fator, frase: `Na anamnese: ${partes.join(', ')}. Sugere ${nivel.rotulo}.` }
}

/** "Na anamnese: 1 litro por dia · urina 5 · Amarelo-escuro"; `null` sem resposta de hidratação. */
export function lembreteDaHidratacao(respostas: readonly RespostaAnamnese[]): string | null {
  const agua = resposta(respostas, 'agua-dia')
  const urina = resposta(respostas, 'cor-da-urina')
  const partes = [agua ? (/por dia/i.test(agua) ? agua : `${agua} por dia`) : null, urina ? `urina ${urina}` : null].filter((p): p is string => p !== null)
  return partes.length === 0 ? null : `Na anamnese: ${partes.join(' · ')}`
}

// Os limites das sugestões com IA e os textos do uso (spec assistente-ia, D-1318 e D-1321). A tabela é a da função
// sugerir-plano: os dois lados dizem o mesmo número. Na P2 ela entra em PLANOS (conta.ts), como pacientes e links.
import { inicioDoMesEmBrasilia, LIMITE_DE_SUGESTOES_IA, type UsoDoMes } from '../../supabase/functions/_shared/iaContrato.ts'
import type { IdPlano } from './conta.ts'

export const MESES: readonly string[] = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const limiteDoPlano = (plano: IdPlano): number => LIMITE_DE_SUGESTOES_IA[plano]

/** O mês de `agora` no calendário de Brasília, pelo nome. */
export function mesDe(agora: Date): string {
  return MESES[inicioDoMesEmBrasilia(agora).getUTCMonth()] ?? ''
}

/** "7 de 20 sugestões em novembro" (o rodapé da gaveta). */
export const textoDoContador = (uso: UsoDoMes, agora: Date): string => `${uso.usados} de ${uso.limite} sugestões em ${mesDe(agora)}`

/** "Renovam em 1º de dezembro", do dia AAAA-MM-DD que a função devolve. */
export function textoDaRenovacao(renovaEm: string): string {
  const mes = MESES[Number(renovaEm.slice(5, 7)) - 1] ?? ''
  return `Renovam em 1º de ${mes}`
}

/** CA-2374: "As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro." */
export const textoDoLimite = (uso: UsoDoMes, agora: Date): string => `As ${uso.limite} sugestões de ${mesDe(agora)} foram usadas. ${textoDaRenovacao(uso.renovaEm)}.`

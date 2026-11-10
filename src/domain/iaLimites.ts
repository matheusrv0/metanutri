// Os limites das sugestões com IA e os textos do uso (spec assistente-ia, D-1318 e D-1321). A tabela e os textos são os
// da função sugerir-plano: os dois lados dizem o mesmo. O limite mora em PLANOS (conta.ts), como pacientes e links (D-1354).
import { mesEmBrasilia, textoDaRenovacao, textoDoLimite as limiteNoMes, type UsoDoMes } from '../../supabase/functions/_shared/iaContrato.ts'
import { PLANO_PADRAO, planoPorId, type IdPlano } from './conta.ts'

export { MESES, textoDaRenovacao } from '../../supabase/functions/_shared/iaContrato.ts'

export const limiteDoPlano = (plano: IdPlano): number => (planoPorId(plano) ?? planoPorId(PLANO_PADRAO))?.limiteSugestoesIa ?? 0

/** O mês de `agora` no calendário de Brasília, pelo nome. */
export const mesDe = (agora: Date): string => mesEmBrasilia(agora)

/** "7 de 20 sugestões em novembro" (o rodapé da gaveta). */
export const textoDoContador = (uso: UsoDoMes, agora: Date): string => `${uso.usados} de ${uso.limite} sugestões em ${mesDe(agora)}`

/** CA-2374: "As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro." */
export const textoDoLimite = (uso: UsoDoMes, agora: Date): string => limiteNoMes(uso.limite, agora)

/** A linha de Conta e assinatura (D-1321): "Renovam em 1º de dezembro". */
export const renovacaoDoUso = (uso: UsoDoMes): string => textoDaRenovacao(uso.renovaEm)

// O portão das tentativas com cartão (spec cobranca-em-producao, D-101; CA-433 a CA-435). Usado pela
// assinar e pela troca de cartão da gerenciar-assinatura (R10). Puro: o banco, o relógio e o registro
// chegam de fora; sem Deno e sem rede.
import { SEM_COBRANCA, UM_DIA_MS } from './cobranca.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type RecusasContadas, type Registro, type RespostaDaFuncao } from './portas.ts'

/** D-101 (CA-433, CA-434): a resposta do portão fechado. */
export const MUITAS_TENTATIVAS = 'Muitas tentativas com cartão recusado. Tente de novo amanhã.'
/** CA-433: com tantas recusas da conta nas últimas 24 h, o portão fecha. */
export const RECUSAS_DA_CONTA_24H = 5
/** CA-434: com tantas recusas do site inteiro na última hora, o portão fecha para todas as contas. */
export const RECUSAS_DO_SITE_1H = 30
/** R7: as tentativas anotadas ficam 7 dias. */
export const TENTATIVAS_FICAM_MS = 7 * UM_DIA_MS

/** O que o portão usa do banco. */
export type BancoDasTentativas = Pick<BancoDaCobranca, 'contarRecusas' | 'anotarTentativa' | 'apagarTentativasAntesDe'>

/** O portão aberto diz quantas recusas seguidas a conta já tinha (CA-435); o fechado, o que responder. */
export type PortaoDasTentativas =
  | { readonly passa: true; readonly seguidas: number }
  | { readonly passa: false; readonly resposta: RespostaDaFuncao }

const mensagemDe = (falha: unknown): string => (falha instanceof Error ? falha.message : String(falha))

/**
 * D-101 (CA-433, CA-434): antes de chamar a operadora com um cartão, conta as recusas. Com 5 da conta
 * em 24 h, ou 30 do site inteiro na última hora, fecha sem chamar a operadora. Sem conseguir contar,
 * ou com uma contagem que não é número, também fecha (R5): responde 502 e não deixa passar.
 */
export async function conferirTentativas(banco: BancoDasTentativas, conta: string, agora: Date, log: Registro): Promise<PortaoDasTentativas> {
  let contadas: RecusasContadas
  try {
    contadas = await banco.contarRecusas(conta, agora)
  } catch (falha) {
    log('Não consegui contar as tentativas de cartão:', mensagemDe(falha))
    return { passa: false, resposta: erro(SEM_COBRANCA, 502) }
  }
  const { daConta24h, seguidasDaConta, doSite1h } = contadas
  if (![daConta24h, seguidasDaConta, doSite1h].every(Number.isFinite)) {
    log('A contagem das tentativas de cartão veio fora do formato:', daConta24h, seguidasDaConta, doSite1h)
    return { passa: false, resposta: erro(SEM_COBRANCA, 502) }
  }
  if (daConta24h >= RECUSAS_DA_CONTA_24H || doSite1h >= RECUSAS_DO_SITE_1H) {
    log('Muitas recusas de cartão; a operadora não foi chamada. Da conta em 24 h:', daConta24h, 'do site em 1 h:', doSite1h)
    return { passa: false, resposta: erro(MUITAS_TENTATIVAS, 429, 'muitas-tentativas') }
  }
  return { passa: true, seguidas: seguidasDaConta }
}

/** R4: só a recusa do cartão conta (o código do banco ou "recusado"); token vencido e outra falha, não. */
export const ehRecusaDoCartao = (codigo: string): boolean => codigo === 'recusado' || codigo.startsWith('cc_rejected_')

/** R4 e R7: anota a tentativa e apaga as de mais de 7 dias. A falha só vai para o registro. */
export async function anotarTentativaDeCartao(banco: BancoDasTentativas, conta: string, recusada: boolean, agora: Date, log: Registro): Promise<void> {
  try {
    await banco.anotarTentativa(conta, recusada)
    await banco.apagarTentativasAntesDe(new Date(agora.getTime() - TENTATIVAS_FICAM_MS))
  } catch (falha) {
    log('Não consegui anotar a tentativa de cartão:', mensagemDe(falha))
  }
}

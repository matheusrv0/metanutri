// O limite de chamadas à operadora por conta (spec seguranca-lote-2, D-108; CA-448, CA-449, CB-113 a
// CB-115). Usado pela assinar e pelas três ações da gerenciar-assinatura, logo antes de cada chamada à
// operadora. Puro: o banco, o relógio e o registro chegam de fora; sem Deno e sem rede.
import { UM_DIA_MS } from './cobranca.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type Registro, type RespostaDaFuncao, type TipoDeChamada } from './portas.ts'

/** D-108 (CA-448 e CA-449): a resposta do limite atingido. */
export const MUITAS_CHAMADAS = 'Muitas tentativas seguidas. Espere uma hora e tente de novo.'
/** D-108: quantas chamadas de cada tipo a conta faz por hora. */
export const LIMITE_DE_CHAMADAS: Readonly<Record<TipoDeChamada, number>> = { cartao: 10, conferir: 20 }
/** A janela do limite: a última hora, estrita (a chamada de exatamente 1 h atrás já não conta). */
export const JANELA_DAS_CHAMADAS_MS = 60 * 60 * 1000
/** As chamadas anotadas ficam 2 dias. */
export const CHAMADAS_FICAM_MS = 2 * UM_DIA_MS

/** O que o limite usa do banco. */
export type BancoDasChamadas = Pick<BancoDaCobranca, 'anotarChamada' | 'apagarChamadasAntesDe'>

const mensagemDe = (falha: unknown): string => (falha instanceof Error ? falha.message : String(falha))

/**
 * D-108: anota a chamada que a função vai fazer à operadora, se ela ainda couber no limite da conta.
 * Nulo: anotou, e a função segue para a operadora. Senão, o que responder: 429 com o limite cheio
 * (CA-448, CA-449) ou 502 com `semContagem` quando o banco não respondeu (CB-114). Contar e anotar são
 * um passo só no banco (CB-115). Quem chama faz isso logo antes da chamada: só conta o pedido que de
 * fato chega à operadora, com qualquer resultado.
 */
export async function conferirChamadas(
  banco: BancoDasChamadas,
  conta: string,
  tipo: TipoDeChamada,
  agora: Date,
  log: Registro,
  semContagem: string,
): Promise<RespostaDaFuncao | null> {
  let coube: boolean
  try {
    coube = await banco.anotarChamada(conta, tipo, LIMITE_DE_CHAMADAS[tipo], new Date(agora.getTime() - JANELA_DAS_CHAMADAS_MS))
  } catch (falha) {
    log('Não consegui contar as chamadas à operadora:', mensagemDe(falha))
    return erro(semContagem, 502)
  }
  if (!coube) {
    log('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', tipo)
    return erro(MUITAS_CHAMADAS, 429, 'muitas-chamadas')
  }
  try {
    await banco.apagarChamadasAntesDe(new Date(agora.getTime() - CHAMADAS_FICAM_MS))
  } catch (falha) {
    log('Não consegui apagar as chamadas antigas à operadora:', mensagemDe(falha))
  }
  return null
}

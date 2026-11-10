// A função `webhook-resend` (spec lado-do-paciente, D-1236, D-1239, CA-2277, CA-2278): os eventos do Resend, com a
// assinatura do Svix conferida antes de qualquer coisa (DP-LP-18). Entregue vira "Entregue"; devolução definitiva e
// queixa põem o endereço na supressão (nenhum aviso vai mais para ele, de nenhuma conta); a devolução temporária só
// suprime na terceira em 30 dias (CB-1212). A queixa também para os e-mails do plano daquele link (CB-1213). Depois de
// cada evento, a reputação dos últimos 7 dias decide a pausa automática. Puro: o banco e o relógio chegam de fora.
import { assinaturaConfere } from './svix.ts'
import type { BancoDosAvisos, EstadoDoEnvio, Registro, RespostaDaFuncao } from './portas.ts'
import { JANELA_DA_REPUTACAO_MS, motivoDaPausa } from './reputacao.ts'

/** CB-1212: três devoluções temporárias em 30 dias viram definitiva. */
export const DEVOLUCOES_TEMPORARIAS_PARA_SUPRIMIR = 3
const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000

export interface PedidoDoWebhook {
  readonly metodo: string
  /** O corpo como chegou, para conferir a assinatura. */
  readonly corpo: string
  readonly id: string | null
  readonly momento: string | null
  readonly assinaturas: string | null
}

export interface DependenciasDoWebhook {
  readonly banco: BancoDosAvisos
  readonly agora: () => Date
  readonly log: Registro
  /** `RESEND_WEBHOOK_SECRET`. */
  readonly segredo: string | null
}

const objeto = (valor: unknown): Readonly<Record<string, unknown>> => (typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {})

/** O estado que o evento dá ao envio; nulo: o evento não muda nada aqui. */
function estadoDoEvento(tipo: unknown, dados: Readonly<Record<string, unknown>>): EstadoDoEnvio | null {
  if (tipo === 'email.delivered') return 'entregue'
  if (tipo === 'email.complained') return 'queixa'
  if (tipo === 'email.bounced') return objeto(dados['bounce'])['type'] === 'Permanent' ? 'devolvido' : 'devolucao-temporaria'
  return null
}

export async function receberEventoDoResend(pedido: PedidoDoWebhook, deps: DependenciasDoWebhook): Promise<RespostaDaFuncao> {
  if (pedido.metodo !== 'POST') return { status: 405, corpo: { erro: 'Use POST.' } }
  const agora = deps.agora()
  // CA-2277: com a assinatura errada (ou sem o segredo configurado), nada muda.
  const confere = await assinaturaConfere({ segredo: deps.segredo, id: pedido.id, momento: pedido.momento, assinaturas: pedido.assinaturas, corpo: pedido.corpo, agora })
  if (!confere) return { status: 401, corpo: { erro: 'Assinatura do evento ausente ou errada.' } }

  let evento: Readonly<Record<string, unknown>>
  try {
    evento = objeto(JSON.parse(pedido.corpo))
  } catch {
    return { status: 400, corpo: { erro: 'O evento não é JSON.' } }
  }
  const dados = objeto(evento['data'])
  const estado = estadoDoEvento(evento['type'], dados)
  const resendId = typeof dados['email_id'] === 'string' ? dados['email_id'] : null
  if (estado === null || resendId === null) return { status: 200, corpo: { ignorado: true } }

  const envio = await deps.banco.envioPorResendId(resendId)
  // Um e-mail que não é dos avisos (os códigos de conta saem de outro domínio): nada a fazer.
  if (envio === null) return { status: 200, corpo: { ignorado: true } }
  // A entrega não desfaz uma devolução ou uma queixa que chegou antes.
  if (estado !== 'entregue' || envio.estado === 'enviado') await deps.banco.mudarEstadoPeloResend(resendId, estado)

  if (estado === 'devolvido') await deps.banco.suprimir(envio.emailHash, 'devolvido')
  if (estado === 'devolucao-temporaria') {
    const seguidas = await deps.banco.contarDevolucoesTemporarias(envio.emailHash, new Date(agora.getTime() - TRINTA_DIAS_MS))
    if (seguidas >= DEVOLUCOES_TEMPORARIAS_PARA_SUPRIMIR) await deps.banco.suprimir(envio.emailHash, 'devolvido')
  }
  if (estado === 'queixa') {
    await deps.banco.suprimir(envio.emailHash, 'queixa')
    // CB-1213: quem marcou como spam um e-mail do plano não recebe mais nenhum dele (nem o S2).
    if (envio.linkId !== null) await deps.banco.pararTudo(envio.linkId, agora.toISOString())
  }

  if (estado !== 'entregue') {
    const motivo = motivoDaPausa(await deps.banco.taxasDesde(new Date(agora.getTime() - JANELA_DA_REPUTACAO_MS)))
    if (motivo !== null && (await deps.banco.estadoDosAvisos()).pausadoEm === null) {
      await deps.banco.pausarAvisos(motivo, agora)
      deps.log('Avisos pausados pela reputação:', motivo)
    }
  }
  return { status: 200, corpo: { ok: true } }
}

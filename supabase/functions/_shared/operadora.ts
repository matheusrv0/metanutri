// O caminho até a API da operadora de pagamento (Mercado Pago) e o cancelamento que as três funções
// fazem igual (spec cobranca-em-producao, D-88). Usa só o fetch padrão: roda no Deno e no Node, e o
// Vitest testa com um fetch de mentira (src/data/servidorOperadora.test.ts).
import { objeto, traduzirStatus } from './cobranca.ts'
import type { Operadora } from './portas.ts'

export const API_DA_OPERADORA = 'https://api.mercadopago.com'

export interface PrazosDaOperadora {
  /** GET e PUT. */
  readonly prazoMs: number
  /** POST (criar a assinatura): o banco confere o cartão nesse tempo. */
  readonly prazoDoPostMs: number
}

export function criarOperadora(token: string, prazos: PrazosDaOperadora, buscar: typeof fetch = fetch): Operadora {
  return async (metodo, caminho, corpo) => {
    try {
      const resposta = await buscar(`${API_DA_OPERADORA}${caminho}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
        signal: AbortSignal.timeout(metodo === 'POST' ? prazos.prazoDoPostMs : prazos.prazoMs),
      })
      const dados: unknown = await resposta.json().catch(() => null)
      return { ok: resposta.ok, status: resposta.status, dados: objeto(dados) }
    } catch {
      return null
    }
  }
}

export interface CancelamentoNaOperadora {
  /** A assinatura ficou cancelada lá. */
  readonly cancelada: boolean
  /** O status HTTP do último pedido de cancelar (PUT); nulo sem resposta. Só o número vai para o registro, nunca o corpo. */
  readonly ultimoStatus: number | null
}

/**
 * Cancela a assinatura na operadora e diz se ela ficou cancelada lá, com o status do último pedido.
 * Pede com "cancelled". Se a operadora recusar a palavra (4xx que não é a nossa credencial), pede com
 * "canceled", como a documentação em português escreve. Sem sucesso, lê de novo: a resposta pode ter
 * se perdido com o cancelamento feito (CB-93).
 */
export async function tentarCancelarNaOperadora(operadora: Operadora, id: string): Promise<CancelamentoNaOperadora> {
  const caminho = `/preapproval/${encodeURIComponent(id)}`
  let feito = await operadora('PUT', caminho, { status: 'cancelled' })
  if (feito && !feito.ok && feito.status < 500 && feito.status !== 401 && feito.status !== 403) feito = await operadora('PUT', caminho, { status: 'canceled' })
  const ultimoStatus = feito?.status ?? null
  if (feito?.ok) return { cancelada: true, ultimoStatus }
  const conferida = await operadora('GET', caminho)
  return { cancelada: conferida?.ok === true && traduzirStatus(conferida.dados?.['status']) === 'cancelada', ultimoStatus }
}

/** O mesmo, só dizendo se ficou cancelada lá. */
export async function cancelarNaOperadora(operadora: Operadora, id: string): Promise<boolean> {
  return (await tentarCancelarNaOperadora(operadora, id)).cancelada
}

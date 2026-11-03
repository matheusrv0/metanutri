// O pedaço do `fetch` que os avisos usam (o Resend, o Turnstile e o DNS sobre HTTPS). O index.ts de cada função passa o
// `fetch` do Deno; os testes, um de mentira (nunca a API real). Puro: só tipos e o prazo.

export interface RespostaHttp {
  readonly status: number
  json(): Promise<unknown>
}

export interface PedidoHttp {
  readonly method: 'GET' | 'POST' | 'PATCH'
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string
  readonly signal?: AbortSignal
}

export type Buscar = (url: string, pedido: PedidoHttp) => Promise<RespostaHttp>

/** Faz o pedido com prazo: passado o prazo, o pedido é cancelado e rejeita. */
export async function buscarComPrazo(buscar: Buscar, url: string, pedido: Omit<PedidoHttp, 'signal'>, prazoMs: number): Promise<RespostaHttp> {
  const controle = new AbortController()
  let relogio: ReturnType<typeof setTimeout> | undefined
  const esgotou = new Promise<never>((_, rejeitar) => {
    relogio = setTimeout(() => {
      controle.abort()
      rejeitar(new Error('O pedido passou do prazo.'))
    }, prazoMs)
  })
  try {
    return await Promise.race([buscar(url, { ...pedido, signal: controle.signal }), esgotou])
  } finally {
    clearTimeout(relogio)
  }
}

/** O corpo em JSON, ou nulo se não der para ler. */
export async function jsonOuNulo(resposta: RespostaHttp): Promise<unknown> {
  try {
    return await resposta.json()
  } catch {
    return null
  }
}

/** O valor, se for um objeto (não lista); senão vazio. */
export const objeto = (valor: unknown): Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {}

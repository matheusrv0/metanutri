// O tamanho do pedido às funções de cobrança (spec seguranca-lote-2, D-110; CA-451). Puro: usa só o
// Request e o ReadableStream padrão, que existem no Deno e no Node; sem Deno, sem rede e sem relógio
// (src/data/servidorCorpo.test.ts).

/** D-110: o pedido vai até 64 KB. */
export const CORPO_MAXIMO_BYTES = 65_536
/** A frase do 413 de assinar e gerenciar-assinatura. */
export const PEDIDO_GRANDE_DEMAIS = 'O pedido é grande demais.'

/** O que o pedido precisa ter para ser lido aqui; o Request do Deno serve. */
export interface PedidoComCorpo {
  readonly headers: { get(nome: string): string | null }
  readonly body: ReadableStream<Uint8Array> | null
}

/** O corpo lido: o JSON (nulo quando não é JSON, como o `req.json()` de antes) ou "grande demais". */
export type CorpoLido = { readonly grande: false; readonly json: unknown } | { readonly grande: true }

const GRANDE: CorpoLido = { grande: true }
const SEM_JSON: CorpoLido = { grande: false, json: null }

/**
 * CA-451: lê o corpo até `limite` bytes. O tamanho declarado acima do limite recusa sem ler nada; sem
 * ele, ou com um declarado menor que o de verdade, a leitura para no primeiro pedaço que passa do
 * limite. Corpo vazio, que não é JSON ou que falha no meio vira nulo.
 */
export async function lerCorpo(pedido: PedidoComCorpo, limite = CORPO_MAXIMO_BYTES): Promise<CorpoLido> {
  const declarado = Number(pedido.headers.get('content-length') ?? Number.NaN)
  if (declarado > limite) return GRANDE
  if (!pedido.body) return SEM_JSON
  const leitor = pedido.body.getReader()
  const decodificador = new TextDecoder()
  let texto = ''
  let lidos = 0
  try {
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      lidos += value.byteLength
      if (lidos > limite) {
        await leitor.cancel().catch(() => undefined)
        return GRANDE
      }
      texto += decodificador.decode(value, { stream: true })
    }
    texto += decodificador.decode()
  } catch {
    return SEM_JSON
  }
  try {
    const json: unknown = JSON.parse(texto)
    return { grande: false, json }
  } catch {
    return SEM_JSON
  }
}

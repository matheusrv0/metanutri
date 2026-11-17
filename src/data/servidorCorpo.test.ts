// @vitest-environment node
// D-110 (spec seguranca-lote-2): o pedido às três funções de cobrança vai até 64 KB. Testado com o
// Request e o ReadableStream de verdade do Node, os mesmos do Deno.
import { CORPO_MAXIMO_BYTES, lerCorpo, lerTexto, PEDIDO_GRANDE_DEMAIS, PRAZO_DO_CORPO_MS } from '../../supabase/functions/_shared/corpo.ts'

const KB = 1024
const pedido = (corpo: string | null) => new Request('https://exemplo.com/funcao', { method: 'POST', ...(corpo === null ? {} : { body: corpo }) })
/** Um JSON de exatamente `bytes` bytes: {"x":"aaa…"} (8 bytes de moldura). */
const jsonCom = (bytes: number) => JSON.stringify({ x: 'a'.repeat(bytes - 8) })

/** Um corpo que entrega um pedaço de `tamanho` bytes a cada leitura, sem fim, e conta o que foi pedido. */
function corpoSemFim(tamanho: number) {
  const estado = { puxados: 0, cancelado: false }
  const corpo = new ReadableStream<Uint8Array>(
    {
      pull(controle) {
        estado.puxados += 1
        controle.enqueue(new Uint8Array(tamanho).fill(32))
      },
      cancel() {
        estado.cancelado = true
      },
    },
    // Nada é puxado antes da primeira leitura.
    { highWaterMark: 0 },
  )
  return { corpo, estado }
}

describe('CA-2427 e D-1375: o prazo da leitura (só na sugerir-plano)', () => {
  /** Um corpo que não manda nada e não termina, como o cliente lento. */
  function corpoParado() {
    const estado = { cancelado: false }
    const corpo = new ReadableStream<Uint8Array>({
      pull: () => new Promise<void>(() => {}),
      cancel() {
        estado.cancelado = true
      },
    })
    return { corpo, estado }
  }
  const comCorpo = (corpo: ReadableStream<Uint8Array>) => ({ headers: new Headers(), body: corpo })

  it('o prazo é de 10 s', () => {
    expect(PRAZO_DO_CORPO_MS).toBe(10_000)
  })

  it('o corpo que não chega no prazo vira nulo, e a leitura para', async () => {
    const { corpo, estado } = corpoParado()
    expect(await lerCorpo(comCorpo(corpo), CORPO_MAXIMO_BYTES, 50)).toEqual({ grande: false, json: null })
    expect(estado.cancelado).toBe(true)
  })

  it('o corpo que chega no prazo é lido como antes', async () => {
    expect(await lerCorpo(pedido('{"modo":"uso"}'), CORPO_MAXIMO_BYTES, 1000)).toEqual({ grande: false, json: { modo: 'uso' } })
    expect(await lerCorpo(pedido(jsonCom(64 * KB + 1)), CORPO_MAXIMO_BYTES, 1000)).toEqual({ grande: true })
  })
})

describe('o tamanho do pedido às funções de cobrança (D-110)', () => {
  it('lê o JSON do pedido pequeno, como antes', async () => {
    expect(await lerCorpo(pedido('{"acao":"previa"}'))).toEqual({ grande: false, json: { acao: 'previa' } })
  })

  it('CB-113: 64 KB exatos passam; um byte a mais é recusado', async () => {
    expect(CORPO_MAXIMO_BYTES).toBe(64 * KB)
    expect(new TextEncoder().encode(jsonCom(64 * KB)).byteLength).toBe(64 * KB)
    expect(await lerCorpo(pedido(jsonCom(64 * KB)))).toEqual({ grande: false, json: { x: 'a'.repeat(64 * KB - 8) } })
    expect(await lerCorpo(pedido(jsonCom(64 * KB + 1)))).toEqual({ grande: true })
  })

  it('CA-451: o limite é em bytes, não em letras', async () => {
    const acentuado = JSON.stringify({ x: 'é'.repeat(33_000) })
    expect(acentuado.length).toBeLessThan(64 * KB)
    expect(await lerCorpo(pedido(acentuado))).toEqual({ grande: true })
  })

  it('CA-451: o tamanho declarado acima de 64 KB recusa sem ler o corpo', async () => {
    const { corpo, estado } = corpoSemFim(KB)
    expect(await lerCorpo({ headers: new Headers({ 'content-length': String(64 * KB + 1) }), body: corpo })).toEqual({ grande: true })
    expect(estado.puxados).toBe(0)
    expect(corpo.locked).toBe(false)
  })

  it('CA-451: sem o tamanho declarado, a leitura para logo depois de passar de 64 KB', async () => {
    const { corpo, estado } = corpoSemFim(16 * KB)
    expect(await lerCorpo({ headers: new Headers(), body: corpo })).toEqual({ grande: true })
    // Quatro pedaços de 16 KB cabem; o quinto passa e a leitura para.
    expect(estado.puxados).toBeGreaterThanOrEqual(5)
    expect(estado.puxados).toBeLessThanOrEqual(6)
    expect(estado.cancelado).toBe(true)
  })

  it('Foco: o tamanho declarado menor que o corpo de verdade não deixa passar', async () => {
    const { corpo, estado } = corpoSemFim(16 * KB)
    expect(await lerCorpo({ headers: new Headers({ 'content-length': '10' }), body: corpo })).toEqual({ grande: true })
    expect(estado.puxados).toBeLessThanOrEqual(6)
  })

  it('corpo vazio, ausente, que não é JSON ou que falha no meio vira nulo, como o req.json() de antes', async () => {
    expect(await lerCorpo(pedido(''))).toEqual({ grande: false, json: null })
    expect(await lerCorpo(pedido(null))).toEqual({ grande: false, json: null })
    expect(await lerCorpo(pedido('nada de json'))).toEqual({ grande: false, json: null })
    const quebrado = new ReadableStream<Uint8Array>({
      pull(controle) {
        controle.error(new Error('rede caiu'))
      },
    })
    expect(await lerCorpo({ headers: new Headers(), body: quebrado })).toEqual({ grande: false, json: null })
  })

  it('a frase do 413 é curta e em português', () => {
    expect(PEDIDO_GRANDE_DEMAIS).toBe('O pedido é grande demais.')
  })
})

describe('CB-1242 e D-1274: o formulário do descadastro de um clique, lido até 1 KB', () => {
  it('CB-1242: o formulário curto volta como texto', async () => {
    expect(await lerTexto(pedido('List-Unsubscribe=One-Click'), KB)).toEqual({ grande: false, texto: 'List-Unsubscribe=One-Click' })
    expect(await lerTexto(pedido(null), KB)).toEqual({ grande: false, texto: '' })
  })

  it('CB-1242: 1 KB exato passa; um byte a mais, sem o tamanho declarado, é recusado', async () => {
    expect(await lerTexto(pedido('a'.repeat(KB)), KB)).toEqual({ grande: false, texto: 'a'.repeat(KB) })
    expect(await lerTexto(pedido('a'.repeat(KB + 1)), KB)).toEqual({ grande: true })
  })

  it('CB-1242: o corpo sem fim nem tamanho declarado para no primeiro pedaço que passa de 1 KB', async () => {
    const { corpo, estado } = corpoSemFim(512)
    expect(await lerTexto({ headers: new Headers(), body: corpo }, KB)).toEqual({ grande: true })
    expect(estado.puxados).toBeLessThanOrEqual(4)
    expect(estado.cancelado).toBe(true)
  })

  it('CB-1242: o tamanho declarado acima do limite recusa sem ler', async () => {
    const { corpo, estado } = corpoSemFim(KB)
    expect(await lerTexto({ headers: new Headers({ 'content-length': String(KB + 1) }), body: corpo }, KB)).toEqual({ grande: true })
    expect(estado.puxados).toBe(0)
  })
})

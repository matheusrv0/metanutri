// A porta das fotos sobre o supabase-js (spec antropometria-telas, DP-AT-21, D-1534 e D-1547): a leitura da pasta do
// plano, a exclusão dela e a leitura da recusa do envio. O cliente é falso: só as chamadas do armazenamento que a porta
// usa.
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarArmazenamentoDeFotos } from './armazenamentoDeFotos.ts'

interface Item {
  readonly name: string
  readonly id: string | null
  readonly created_at?: string
  readonly metadata?: { readonly size?: number } | null
}
type Resposta = { readonly data: Item[] | null; readonly error: { readonly message: string } | null }

function clienteFalso(pastas: Readonly<Record<string, Resposta>>, envio: { readonly erro?: unknown; readonly lanca?: boolean } = {}) {
  const removidos: string[][] = []
  const balde = {
    upload: async () => {
      if (envio.lanca) throw new TypeError('Failed to fetch')
      return envio.erro === undefined ? { data: { path: 'x' }, error: null } : { data: null, error: envio.erro }
    },
    list: async (pasta: string) => pastas[pasta] ?? { data: [], error: null },
    remove: async (caminhos: string[]) => (removidos.push(caminhos), { data: [], error: null }),
  }
  // O cliente de verdade tem muito mais; a porta só usa o armazenamento.
  const cliente = { storage: { from: () => balde } } as unknown as SupabaseClient
  return { porta: criarArmazenamentoDeFotos(cliente), removidos }
}

const SEM_BALDE: Resposta = { data: null, error: { message: 'Bucket not found' } }

describe('a porta das fotos (DP-AT-21, D-1534)', () => {
  it('DP-AT-21: lê fotos/ e anexos/ da pasta do plano, com o tamanho e a data; a subpasta (sem id) não conta', async () => {
    const { porta } = clienteFalso({
      'c/p/fotos': { data: [{ name: 'f1.jpg', id: '1', created_at: '2026-11-03T12:00:00.000Z', metadata: { size: 2048 } }, { name: 'sub', id: null }], error: null },
      'c/p/anexos': { data: [{ name: 'a1.pdf', id: '2', metadata: null }], error: null },
    })
    expect(await porta.listar('c/p')).toEqual([
      { caminho: 'c/p/fotos/f1.jpg', bytes: 2048, criadoEm: '2026-11-03T12:00:00.000Z' },
      { caminho: 'c/p/anexos/a1.pdf', bytes: 0, criadoEm: null },
    ])
  })

  it('D-1534: o balde que ainda não existe (o 018 não rodou) é uma pasta vazia; a exclusão dela dá certo', async () => {
    const { porta, removidos } = clienteFalso({ 'c/p/fotos': SEM_BALDE, 'c/p/anexos': SEM_BALDE })
    expect(await porta.listar('c/p')).toEqual([])
    expect(await porta.apagarPasta('c/p')).toBe(true)
    expect(removidos).toEqual([])
  })

  it('D-1534: outra falha na leitura: nula, e a exclusão da pasta falha (o plano fica)', async () => {
    const { porta, removidos } = clienteFalso({ 'c/p/anexos': { data: null, error: { message: 'Failed to fetch' } } })
    expect(await porta.listar('c/p')).toBeNull()
    expect(await porta.apagarPasta('c/p')).toBe(false)
    expect(removidos).toEqual([])
  })

  it('CA-2489: a exclusão da pasta apaga o que a leitura achou', async () => {
    const { porta, removidos } = clienteFalso({
      'c/p/fotos': { data: [{ name: 'f1.jpg', id: '1' }], error: null },
      'c/p/anexos': { data: [{ name: 'a1.pdf', id: '2' }], error: null },
    })
    expect(await porta.apagarPasta('c/p')).toBe(true)
    expect(removidos).toEqual([['c/p/fotos/f1.jpg', 'c/p/anexos/a1.pdf']])
  })
})

/** As recusas como o supabase-js as entrega (`StorageApiError`: status HTTP, `statusCode` e `code` do corpo), da sonda r2. */
const recusa = (status: number, statusCode: string, message: string, code?: string) => ({ name: 'StorageApiError', status, statusCode, message, ...(code ? { code } : {}) })

describe('a recusa do envio (D-1547)', () => {
  const enviar = async (envio: { readonly erro?: unknown; readonly lanca?: boolean }) =>
    clienteFalso({}, envio).porta.enviar('c/p/fotos/f.jpg', new Blob([new Uint8Array(4)], { type: 'image/jpeg' }), 'image/jpeg')

  it('CB-1496 e D-1546: "code: 53100" na mensagem é a conta cheia', async () => {
    expect(await enviar({ erro: recusa(500, '500', 'database error, code: 53100', 'DatabaseError') })).toBe('conta-cheia')
  })

  it('CB-1415 e D-1547: 401, o 403 do token e o token recusado são a sessão vencida', async () => {
    // O formato real do token vencido, da sonda r3b (storage-api v1.79.36): 400, `statusCode` "403" e `AccessDenied`.
    expect(await enviar({ erro: recusa(400, '403', '"exp" claim timestamp check failed', 'AccessDenied') })).toBe('sessao')
    expect(await enviar({ erro: recusa(400, '403', 'signature verification failed', 'AccessDenied') })).toBe('sessao')
    expect(await enviar({ erro: recusa(401, '401', 'Unauthorized') })).toBe('sessao')
    expect(await enviar({ erro: recusa(403, '403', 'Forbidden') })).toBe('sessao')
    expect(await enviar({ erro: recusa(400, '400', 'jwt malformed', 'InvalidJWT') })).toBe('sessao')
  })

  it('CB-1416, D-1505 e D-1547 (nota da r3): o 403 da política é uma recusa comum, lida pela pasta', async () => {
    // Sem o gatilho (D-1531), a 6ª foto, o 11º anexo e a conta com 2.000 arquivos são recusados pela política.
    expect(await enviar({ erro: recusa(400, '403', 'new row violates row-level security policy') })).toBe('recusado')
    expect(await enviar({ erro: recusa(403, '403', 'new row violates row-level security policy for table "objects"', 'Unauthorized') })).toBe('recusado')
  })

  it('CB-1497 e D-1547: o resto é uma recusa sem motivo conhecido (o 23514, o 5xx, o balde que não existe, o tipo)', async () => {
    expect(await enviar({ erro: recusa(500, '500', 'database error, code: 23514', 'DatabaseError') })).toBe('recusado')
    expect(await enviar({ erro: recusa(502, '502', 'Bad Gateway') })).toBe('recusado')
    expect(await enviar({ erro: recusa(400, '404', 'Bucket not found') })).toBe('recusado')
    expect(await enviar({ erro: recusa(400, '415', 'mime type image/gif is not supported') })).toBe('recusado')
    // O número parecido em outro lugar da mensagem não é o código.
    expect(await enviar({ erro: recusa(500, '500', 'database error, code: 531000') })).toBe('recusado')
  })

  it('CB-1413: sem status (o pedido nem chegou), sem rede; aceito, ok', async () => {
    expect(await enviar({ erro: { name: 'StorageUnknownError', message: 'Failed to fetch' } })).toBe('sem-rede')
    expect(await enviar({ lanca: true })).toBe('sem-rede')
    expect(await enviar({})).toBe('ok')
  })
})

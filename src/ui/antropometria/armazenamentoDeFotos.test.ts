// A porta das fotos sobre o supabase-js (spec antropometria-telas, DP-AT-21 e D-1534): a leitura da pasta do plano e a
// exclusão dela. O cliente é falso: só as chamadas do armazenamento que a porta usa.
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarArmazenamentoDeFotos } from './armazenamentoDeFotos.ts'

interface Item {
  readonly name: string
  readonly id: string | null
  readonly created_at?: string
  readonly metadata?: { readonly size?: number } | null
}
type Resposta = { readonly data: Item[] | null; readonly error: { readonly message: string } | null }

function clienteFalso(pastas: Readonly<Record<string, Resposta>>) {
  const removidos: string[][] = []
  const balde = {
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

import { act, renderHook, waitFor } from '@testing-library/react'
import { useAprovacoes } from './usarAprovacoes.ts'

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, { data: unknown; error: unknown }>,
  chamadas: [] as { funcao: string; args: unknown }[],
  removidos: [] as string[][],
}))

const cliente = {
  rpc: async (funcao: string, args?: unknown) => {
    banco.chamadas.push({ funcao, args })
    return banco.respostas[funcao] ?? { data: null, error: null }
  },
  storage: {
    from: () => ({
      remove: async (caminhos: string[]) => {
        banco.removidos.push(caminhos)
        return { error: null }
      },
      createSignedUrl: async (caminho: string) => ({ data: { signedUrl: `https://assinado/${caminho}` }, error: null }),
    }),
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const pedido = { id: 'p1', usuario: 'u1', nome: 'Júlia', email: 'j@ufrn.edu.br', instituicao: 'UFRN', matricula: '123', periodo: 7, formatura: '2027-07-01', enviado_em: '2026-09-30T13:00:00Z', arquivo: 'u1/a.pdf' }

describe('useAprovacoes', () => {
  beforeEach(() => {
    banco.respostas = {
      pedidos_em_analise: { data: [pedido], error: null },
      crn_para_conferir: { data: [], error: null },
      comprovantes_para_apagar: { data: [{ caminho: 'u9/velho.pdf' }], error: null },
    }
    banco.chamadas = []
    banco.removidos = []
  })

  it('carrega as duas filas e conta o pendente', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.pedidos).toHaveLength(1)
    expect(result.current.pendentes.total).toBe(1)
  })

  it('CA-299: apaga os comprovantes vencidos e marca no banco', async () => {
    renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(banco.removidos).toEqual([['u9/velho.pdf']]))
    await waitFor(() => expect(banco.chamadas).toContainEqual({ funcao: 'marcar_comprovantes_apagados', args: { p_caminhos: ['u9/velho.pdf'] } }))
  })

  it('CA-294: aprovar chama o banco e recarrega', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.decidirPedido('p1', true, null)
    })
    expect(erro).toBeNull()
    expect(banco.chamadas).toContainEqual({ funcao: 'decidir_pedido', args: { p_pedido: 'p1', p_aprovar: true, p_motivo: null } })
    expect(banco.chamadas.filter((c) => c.funcao === 'pedidos_em_analise').length).toBeGreaterThan(1)
  })

  it('foco 4 e CB-61: pedido já decidido devolve a mensagem e recarrega a lista', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    banco.respostas['decidir_pedido'] = { data: null, error: { message: 'Este pedido já foi decidido.', code: 'P0001' } }
    banco.respostas['pedidos_em_analise'] = { data: [], error: null }
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.decidirPedido('p1', false, 'Ilegível')
    })
    expect(erro).toBe('Este pedido já foi decidido.')
    await waitFor(() => expect(result.current.pedidos).toHaveLength(0))
  })

  it('abre o comprovante por endereço temporário', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let url: string | null = null
    await act(async () => {
      url = await result.current.abrirComprovante('u1/a.pdf')
    })
    expect(url).toBe('https://assinado/u1/a.pdf')
  })

  it('desligado, não chama nada', () => {
    renderHook(() => useAprovacoes(false))
    expect(banco.chamadas).toEqual([])
  })
})

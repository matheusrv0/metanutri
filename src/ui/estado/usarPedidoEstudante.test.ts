import { act, renderHook, waitFor } from '@testing-library/react'
import { usePedidoEstudante } from './usarPedidoEstudante.ts'

const banco = vi.hoisted(() => ({
  linha: { data: null as unknown, error: null as unknown },
  upload: { error: null as unknown },
  rpc: { error: null as unknown },
  enviados: [] as string[],
  removidos: [] as string[][],
  chamadas: [] as { funcao: string; args: unknown }[],
}))

const cliente = {
  from: () => ({
    select: () => ({
      eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => banco.linha }) }) }),
    }),
  }),
  storage: {
    from: () => ({
      upload: async (caminho: string) => {
        banco.enviados.push(caminho)
        return banco.upload
      },
      remove: async (caminhos: string[]) => {
        banco.removidos.push(caminhos)
        return { error: null }
      },
    }),
  },
  rpc: async (funcao: string, args: unknown) => {
    banco.chamadas.push({ funcao, args })
    return banco.rpc
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const arquivo = new File(['%PDF'], 'Declaração.pdf', { type: 'application/pdf' })
const dados = { instituicao: ' UFRN ', matricula: '20230045871', periodo: 7, formatura: '2027-07' }

describe('usePedidoEstudante', () => {
  beforeEach(() => {
    banco.linha = { data: null, error: null }
    banco.upload = { error: null }
    banco.rpc = { error: null }
    banco.enviados = []
    banco.removidos = []
    banco.chamadas = []
  })

  it('lê o pedido mais recente', async () => {
    banco.linha = { data: { id: 'p1', status: 'em_analise', formatura: '2027-07-01', periodo: 7, instituicao: 'UFRN', matricula: '1', enviado_em: '2026-09-30T13:00:00Z' }, error: null }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.pedido?.status).toBe('em_analise'))
  })

  it('CA-273: envia o arquivo para a pasta da pessoa e cria o pedido com o dia 1 do mês', async () => {
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBeNull()
    expect(banco.enviados[0]).toMatch(/^u1\/\d+-declaracao\.pdf$/)
    expect(banco.chamadas).toContainEqual({
      funcao: 'enviar_pedido_estudante',
      args: { p_instituicao: 'UFRN', p_matricula: '20230045871', p_periodo: 7, p_formatura: '2027-07-01', p_arquivo: banco.enviados[0] },
    })
  })

  it('foco 2: banco recusou, o arquivo enviado é apagado e o motivo volta', async () => {
    banco.rpc = { error: { message: 'Confirme o e-mail da faculdade antes de enviar o comprovante.', code: '42501' } }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.removidos).toEqual([[banco.enviados[0]]])
  })

  it('upload que falha não cria pedido', async () => {
    banco.upload = { error: { message: 'Failed to fetch' } }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBe('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    expect(banco.chamadas.some((c) => c.funcao === 'enviar_pedido_estudante')).toBe(false)
  })

  it('CA-280: fechar o aviso chama o banco', async () => {
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    await act(async () => {
      await result.current.fecharAviso('p1')
    })
    expect(banco.chamadas).toContainEqual({ funcao: 'fechar_aviso_estudante', args: { p_pedido: 'p1' } })
  })
})

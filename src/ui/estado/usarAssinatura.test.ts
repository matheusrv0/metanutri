import { act, renderHook, waitFor } from '@testing-library/react'
import { useAssinatura } from './usarAssinatura.ts'

const { cliente } = vi.hoisted(() => {
  const cliente = {
    linha: null as unknown,
    usadas: 14 as unknown,
    invocar: vi.fn(),
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: cliente.linha }) }) }),
    rpc: async () => ({ data: cliente.usadas }),
    functions: { invoke: (...args: unknown[]) => cliente.invocar(...args) },
  }
  return { cliente }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente }))

describe('useAssinatura', () => {
  beforeEach(() => {
    cliente.linha = null
    cliente.usadas = 14
    cliente.invocar.mockReset()
  })

  it('sem sessão já está carregado, no Free', () => {
    const { result } = renderHook(() => useAssinatura(false))
    expect(result.current.carregado).toBe(true)
    expect(result.current.assinatura.plano).toBe('free')
  })

  it('com sessão, lê a assinatura e só então marca carregado', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa', preco_travado: true }
    const { result } = renderHook(() => useAssinatura(true))
    expect(result.current.carregado).toBe(false)
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.assinatura.plano).toBe('solo')
  })

  it('CA-160: conta quantas vagas de fundador sobram', async () => {
    const { result } = renderHook(() => useAssinatura(true))
    await waitFor(() => expect(result.current.vagasRestantes).toBe(186))
  })

  it('CA-160: sem resposta do servidor, a contagem fica nula', async () => {
    cliente.usadas = null
    const { result } = renderHook(() => useAssinatura(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.vagasRestantes).toBeNull()
  })

  it('CA-161: manda plano e ciclo ao servidor, nunca o preço', async () => {
    cliente.invocar.mockResolvedValue({ data: { pagamento: 'https://mp.exemplo/pagar' }, error: null })
    const ir = vi.fn()
    const { result } = renderHook(() => useAssinatura(true, ir))
    await act(async () => {
      expect(await result.current.assinar('pro', 'anual')).toBeNull()
    })
    expect(cliente.invocar).toHaveBeenCalledWith('assinar', { body: { plano: 'pro', ciclo: 'anual' } })
    expect(ir).toHaveBeenCalledWith('https://mp.exemplo/pagar')
  })

  it('CA-162: erro do servidor volta como mensagem, sem sair da tela', async () => {
    cliente.invocar.mockResolvedValue({ data: null, error: new Error('falhou') })
    const { result } = renderHook(() => useAssinatura(true))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal')).toMatch(/servidor de cobrança/)
    })
  })
})

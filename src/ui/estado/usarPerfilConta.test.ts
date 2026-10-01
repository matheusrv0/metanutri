import { act, renderHook, waitFor } from '@testing-library/react'
import { usePerfilConta } from './usarPerfilConta.ts'

const banco = vi.hoisted(() => ({
  perfil: { data: null as unknown, error: null as unknown },
  admin: { data: false as unknown, error: null as unknown },
  rpcErro: null as unknown,
  chamadas: [] as { funcao: string; args: unknown }[],
  filtro: null as unknown,
}))

const cliente = {
  from: () => ({
    select: () => ({
      eq: (_coluna: string, valor: unknown) => {
        banco.filtro = valor
        return { maybeSingle: async () => banco.perfil }
      },
    }),
  }),
  rpc: async (funcao: string, args?: unknown) => {
    if (funcao === 'eh_admin') return banco.admin
    banco.chamadas.push({ funcao, args })
    return { data: null, error: banco.rpcErro }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

describe('usePerfilConta', () => {
  beforeEach(() => {
    banco.perfil = { data: { nome: 'Ana', situacao: 'nutricionista', crn_regiao: 6, crn_numero: '12345', crn_status: 'em_conferencia', crn_declarado_em: '2026-09-30T12:00:00Z', crn_decidido_em: null }, error: null }
    banco.admin = { data: false, error: null }
    banco.rpcErro = null
    banco.chamadas = []
    banco.filtro = null
  })

  it('lê o próprio perfil, filtrando pelo id da sessão', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(banco.filtro).toBe('u1')
    expect(result.current.perfil?.crn).toEqual({ regiao: 6, numero: '12345' })
    expect(result.current.ehAdmin).toBe(false)
    expect(result.current.falhou).toBe(false)
  })

  it('CB-68: conta sem perfil fica carregada com perfil nulo', async () => {
    banco.perfil = { data: null, error: null }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.perfil).toBeNull()
    expect(result.current.falhou).toBe(false)
  })

  it('leitura que falha não finge que a conta não tem perfil', async () => {
    banco.perfil = { data: null, error: { message: 'Failed to fetch', code: '' } }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.falhou).toBe(true)
  })

  it('sabe quem é administrador', async () => {
    banco.admin = { data: true, error: null }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.ehAdmin).toBe(true))
  })

  it('CA-287: Me formei chama a função do banco com o CRN', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.meFormei({ regiao: 6, numero: '23891' })
    })
    expect(erro).toBeNull()
    expect(banco.chamadas).toContainEqual({ funcao: 'me_formei', args: { p_regiao: 6, p_numero: '23891' } })
  })

  it('erro explicado pelo banco aparece como veio; o resto vira falha de rede', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    banco.rpcErro = { message: 'Só conta de estudante pode informar a formatura.', code: 'P0001' }
    await act(async () => {
      expect(await result.current.meFormei({ regiao: 6, numero: '1' })).toBe('Só conta de estudante pode informar a formatura.')
    })
    banco.rpcErro = { message: 'TypeError: Failed to fetch', code: '' }
    await act(async () => {
      expect(await result.current.corrigirCrn({ regiao: 6, numero: '1' })).toBe('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    })
  })

  it('sem sessão, não pergunta nada ao banco', () => {
    const { result } = renderHook(() => usePerfilConta(null))
    expect(result.current.carregado).toBe(true)
    expect(result.current.perfil).toBeNull()
    expect(banco.filtro).toBeNull()
  })
})

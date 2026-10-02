import { act, renderHook, waitFor } from '@testing-library/react'
import { FALHA_AO_LER_NEGOCIO, useNegocio } from './usarNegocio.ts'

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, { data: unknown; error: unknown }>,
  chamadas: [] as string[],
  pendente: undefined as Promise<{ data: unknown; error: unknown }> | undefined,
}))

const cliente = {
  rpc: async (funcao: string) => {
    banco.chamadas.push(funcao)
    if (funcao === 'painel_contas' && banco.pendente) return banco.pendente
    return banco.respostas[funcao] ?? { data: null, error: null }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const linhaConta = {
  id: 'u1',
  nome: 'Ana',
  email: 'ana@exemplo.com',
  criada_em: '2026-09-20T12:00:00Z',
  situacao: 'nutricionista',
  crn_regiao: 6,
  crn_status: 'conferido',
  plano: 'pro',
  status: 'ativa',
  ciclo: 'mensal',
  valor_centavos: 6490,
  preco_travado: true,
  assinatura_atualizada_em: '2026-09-21T12:00:00Z',
}
const falhaDeRede = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }

describe('useNegocio', () => {
  beforeEach(() => {
    banco.respostas = {
      painel_contas: { data: [linhaConta], error: null },
      painel_historico_assinaturas: {
        data: [{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', ciclo: 'mensal', valor_centavos: 6490, preco_travado: true, quando: '2026-09-21T12:00:00Z' }],
        error: null,
      },
      painel_uso: { data: [{ links_30_dias: 3, copias_30_dias: 2 }], error: null },
    }
    banco.chamadas = []
    banco.pendente = undefined
  })

  it('CA-363: lê contas, histórico e uso ao abrir e guarda a hora da leitura', async () => {
    const { result } = renderHook(() => useNegocio(true))
    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    expect(result.current.carregando).toBe(false)
    expect(result.current.erro).toBeNull()
    expect(result.current.dados?.contas.map((c) => c.id)).toEqual(['u1'])
    expect(result.current.dados?.historico).toHaveLength(1)
    expect(result.current.dados?.uso).toEqual({ links30Dias: 3, copias30Dias: 2 })
    expect(result.current.dados?.lidoEm).toBeInstanceOf(Date)
    expect([...banco.chamadas].sort()).toEqual(['painel_contas', 'painel_historico_assinaturas', 'painel_uso'])
  })

  it('com a tela fechada, não lê nada', async () => {
    const { result } = renderHook(() => useNegocio(false))
    await act(async () => {})
    expect(banco.chamadas).toEqual([])
    expect(result.current.carregando).toBe(false)
    expect(result.current.dados).toBeNull()
  })

  it('CB-78: primeira leitura com falha de rede fica sem números e com o aviso', async () => {
    banco.respostas['painel_uso'] = falhaDeRede
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    expect(result.current.dados).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('CA-344: a recusa do banco aparece com a frase do banco', async () => {
    banco.respostas['painel_contas'] = { data: null, error: { message: 'Só o administrador vê estes números.', code: '42501' } }
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe('Só o administrador vê estes números.'))
  })

  it('CB-79 e foco 5: falha depois de uma leitura boa mantém os números e a hora anteriores', async () => {
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    const lidoEm = result.current.dados?.lidoEm
    banco.respostas['painel_contas'] = falhaDeRede
    act(() => result.current.atualizar())
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    expect(result.current.dados?.contas).toHaveLength(1)
    expect(result.current.dados?.lidoEm).toBe(lidoEm)
  })

  it('CB-86 e foco 5: atualizar duas vezes seguidas lê uma vez só', async () => {
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    banco.chamadas = []
    let soltar: (resposta: { data: unknown; error: unknown }) => void = () => {}
    banco.pendente = new Promise((resolve) => {
      soltar = resolve
    })
    act(() => result.current.atualizar())
    expect(result.current.carregando).toBe(true)
    act(() => result.current.atualizar())
    await act(async () => {
      soltar({ data: [linhaConta], error: null })
      await banco.pendente
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(banco.chamadas.filter((c) => c === 'painel_contas')).toHaveLength(1)
  })

  it('leitura boa depois de uma falha limpa o aviso', async () => {
    banco.respostas['painel_uso'] = falhaDeRede
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    banco.respostas['painel_uso'] = { data: [{ links_30_dias: 0, copias_30_dias: 0 }], error: null }
    act(() => result.current.atualizar())
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    expect(result.current.erro).toBeNull()
  })
})

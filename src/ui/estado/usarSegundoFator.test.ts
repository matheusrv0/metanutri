import { act, renderHook, waitFor } from '@testing-library/react'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { useSegundoFator } from './usarSegundoFator.ts'

interface FatorFalso {
  readonly id: string
  readonly factor_type: string
  readonly status: 'verified' | 'unverified'
}

const banco = vi.hoisted(() => ({
  fatores: [] as FatorFalso[],
  erroAoListar: null as unknown,
  erroAoCadastrar: null as unknown,
  erroAoConfirmar: null as unknown,
  chamadas: [] as string[],
}))

const cliente = {
  auth: {
    mfa: {
      listFactors: async () => {
        banco.chamadas.push('listar')
        if (banco.erroAoListar) return { data: null, error: banco.erroAoListar }
        return { data: { all: banco.fatores, totp: banco.fatores.filter((f) => f.factor_type === 'totp' && f.status === 'verified'), phone: [], webauthn: [] }, error: null }
      },
      unenroll: async ({ factorId }: { factorId: string }) => {
        banco.chamadas.push(`descartar ${factorId}`)
        return { data: { id: factorId }, error: null }
      },
      enroll: async (parametros: { factorType: string; issuer?: string; friendlyName?: string }) => {
        banco.chamadas.push(`cadastrar ${JSON.stringify(parametros)}`)
        if (banco.erroAoCadastrar) return { data: null, error: banco.erroAoCadastrar }
        return { data: { id: 'fator-novo', type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg></svg>', secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', uri: 'otpauth://x' } }, error: null }
      },
      challengeAndVerify: async ({ factorId, code }: { factorId: string; code: string }) => {
        banco.chamadas.push(`confirmar ${factorId} ${code}`)
        return { data: banco.erroAoConfirmar ? null : {}, error: banco.erroAoConfirmar }
      },
    },
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

describe('useSegundoFator (spec seguranca-lote-5, D-261)', () => {
  beforeEach(() => {
    banco.fatores = []
    banco.erroAoListar = null
    banco.erroAoCadastrar = null
    banco.erroAoConfirmar = null
    banco.chamadas = []
  })

  it('desligado (fora das telas do administrador), não pergunta nada', () => {
    const { result } = renderHook(() => useSegundoFator(false, vi.fn()))
    expect(result.current.etapa).toEqual({ tipo: 'carregando' })
    expect(banco.chamadas).toEqual([])
  })

  it('CA-836: com o app já cadastrado, pede só o código', async () => {
    banco.fatores = [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }]
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa).toEqual({ tipo: 'confirmar', fatorId: 'fator-1' }))
    expect(banco.chamadas).toEqual(['listar'])
  })

  it('CA-835 e DP-L5-3: sem app, cadastra com o nome MetaNutri e mostra o código QR e a chave', async () => {
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('cadastrar'))
    expect(result.current.etapa).toEqual({ tipo: 'cadastrar', fatorId: 'fator-novo', qr: 'data:image/svg+xml;utf-8,<svg></svg>', chave: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' })
    expect(banco.chamadas).toEqual(['listar', 'cadastrar {"factorType":"totp","issuer":"MetaNutri"}'])
  })

  it('CB-260: o cadastro abandonado é descartado antes de um novo', async () => {
    banco.fatores = [
      { id: 'velho-1', factor_type: 'totp', status: 'unverified' },
      { id: 'telefone', factor_type: 'phone', status: 'unverified' },
    ]
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('cadastrar'))
    expect(banco.chamadas).toEqual(['listar', 'descartar velho-1', 'cadastrar {"factorType":"totp","issuer":"MetaNutri"}'])
  })

  it('a leitura que falha mostra o aviso e "Tentar de novo" lê de novo', async () => {
    banco.erroAoListar = new AuthRetryableFetchError('Failed to fetch', 0)
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa).toEqual({ tipo: 'falhou', mensagem: 'Não deu para falar com o servidor. Confira a internet e tente de novo.' }))
    banco.erroAoListar = null
    banco.fatores = [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }]
    act(() => result.current.tentarDeNovo())
    await waitFor(() => expect(result.current.etapa).toEqual({ tipo: 'confirmar', fatorId: 'fator-1' }))
  })

  it('o cadastro que falha também vira o aviso', async () => {
    banco.erroAoCadastrar = new AuthApiError('MFA enroll is disabled for TOTP', 422, 'mfa_totp_enroll_not_enabled')
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('falhou'))
  })

  it('CA-835 e CA-836: o código certo confirma a sessão e avisa quem chamou', async () => {
    banco.fatores = [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }]
    const aoLiberado = vi.fn()
    const { result } = renderHook(() => useSegundoFator(true, aoLiberado))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('confirmar'))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.confirmar('123456')
    })
    expect(erro).toBeNull()
    expect(banco.chamadas).toContain('confirmar fator-1 123456')
    expect(aoLiberado).toHaveBeenCalledOnce()
  })

  it.each([
    ['CA-837: código errado', new AuthApiError('Invalid TOTP code entered', 422, 'mfa_verification_failed'), 'Código errado. Confira o app e tente de novo.'],
    ['CB-262: código vencido', new AuthApiError('MFA challenge has expired', 422, 'mfa_challenge_expired'), 'Código errado. Confira o app e tente de novo.'],
    ['CB-264: muitas tentativas', new AuthApiError('Too many requests', 429, 'over_request_rate_limit'), 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'],
    ['CB-263: sem internet', new AuthRetryableFetchError('Failed to fetch', 0), 'Não deu para falar com o servidor. Confira a internet e tente de novo.'],
  ])('%s: a mensagem certa, e a tela não libera', async (_caso, falha, mensagem) => {
    banco.fatores = [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }]
    banco.erroAoConfirmar = falha
    const aoLiberado = vi.fn()
    const { result } = renderHook(() => useSegundoFator(true, aoLiberado))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('confirmar'))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.confirmar('123456')
    })
    expect(erro).toBe(mensagem)
    expect(aoLiberado).not.toHaveBeenCalled()
  })

  it('CA-838: menos de 6 dígitos não vai ao servidor', async () => {
    banco.fatores = [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }]
    const { result } = renderHook(() => useSegundoFator(true, vi.fn()))
    await waitFor(() => expect(result.current.etapa.tipo).toBe('confirmar'))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.confirmar('12345')
    })
    expect(erro).toBe('Digite os 6 dígitos do código.')
    expect(banco.chamadas).toEqual(['listar'])
  })
})

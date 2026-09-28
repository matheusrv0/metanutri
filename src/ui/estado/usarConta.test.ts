import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { traduzir, useConta } from './usarConta.ts'

const { auth, avisar } = vi.hoisted(() => {
  let ouvinte: ((evento: string, sessao: unknown) => void) | null = null
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn((cb: (evento: string, sessao: unknown) => void) => {
      ouvinte = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  }
  return { auth, avisar: (evento: string, sessao: unknown) => ouvinte?.(evento, sessao) }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => ({ auth }), supabaseConfigurado: () => true }))

const dados = { nome: 'Maria', email: ' maria@usp.br ', senha: 'senhaforte1', planoDesejado: 'estudante', versaoTermos: '2026-09-28' } as const

describe('useConta', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-223: cadastro grava nome, plano desejado e a versão dos termos, e volta para a confirmação', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    let resposta: Awaited<ReturnType<typeof result.current.cadastrar>> | undefined
    await act(async () => {
      resposta = await result.current.cadastrar(dados)
    })

    expect(resposta).toEqual({ ok: true, erro: null, confirmarEmail: true })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.email).toBe('maria@usp.br')
    expect(pedido.options.data).toMatchObject({ nome: 'Maria', plano_desejado: 'estudante', termos_versao: '2026-09-28' })
    expect(pedido.options.data.plano).toBeUndefined()
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
  })

  it('cadastro sem versão dos termos não grava termos_versao nem termos_aceitos_em', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar({ ...dados, versaoTermos: '' })
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data.termos_versao).toBeUndefined()
    expect(pedido.options.data.termos_aceitos_em).toBeUndefined()
  })

  it('CA-130: com confirmação ligada, e-mail repetido volta sem identidade e vira "já tem conta"', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.cadastrar(dados)).toEqual({ ok: false, erro: 'email-em-uso' })
    })
  })

  it('CA-139: entrar sem confirmar o e-mail diz isso', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1')).toEqual({ ok: false, erro: 'email-nao-confirmado' })
    })
  })

  it('CA-144: pedir troca de senha responde igual, exista a conta ou não', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com')).toEqual({ ok: true, erro: null })
    })
    expect(auth.resetPasswordForEmail.mock.calls[0]?.[1].redirectTo).toMatch(/\?volta=recuperacao$/)
  })

  it('CA-144: o limite de tentativas também vira resposta neutra, ele só dispara quando a conta existe', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'email rate limit exceeded' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('maria@usp.br')).toEqual({ ok: true, erro: null })
    })
  })

  it('CA-144: só a falta de internet aparece, e é achada pelo tipo do erro (WebKit não fala "fetch")', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: new AuthRetryableFetchError('Load failed', 0) })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('maria@usp.br')).toEqual({ ok: false, erro: 'falha-rede' })
    })
  })

  it('CA-145: o link de troca de senha liga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    expect(result.current.sessao).toEqual({ id: 'u1', email: 'maria@usp.br', nome: 'Maria' })
  })

  it('CA-146: trocar a senha desliga o modo de recuperação', async () => {
    auth.updateUser.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    await act(async () => {
      expect(await result.current.trocarSenha('novasenha1')).toEqual({ ok: true, erro: null })
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('sair desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    await act(async () => {
      await result.current.sair()
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('o evento SIGNED_OUT também desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    act(() => avisar('SIGNED_OUT', null))
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('reenviarConfirmacao chama auth.resend com o tipo signup, o e-mail sem espaços e volta para a confirmação', async () => {
    auth.resend.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.reenviarConfirmacao(' maria@usp.br ')).toEqual({ ok: true, erro: null })
    })
    const pedido = auth.resend.mock.calls[0]?.[0]
    expect(pedido.type).toBe('signup')
    expect(pedido.email).toBe('maria@usp.br')
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
  })
})

describe('traduzir as mensagens do Supabase', () => {
  it.each([
    ['User already registered', 'email-em-uso'],
    ['Invalid login credentials', 'credencial-invalida'],
    ['Email not confirmed', 'email-nao-confirmado'],
    ['Email link is invalid or has expired', 'link-vencido'],
    ['email rate limit exceeded', 'muitas-tentativas'],
    ['For security purposes, you can only request this after 45 seconds.', 'muitas-tentativas'],
    ['Failed to fetch', 'falha-rede'],
  ] as const)('"%s" vira %s', (mensagem, erro) => {
    expect(traduzir(mensagem)).toBe(erro)
  })
})

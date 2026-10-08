import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
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
    verifyOtp: vi.fn(),
    signOut: vi.fn(),
  }
  return { auth, avisar: (evento: string, sessao: unknown) => ouvinte?.(evento, sessao) }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => ({ auth }), supabaseConfigurado: () => true }))

const dados = {
  nome: 'Maria',
  email: ' maria@usp.br ',
  senha: 'senhaforte1',
  planoDesejado: 'estudante',
  versaoTermos: '2026-09-28',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
} as const

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

  describe('sair (D-96)', () => {
    beforeEach(() => {
      localStorage.clear()
      localStorage.setItem('metanutri:casos', '["c1"]')
      localStorage.setItem('metanutri:caso:c1', '{"nome":"Ana"}')
      localStorage.setItem('metanutri:pacientes', '[{"id":"p1"}]')
      localStorage.setItem('metanutri:dono', 'u1')
      localStorage.setItem('metanutri:tema', 'escuro')
    })

    it('CA-423: sair e apagar remove os pacientes e planos deste navegador e sai', async () => {
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        await result.current.sair({ apagarDoAparelho: true })
      })
      for (const chave of ['metanutri:casos', 'metanutri:caso:c1', 'metanutri:pacientes', 'metanutri:dono']) expect(localStorage.getItem(chave), chave).toBeNull()
      expect(localStorage.getItem('metanutri:tema')).toBe('escuro')
      expect(auth.signOut).toHaveBeenCalledOnce()
    })

    it('CA-423: só sair mantém os dados deste navegador', async () => {
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        await result.current.sair({ apagarDoAparelho: false })
      })
      expect(localStorage.getItem('metanutri:caso:c1')).toBe('{"nome":"Ana"}')
      expect(localStorage.getItem('metanutri:dono')).toBe('u1')
      expect(auth.signOut).toHaveBeenCalledOnce()
    })
  })

  it('o evento SIGNED_OUT também desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    act(() => avisar('SIGNED_OUT', null))
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('CA-269: grava a situação e o CRN nos metadados do cadastro', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar(dados)
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data).toMatchObject({ situacao: 'nutricionista', crn_regiao: 6, crn_numero: '12345' })
  })

  it('CA-269: estudante não leva CRN', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar({ ...dados, situacao: 'estudante', crn: null })
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data.situacao).toBe('estudante')
    expect(pedido.options.data.crn_regiao).toBeUndefined()
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

  it('CA-407: o código certo confirma a conta e devolve o que a pessoa marcou no cadastro', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'maria@usp.br', user_metadata: { situacao: 'estudante', plano_desejado: 'estudante' } }, session: {} },
      error: null,
    })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.confirmarCodigo(' maria@usp.br ', '123456')).toEqual({ ok: true, erro: null, situacao: 'estudante', planoDesejado: 'estudante' })
    })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@usp.br', token: '123456', type: 'email' })
  })

  it('CB-100: o código colado com espaço ou traço vai só com os dígitos', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.confirmarCodigo('maria@usp.br', '123 456')
      await result.current.conferirCodigoDeSenha('maria@usp.br', '654-321')
    })
    expect(auth.verifyOtp.mock.calls[0]?.[0].token).toBe('123456')
    expect(auth.verifyOtp.mock.calls[1]?.[0].token).toBe('654321')
  })

  it('CA-408: código errado ou vencido (otp_expired) vira "codigo-invalido"', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: new AuthApiError('Token has expired or is invalid', 403, 'otp_expired') })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.confirmarCodigo('maria@usp.br', '000000')).toEqual({ ok: false, erro: 'codigo-invalido' })
      expect(await result.current.conferirCodigoDeSenha('maria@usp.br', '000000')).toEqual({ ok: false, erro: 'codigo-invalido' })
    })
  })

  it('CB-102: sem internet ao confirmar, a falha de rede de sempre', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: new AuthRetryableFetchError('Load failed', 0) })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.confirmarCodigo('maria@usp.br', '123456')).toEqual({ ok: false, erro: 'falha-rede' })
    })
  })

  it('CA-412: o código da troca de senha é conferido como recuperação e liga o modo de recuperação', async () => {
    auth.verifyOtp.mockImplementation(async () => {
      avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } })
      return { data: { user: { id: 'u1', email: 'maria@usp.br' }, session: {} }, error: null }
    })
    auth.updateUser.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.conferirCodigoDeSenha(' maria@usp.br ', '123456')).toEqual({ ok: true, erro: null })
    })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@usp.br', token: '123456', type: 'recovery' })
    expect(result.current.emRecuperacao).toBe(true)
    await act(async () => {
      expect(await result.current.trocarSenha('novasenha1')).toEqual({ ok: true, erro: null })
    })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'novasenha1' })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('CA-411: entrar sem confirmar é achado também pelo código do erro', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: new AuthApiError('Email not confirmed', 400, 'email_not_confirmed') })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1')).toEqual({ ok: false, erro: 'email-nao-confirmado' })
    })
  })
})

describe('useConta com a verificação contra robôs (spec seguranca-lote-3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-454: o cadastro leva a verificação junto com o resto do pedido', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar(dados, 'tok-cadastro')
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.captchaToken).toBe('tok-cadastro')
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
    expect(pedido.options.data).toMatchObject({ nome: 'Maria', situacao: 'nutricionista', termos_versao: '2026-09-28' })
  })

  it('CA-455: entrar leva a verificação', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar(' maria@usp.br ', 'senhaforte1', 'tok-entrar')).toEqual({ ok: true, erro: null })
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@usp.br', password: 'senhaforte1', options: { captchaToken: 'tok-entrar' } })
  })

  it('CA-456: pedir o código da troca de senha leva a verificação', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha(' maria@usp.br ', 'tok-senha')).toEqual({ ok: true, erro: null })
    })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('maria@usp.br', { redirectTo: expect.stringMatching(/\?volta=recuperacao$/), captchaToken: 'tok-senha' })
  })

  it('CA-457: reenviar o código leva a verificação; confirmar o código não', async () => {
    auth.resend.mockResolvedValue({ error: null })
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.reenviarConfirmacao('maria@usp.br', 'tok-reenviar')
      await result.current.confirmarCodigo('maria@usp.br', '12345678')
    })
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'maria@usp.br',
      options: { emailRedirectTo: expect.stringMatching(/\?volta=confirmacao$/), captchaToken: 'tok-reenviar' },
    })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@usp.br', token: '12345678', type: 'email' })
  })

  it('CA-460: a recusa da verificação num pedido que foi com o token volta como "verificacao-recusada" em entrar, cadastrar e reenviar', async () => {
    const recusa = new AuthApiError('captcha protection: request disallowed (invalid-input-response)', 400, 'captcha_failed')
    auth.signInWithPassword.mockResolvedValue({ error: recusa })
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: recusa })
    auth.resend.mockResolvedValue({ error: recusa })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.cadastrar(dados, 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.reenviarConfirmacao('maria@usp.br', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
    })
  })

  it('CA-461: a recusa da verificação num pedido que foi sem o token (o script não carregou, D-119) volta como "verificacao-nao-carregou"', async () => {
    const recusa = new AuthApiError('captcha protection: request disallowed (no captcha response (captcha_token) found in request)', 400, 'captcha_failed')
    auth.signInWithPassword.mockResolvedValue({ error: recusa })
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: recusa })
    auth.resend.mockResolvedValue({ error: recusa })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
      expect(await result.current.cadastrar(dados)).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
      expect(await result.current.reenviarConfirmacao('maria@usp.br')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
    })
  })

  it('CA-460, CA-461 e CA-144: na troca de senha, a recusa da verificação aparece, com e sem o token (o servidor a confere antes de procurar a conta)', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: new AuthApiError('captcha protection: request disallowed (timeout-or-duplicate)', 400, 'captcha_failed') })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
    })
  })

  it('CA-463: sem verificação, os quatro pedidos saem como antes, sem o campo do token', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    auth.resend.mockResolvedValue({ error: null })
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.entrar('maria@usp.br', 'senhaforte1')
      await result.current.cadastrar(dados)
      await result.current.reenviarConfirmacao('maria@usp.br')
      await result.current.pedirTrocaDeSenha('maria@usp.br')
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@usp.br', password: 'senhaforte1' })
    expect(auth.signUp.mock.calls[0]?.[0].options).not.toHaveProperty('captchaToken')
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'maria@usp.br', options: { emailRedirectTo: expect.stringMatching(/\?volta=confirmacao$/) } })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('maria@usp.br', { redirectTo: expect.stringMatching(/\?volta=recuperacao$/) })
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
    ['Token has expired or is invalid', 'codigo-invalido'],
    ['captcha protection: request disallowed (timeout-or-duplicate)', 'verificacao-recusada'],
  ] as const)('"%s" vira %s', (mensagem, erro) => {
    expect(traduzir(mensagem)).toBe(erro)
  })

  it.each([
    ['email_not_confirmed', 'email-nao-confirmado'],
    ['otp_expired', 'codigo-invalido'],
    ['captcha_failed', 'verificacao-recusada'],
  ] as const)('o código "%s" vira %s, qualquer que seja o texto', (codigo, erro) => {
    expect(traduzir('mensagem em outro formato', codigo)).toBe(erro)
  })
})

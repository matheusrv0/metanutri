import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { anotarExclusaoPedida, exclusaoPedidaPor } from '../exclusaoPedida.ts'
import { CHAVE_MARCA_DA_SESSAO, gravarMarca, lerMarca } from '../sessao/marcaDeUso.ts'
import { CHAVE_SAIDA, gravarSaida, lerSaida } from '../sessao/motivoDaSaida.ts'
import { PRAZO_DO_ENCERRAMENTO_MS, traduzir, useConta } from './usarConta.ts'

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
    stopAutoRefresh: vi.fn(),
    mfa: {
      listFactors: vi.fn(),
      challengeAndVerify: vi.fn(),
    },
  }
  return { auth, avisar: (evento: string, sessao: unknown) => ouvinte?.(evento, sessao) }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => ({ auth }), supabaseConfigurado: () => true }))

const MIN = 60_000
const HORA = 60 * MIN

/** O token de acesso, só no formato: o app lê a hora da entrada (`amr`) e a de emissão (`iat`), sem conferir a assinatura. */
function tokenDe(entrada: number, emitido: number = Date.now()): string {
  const parte = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const corpo = { sub: 'u1', iat: Math.floor(emitido / 1000), amr: [{ method: 'password', timestamp: Math.floor(entrada / 1000) }] }
  return `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte(corpo)}.assinatura`
}

/** A sessão como o supabase-js entrega: o usuário e o token; por padrão, quem acabou de entrar. */
const sessaoDe = (id = 'u1', entrada: number = Date.now(), emitido?: number) => ({
  access_token: tokenDe(entrada, emitido),
  user: { id, email: 'maria@usp.br', user_metadata: {} },
})

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
    act(() => avisar('PASSWORD_RECOVERY', sessaoDe()))
    expect(result.current.emRecuperacao).toBe(true)
    expect(result.current.sessao).toEqual({ id: 'u1', email: 'maria@usp.br', nome: 'Maria' })
  })

  it('CA-146: trocar a senha desliga o modo de recuperação', async () => {
    auth.updateUser.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', sessaoDe()))
    await act(async () => {
      expect(await result.current.trocarSenha('novasenha1')).toEqual({ ok: true, erro: null })
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('sair desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', sessaoDe()))
    expect(result.current.emRecuperacao).toBe(true)
    await act(async () => {
      await result.current.sair()
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  describe('sair (spec dados-na-nuvem, D-131)', () => {
    const comSessao = () => auth.getSession.mockResolvedValueOnce({ data: { session: sessaoDe() } } as never)

    beforeEach(() => {
      localStorage.clear()
      localStorage.setItem('metanutri:conta:u1:casos', '["c1"]')
      localStorage.setItem('metanutri:conta:u1:caso:c1', '{"nome":"Ana"}')
      localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
      localStorage.setItem('metanutri:conta:u1:nuvem', '{"versao":null,"mudancas":0,"salvas":0,"itens":0}')
      localStorage.setItem('metanutri:conta:u2:pacientes', '[{"id":"p2"}]')
      localStorage.setItem('metanutri:dono', 'u2')
      localStorage.setItem('metanutri:tema', 'escuro')
    })

    it('CA-478: sair, sem pergunta, apaga a cópia de trabalho da conta que sai; os dados de outra conta e o tema ficam', async () => {
      comSessao()
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      await act(async () => {
        await result.current.sair()
      })
      expect(Object.keys(localStorage).filter((chave) => chave.startsWith('metanutri:conta:u1:'))).toEqual([])
      expect(localStorage.getItem('metanutri:conta:u2:pacientes')).toBe('[{"id":"p2"}]')
      expect(localStorage.getItem('metanutri:dono')).toBe('u2')
      expect(localStorage.getItem('metanutri:tema')).toBe('escuro')
      expect(auth.signOut).toHaveBeenCalledOnce()
    })

    it('DP-22: os dados de antes que ainda não foram para a conta ficam, com o dono, para a próxima entrada', async () => {
      localStorage.setItem('metanutri:dono', 'u1')
      localStorage.setItem('metanutri:pacientes', '[{"id":"antigo"}]')
      comSessao()
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      await act(async () => {
        await result.current.sair()
      })
      expect(localStorage.getItem('metanutri:pacientes')).toBe('[{"id":"antigo"}]')
      expect(localStorage.getItem('metanutri:dono')).toBe('u1')
      expect(Object.keys(localStorage).filter((chave) => chave.startsWith('metanutri:conta:u1:'))).toEqual([])
    })

    it('DP-27: sem internet, o servidor não confirma a saída e a sessão deste navegador é apagada mesmo assim', async () => {
      comSessao()
      auth.signOut.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } } as never)
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      await act(async () => {
        await result.current.sair()
      })
      expect(auth.signOut).toHaveBeenCalledOnce()
      expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' })
      expect(result.current.sessao).toBeNull()
    })

    it('CA-1453 e D-520 (spec separacao-site-app): o "Sair" encerra só a sessão deste navegador, e a marca e o motivo da saída saem', async () => {
      comSessao()
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      gravarSaida(localStorage, { ate: Date.now(), pendente: true })
      await act(async () => {
        await result.current.sair()
      })
      expect(auth.signOut).toHaveBeenCalledOnce()
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
      expect(localStorage.getItem(CHAVE_MARCA_DA_SESSAO)).toBeNull()
      expect(localStorage.getItem(CHAVE_SAIDA)).toBeNull()
    })

    it('CB-506 e DP-SA-25: a biblioteca não apaga a sessão guardada (a renovação falhou sem rede): o app apaga as chaves dela e para a renovação', async () => {
      comSessao()
      localStorage.setItem('sb-qmpljfjbdcrdbqutuvmg-auth-token', '{"access_token":"x"}')
      localStorage.setItem('sb-qmpljfjbdcrdbqutuvmg-auth-token-code-verifier', '"v"')
      auth.signOut.mockResolvedValueOnce({ error: new AuthRetryableFetchError('Failed to fetch', 0) } as never)
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      await act(async () => {
        await result.current.sair()
      })
      expect(Object.keys(localStorage).filter((chave) => chave.startsWith('sb-'))).toEqual([])
      expect(auth.stopAutoRefresh).toHaveBeenCalled()
      expect(localStorage.getItem('metanutri:tema')).toBe('escuro')
    })

    it('DP-10: sem sessão, sair não apaga nada', async () => {
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      const antes = JSON.stringify({ ...localStorage })
      await act(async () => {
        await result.current.sair()
      })
      expect(JSON.stringify({ ...localStorage })).toBe(antes)
    })
  })

  describe('a exclusão pedida e a resposta perdida (spec exclusao-de-conta, CB-250, L6 da revisão)', () => {
    const SESSAO_U1 = sessaoDe()

    beforeEach(() => {
      localStorage.clear()
      localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
      localStorage.setItem('metanutri:conta:u2:pacientes', '[{"id":"p2"}]')
    })

    const daConta = (id: string) => Object.keys(localStorage).filter((chave) => chave.startsWith(`metanutri:conta:${id}:`))

    it('a sessão cai (a renovação falha com o login apagado) depois de um pedido de exclusão: a cópia de trabalho daquela conta é apagada', async () => {
      auth.getSession.mockResolvedValueOnce({ data: { session: SESSAO_U1 } } as never)
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      anotarExclusaoPedida('u1')
      act(() => avisar('SIGNED_OUT', null))
      expect(daConta('u1')).toEqual([])
      expect(daConta('u2')).toHaveLength(1)
      expect(exclusaoPedidaPor('u1')).toBe(false)
    })

    it('sem pedido de exclusão, a sessão que cai não apaga nada (os dados estão na nuvem e voltam ao entrar)', async () => {
      auth.getSession.mockResolvedValueOnce({ data: { session: SESSAO_U1 } } as never)
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      act(() => avisar('SIGNED_OUT', null))
      expect(daConta('u1')).toHaveLength(1)
    })

    it('o site abre sem sessão e com a anotação: a cópia de trabalho daquela conta é apagada', async () => {
      anotarExclusaoPedida('u1')
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      expect(daConta('u1')).toEqual([])
      expect(daConta('u2')).toHaveLength(1)
      expect(exclusaoPedidaPor('u1')).toBe(false)
    })

    it('o site abre com a sessão da própria conta (a exclusão não aconteceu): nada é apagado', async () => {
      anotarExclusaoPedida('u1')
      auth.getSession.mockResolvedValueOnce({ data: { session: SESSAO_U1 } } as never)
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.sessao?.id).toBe('u1'))
      expect(daConta('u1')).toHaveLength(1)
    })
  })

  it('o evento SIGNED_OUT também desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', sessaoDe()))
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

  describe('D-268 e CA-858: a senha de quem tem o app autenticador', () => {
    const FATORES = { data: { all: [], totp: [{ id: 'fator-1', factor_type: 'totp', status: 'verified' }], phone: [], webauthn: [] }, error: null }
    const SEM_APP = new AuthApiError('AAL2 session is required to update email or password when MFA is enabled.', 401, 'insufficient_aal')

    it('o pedido do código do app é reconhecido pelo código do erro, nunca vira "falha de rede"', () => {
      expect(traduzir(SEM_APP.message, 'insufficient_aal')).toBe('precisa-codigo-do-app')
    })

    it('sem o código do app, a recusa diz que falta o código e o modo de troca continua', async () => {
      auth.verifyOtp.mockImplementation(async () => {
        avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'dono@exemplo.com', user_metadata: {} } })
        return { data: { user: { id: 'u1' }, session: {} }, error: null }
      })
      auth.updateUser.mockResolvedValue({ error: SEM_APP })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        await result.current.conferirCodigoDeSenha('dono@exemplo.com', '12345678')
      })
      await act(async () => {
        expect(await result.current.trocarSenha('novasenha1')).toEqual({ ok: false, erro: 'precisa-codigo-do-app' })
      })
      expect(result.current.emRecuperacao).toBe(true)
      expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled()
    })

    it('com o código do app, confirma a sessão pelo app e só então grava a senha', async () => {
      auth.mfa.listFactors.mockResolvedValue(FATORES)
      auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null })
      auth.updateUser.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        expect(await result.current.trocarSenha('novasenha1', '123456')).toEqual({ ok: true, erro: null })
      })
      expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'fator-1', code: '123456' })
      expect(auth.updateUser).toHaveBeenCalledWith({ password: 'novasenha1' })
      expect(auth.mfa.challengeAndVerify.mock.invocationCallOrder[0]).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0] ?? 0)
    })

    it('código do app errado: avisa e não tenta gravar a senha', async () => {
      auth.mfa.listFactors.mockResolvedValue(FATORES)
      auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new AuthApiError('Invalid TOTP code entered', 422, 'mfa_verification_failed') })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        expect(await result.current.trocarSenha('novasenha1', '000000')).toEqual({ ok: false, erro: 'codigo-do-app-invalido' })
      })
      expect(auth.updateUser).not.toHaveBeenCalled()
    })

    it('CB-269: o endereço IP mudou entre pedir e confirmar: tenta uma vez de novo, sozinho', async () => {
      auth.mfa.listFactors.mockResolvedValue(FATORES)
      auth.mfa.challengeAndVerify
        .mockResolvedValueOnce({ data: null, error: new AuthApiError('Challenge and verify IP addresses mismatch.', 422, 'mfa_ip_address_mismatch') })
        .mockResolvedValueOnce({ data: {}, error: null })
      auth.updateUser.mockResolvedValue({ error: null })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        expect(await result.current.trocarSenha('novasenha1', '123456')).toEqual({ ok: true, erro: null })
      })
      expect(auth.mfa.challengeAndVerify).toHaveBeenCalledTimes(2)
    })
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

describe('a sessão com tempo (spec separacao-site-app, D-514 a D-520)', () => {
  /** A cópia de trabalho da conta u1, em dia com a nuvem, e o espaço de outra conta. */
  const espacoEmDia = () => {
    localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 2, salvas: 2, itens: 1, motor: 2 }))
    localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
    localStorage.setItem('metanutri:conta:u2:pacientes', '[{"id":"p2"}]')
  }
  const daConta = (id: string) => Object.keys(localStorage).filter((chave) => chave.startsWith(`metanutri:conta:${id}:`))
  const abrirCom = async (sessao: unknown) => {
    auth.getSession.mockResolvedValueOnce({ data: { session: sessao } } as never)
    const hook = renderHook(() => useConta())
    await waitFor(() => expect(hook.result.current.carregando).toBe(false))
    return hook
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    espacoEmDia()
  })

  describe('ao abrir com a sessão guardada (D-518)', () => {
    it('CA-1451: antes dos 30 minutos sem uso e dentro das 12 horas, a sessão abre direto', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 20 * MIN, entrada: Date.now() - 2 * HORA, admin: false, desvio: 0 })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - 2 * HORA))
      expect(result.current.sessao?.id).toBe('u1')
      expect(auth.signOut).not.toHaveBeenCalled()
      expect(lerMarca(localStorage, 'u1')).toMatchObject({ entrada: expect.any(Number), admin: false })
    })

    it('CA-1450: depois de 30 minutos sem uso, sai antes de a área aparecer: em dia, o espaço é apagado, e Entrar ganha o motivo', async () => {
      const uso = Date.now() - 31 * MIN
      gravarMarca(localStorage, { conta: 'u1', uso, entrada: Date.now() - 2 * HORA, admin: false, desvio: 0 })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - 2 * HORA))
      expect(result.current.sessao).toBeNull()
      expect(daConta('u1')).toEqual([])
      expect(daConta('u2')).toHaveLength(1)
      expect(lerSaida(localStorage)).toEqual({ ate: uso, pendente: false })
      expect(localStorage.getItem(CHAVE_MARCA_DA_SESSAO)).toBeNull()
      await waitFor(() => expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' }))
    })

    it('CA-1450: depois das 12 horas desde a entrada, sai mesmo com uso recente', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - MIN, entrada: null, admin: false, desvio: 0 })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - 12 * HORA - MIN))
      expect(result.current.sessao).toBeNull()
      expect(lerSaida(localStorage)?.pendente).toBe(false)
    })

    it('D-518: com algo que não subiu, sai sem tentar enviar e o espaço fica, inteiro', async () => {
      localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 3, salvas: 2, itens: 1 }))
      const antes = daConta('u1')
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 40 * MIN, entrada: null, admin: false, desvio: 0 })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - HORA))
      expect(result.current.sessao).toBeNull()
      expect(daConta('u1')).toEqual(antes)
      expect(lerSaida(localStorage)?.pendente).toBe(true)
    })

    it('D-518: o valor retido não segura o espaço, como no "Sair" (D-131)', async () => {
      localStorage.setItem('metanutri:conta:u1:retidos', JSON.stringify({ 'chave/metanutri:perfil': '2026-10-27T09:00:00.000Z' }))
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 40 * MIN, entrada: null, admin: false, desvio: 0 })
      await abrirCom(sessaoDe('u1', Date.now() - HORA))
      expect(daConta('u1')).toEqual([])
    })

    it('CB-526: o administrador sai depois de 15 minutos sem uso; a mesma pausa não derruba a nutricionista', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 16 * MIN, entrada: null, admin: true, desvio: 0 })
      expect((await abrirCom(sessaoDe('u1', Date.now() - HORA))).result.current.sessao).toBeNull()

      localStorage.clear()
      espacoEmDia()
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 16 * MIN, entrada: null, admin: false, desvio: 0 })
      expect((await abrirCom(sessaoDe('u1', Date.now() - HORA))).result.current.sessao?.id).toBe('u1')
    })

    it('CB-517: sem marca de uso, vale a hora da entrada', async () => {
      expect((await abrirCom(sessaoDe('u1', Date.now() - 29 * MIN))).result.current.sessao?.id).toBe('u1')
      localStorage.clear()
      espacoEmDia()
      expect((await abrirCom(sessaoDe('u1', Date.now() - 31 * MIN))).result.current.sessao).toBeNull()
    })

    it('CB-518: a marca de outra conta não vale; vale a hora da entrada', async () => {
      gravarMarca(localStorage, { conta: 'u2', uso: Date.now(), entrada: Date.now(), admin: false, desvio: 0 })
      expect((await abrirCom(sessaoDe('u1', Date.now() - 2 * HORA))).result.current.sessao).toBeNull()
    })

    it('DP-SA-4: sem o amr no token e sem a hora gravada pelo app, a sessão conta como vencida', async () => {
      const { result } = await abrirCom({ access_token: 'sem.corpo.legivel', user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } })
      expect(result.current.sessao).toBeNull()
    })

    it('DP-SA-4: sem o amr, vale a hora da entrada que o app gravou', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 5 * MIN, entrada: Date.now() - HORA, admin: false, desvio: 0 })
      const { result } = await abrirCom({ access_token: 'sem.corpo.legivel', user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } })
      expect(result.current.sessao?.id).toBe('u1')
    })

    it('DP-SA-18: o SIGNED_IN que o supabase-js manda ao restaurar a sessão guardada não conta como entrada nova', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 2 * HORA, entrada: null, admin: false, desvio: 0 })
      const { result } = renderHook(() => useConta())
      act(() => avisar('SIGNED_IN', sessaoDe('u1', Date.now() - 3 * HORA)))
      expect(result.current.sessao).toBeNull()
      expect(lerSaida(localStorage)).not.toBeNull()
    })

    it('R7 (revisão): com o motivo de uma saída anterior guardado, a saída ao abrir mantém a hora dele, a do último uso', async () => {
      // A saída por tempo gravou o motivo e apagou a marca, mas a sessão ficou no navegador (o encerramento não terminou).
      const ultimoUso = Date.now() - 40 * MIN
      gravarSaida(localStorage, { ate: ultimoUso, pendente: false })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - HORA))
      expect(result.current.sessao).toBeNull()
      expect(lerSaida(localStorage)).toEqual({ ate: ultimoUso, pendente: false })
    })

    it('R7: a pendência que a saída ao abrir acha soma ao motivo guardado, sem trocar a hora', async () => {
      localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 3, salvas: 2, itens: 1 }))
      const ultimoUso = Date.now() - 40 * MIN
      gravarSaida(localStorage, { ate: ultimoUso, pendente: false })
      await abrirCom(sessaoDe('u1', Date.now() - HORA))
      expect(lerSaida(localStorage)).toEqual({ ate: ultimoUso, pendente: true })
    })

    it('a saída ao abrir acontece uma vez, mesmo com a sessão chegando pelo getSession e pelo evento', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 31 * MIN, entrada: null, admin: false, desvio: 0 })
      const vencida = sessaoDe('u1', Date.now() - HORA)
      const { result } = await abrirCom(vencida)
      act(() => avisar('INITIAL_SESSION', vencida))
      expect(result.current.sessao).toBeNull()
      await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce())
    })
  })

  describe('ao entrar', () => {
    it('a entrada grava a marca com o uso de agora, a entrada do token e o desvio do relógio; o motivo de antes sai', async () => {
      gravarSaida(localStorage, { ate: Date.now() - HORA, pendente: false })
      const adiantado = 3 * HORA
      auth.signInWithPassword.mockImplementationOnce(async () => {
        // O servidor emite o token na hora dele: 3 horas à frente do relógio deste computador (CA-1454).
        avisar('SIGNED_IN', sessaoDe('u1', Date.now() + adiantado, Date.now() + adiantado))
        return { error: null }
      })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        await result.current.entrar('maria@usp.br', 'senhaforte1')
      })
      expect(result.current.sessao?.id).toBe('u1')
      const marca = lerMarca(localStorage, 'u1')
      expect(marca?.desvio).toBeGreaterThan(adiantado - 5_000)
      expect(marca?.desvio).toBeLessThan(adiantado + 5_000)
      expect(Math.abs((marca?.uso ?? 0) - (Date.now() + adiantado))).toBeLessThan(5_000)
      expect(lerSaida(localStorage)).toBeNull()
    })

    it('entrar de novo na mesma conta, depois de uma marca velha, não sai: a entrada nova vale como uso', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 5 * HORA, entrada: Date.now() - 6 * HORA, admin: false, desvio: 0 })
      auth.signInWithPassword.mockImplementationOnce(async () => {
        avisar('SIGNED_IN', sessaoDe())
        return { error: null }
      })
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      await act(async () => {
        await result.current.entrar('maria@usp.br', 'senhaforte1')
      })
      expect(result.current.sessao?.id).toBe('u1')
    })

    it('outra aba entrou (o SIGNED_IN chega por ela): a entrada recente vale', async () => {
      const { result } = renderHook(() => useConta())
      await waitFor(() => expect(result.current.carregando).toBe(false))
      act(() => avisar('SIGNED_IN', sessaoDe()))
      expect(result.current.sessao?.id).toBe('u1')
    })

    it('DP-SA-18: com a sessão aberta, a renovação do token atualiza o desvio e não mexe no uso', async () => {
      gravarMarca(localStorage, { conta: 'u1', uso: Date.now() - 10 * MIN, entrada: null, admin: true, desvio: 0 })
      const { result } = await abrirCom(sessaoDe('u1', Date.now() - HORA))
      const usoAntes = lerMarca(localStorage, 'u1')?.uso
      act(() => avisar('TOKEN_REFRESHED', sessaoDe('u1', Date.now() - HORA, Date.now() + 2 * MIN)))
      expect(result.current.sessao?.id).toBe('u1')
      const marca = lerMarca(localStorage, 'u1')
      expect(marca?.uso).toBe(usoAntes)
      expect(marca?.admin).toBe(true)
      expect(marca?.desvio).toBeGreaterThan(MIN)
    })
  })

  describe('a saída por tempo (D-517)', () => {
    it('CA-1447 e CA-1452: em dia, apaga o espaço, grava o motivo e encerra só a sessão deste navegador', async () => {
      const { result } = await abrirCom(sessaoDe())
      const ate = Date.now() - 30 * MIN
      await act(async () => {
        await result.current.sairPorTempo({ apagar: true, ate })
      })
      expect(daConta('u1')).toEqual([])
      expect(daConta('u2')).toHaveLength(1)
      expect(lerSaida(localStorage)).toEqual({ ate, pendente: false })
      expect(localStorage.getItem(CHAVE_MARCA_DA_SESSAO)).toBeNull()
      expect(auth.signOut).toHaveBeenCalledOnce()
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
      expect(result.current.sessao).toBeNull()
    })

    it('CA-1448: com pendência, o espaço fica e o motivo diz que ficou algo para enviar', async () => {
      const { result } = await abrirCom(sessaoDe())
      const antes = daConta('u1')
      await act(async () => {
        await result.current.sairPorTempo({ apagar: false, ate: Date.now() })
      })
      expect(daConta('u1')).toEqual(antes)
      expect(lerSaida(localStorage)?.pendente).toBe(true)
      expect(result.current.sessao).toBeNull()
    })

    it('CA-1448 e DP-SA-25: o servidor não responde: em 5 s a sessão deste navegador sai mesmo assim', async () => {
      const { result } = await abrirCom(sessaoDe())
      localStorage.setItem('sb-falso-auth-token', '{"access_token":"x"}')
      auth.signOut.mockImplementationOnce(() => new Promise(() => undefined))
      vi.useFakeTimers()
      try {
        let terminou = false
        act(() => {
          void result.current.sairPorTempo({ apagar: false, ate: Date.now() }).then(() => {
            terminou = true
          })
        })
        await act(async () => {
          await vi.advanceTimersByTimeAsync(PRAZO_DO_ENCERRAMENTO_MS)
        })
        expect(terminou).toBe(true)
        expect(localStorage.getItem('sb-falso-auth-token')).toBeNull()
        expect(result.current.sessao).toBeNull()
      } finally {
        vi.useRealTimers()
      }
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

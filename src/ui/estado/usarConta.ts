import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { ehIdPlano, nomeSugerido, soDigitos, type ErroConta, type IdPlano, type Sessao } from '@/domain/conta.ts'
import { apagarDadosDaConta } from '@/domain/donoDosDados.ts'
import { ehSituacao, type Crn, type Situacao } from '@/domain/situacao.ts'
import type { TipoVolta } from '../voltaExterna.ts'
import { armazenamentoLocal } from './armazenamentoLocal.ts'
import { obterSupabase, supabaseConfigurado } from './supabase.ts'

export interface Resultado {
  readonly ok: boolean
  readonly erro: ErroConta | null
  /** Cadastro com confirmação por e-mail pendente. */
  readonly confirmarEmail?: boolean
}

/**
 * A conta confirmada pelo código, com o que a pessoa marcou no cadastro: é por isso
 * que ela segue para o lugar certo mesmo noutro aparelho (spec confirmacao-por-codigo, CA-407).
 */
export interface ResultadoConfirmacao extends Resultado {
  readonly situacao?: Situacao
  readonly planoDesejado?: IdPlano
}

export interface DadosCadastro {
  readonly nome: string
  readonly email: string
  readonly senha: string
  /** O que a pessoa marcou. Não dá plano: quem dá é o servidor (spec estilo-spora, CA-174). */
  readonly planoDesejado: IdPlano
  readonly versaoTermos: string
  /** O "Você é" do cadastro. O servidor cria o perfil com isto (spec conta-e-verificacao, CA-269). */
  readonly situacao: Situacao
  /** Só para nutricionista. */
  readonly crn: Crn | null
}

export interface ValorConta {
  readonly sessao: Sessao | null
  readonly carregando: boolean
  /** Falso quando o projeto não tem chaves do Supabase: o app roda no modo local. */
  readonly disponivel: boolean
  /** Chegou pelo link ou pelo código de troca de senha e ainda não trocou. */
  readonly emRecuperacao: boolean
  /*
   * D-113: entrar, cadastrar, reenviar e pedir a troca de senha levam o token da verificação contra
   * robôs (`captchaToken`). Sem ele, o pedido sai igual ao de antes (CA-463). Confirmar o código não leva (CA-457).
   */
  readonly entrar: (email: string, senha: string, captchaToken?: string) => Promise<Resultado>
  readonly cadastrar: (dados: DadosCadastro, captchaToken?: string) => Promise<Resultado>
  readonly reenviarConfirmacao: (email: string, captchaToken?: string) => Promise<Resultado>
  /** Confirma a conta com o código do e-mail; dando certo, a pessoa já entra (CA-407). */
  readonly confirmarCodigo: (email: string, codigo: string) => Promise<ResultadoConfirmacao>
  readonly pedirTrocaDeSenha: (email: string, captchaToken?: string) => Promise<Resultado>
  /** Confere o código de troca de senha; dando certo, liga o modo de recuperação e `trocarSenha` grava a nova (CA-412). */
  readonly conferirCodigoDeSenha: (email: string, codigo: string) => Promise<Resultado>
  readonly trocarSenha: (senha: string) => Promise<Resultado>
  /**
   * D-131 (spec dados-na-nuvem): sai e apaga a cópia de trabalho desta conta neste navegador; os dados
   * dela estão na nuvem. Os de outras contas ficam (D-124). Quem chama para a nuvem antes (DP-11).
   */
  readonly sair: () => Promise<void>
}

const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }
const OK: Resultado = { ok: true, erro: null }

/** D-113: o token da verificação vai só quando existe; sem ele, o pedido sai igual ao de antes (CA-463). */
const comVerificacao = (captchaToken: string | undefined): { readonly captchaToken?: string } => (captchaToken ? { captchaToken } : {})

/**
 * O erro de um pedido que leva a verificação. A recusa dela diz coisas diferentes: com o token, a
 * verificação foi feita e o servidor não aceitou (CA-460); sem o token, o script do Cloudflare não
 * carregou e o pedido seguiu mesmo assim (D-119), mas o captcha está ligado no Supabase (CA-461).
 */
function erroDoPedido(erro: { readonly message: string; readonly code?: string | undefined }, captchaToken: string | undefined): ErroConta {
  const traduzido = traduzir(erro.message, erro.code)
  return traduzido === 'verificacao-recusada' && !captchaToken ? 'verificacao-nao-carregou' : traduzido
}

/**
 * As mensagens do Supabase, em inglês, viram os erros que a tela sabe explicar. O
 * código do erro, quando vem, vale mais que o texto: o texto muda de versão para versão.
 */
export function traduzir(mensagem: string, codigo?: string): ErroConta {
  if (codigo === 'email_not_confirmed') return 'email-nao-confirmado'
  // CA-460: o servidor recusou a verificação contra robôs (vencida, já usada ou falsa).
  if (codigo === 'captcha_failed') return 'verificacao-recusada'
  // O Supabase usa o mesmo código para o código digitado errado e para o vencido.
  if (codigo === 'otp_expired') return 'codigo-invalido'
  const texto = mensagem.toLowerCase()
  if (texto.includes('captcha')) return 'verificacao-recusada'
  if (texto.includes('already registered') || texto.includes('already been registered')) return 'email-em-uso'
  if (texto.includes('invalid login') || texto.includes('invalid credentials')) return 'credencial-invalida'
  if (texto.includes('not confirmed')) return 'email-nao-confirmado'
  if (texto.includes('token has expired or is invalid')) return 'codigo-invalido'
  if (texto.includes('expired')) return 'link-vencido'
  if (texto.includes('rate limit') || texto.includes('security purposes') || texto.includes('too many')) return 'muitas-tentativas'
  return 'falha-rede'
}

/** Para onde o e-mail do Supabase devolve a pessoa: o próprio site, com o motivo (spec R-10). */
export function enderecoDeVolta(motivo: Exclude<TipoVolta, 'pagamento'>): string {
  const { origin, pathname } = globalThis.location
  return `${origin}${pathname}?volta=${motivo}`
}

type Usuario = { id: string; email?: string | undefined; user_metadata?: Record<string, unknown> } | null

function montarSessao(usuario: Usuario): Sessao | null {
  if (!usuario?.email) return null
  const meta = usuario.user_metadata ?? {}
  const nome = typeof meta['nome'] === 'string' && meta['nome'].trim() ? (meta['nome'] as string) : nomeSugerido(usuario.email)
  return { id: usuario.id, email: usuario.email, nome }
}

/** Sessão da conta na nuvem. Sem Supabase configurado, devolve sessão nula e `disponivel: false`. */
export function useConta(): ValorConta {
  const disponivel = supabaseConfigurado()
  // Criado uma vez, fora da renderização: assim o estado inicial já sabe se há servidor.
  const [cliente] = useState(() => obterSupabase())
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(cliente !== null)
  const [emRecuperacao, setEmRecuperacao] = useState(false)

  useEffect(() => {
    if (!cliente) return
    let vivo = true

    void cliente.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSessao(montarSessao(data.session?.user ?? null))
      setCarregando(false)
    })

    const { data: inscricao } = cliente.auth.onAuthStateChange((evento, nova) => {
      if (!vivo) return
      if (evento === 'PASSWORD_RECOVERY') setEmRecuperacao(true)
      // Sair no meio da troca de senha não deve deixar o modo de recuperação ligado.
      if (evento === 'SIGNED_OUT') setEmRecuperacao(false)
      setSessao(montarSessao(nova?.user ?? null))
    })

    return () => {
      vivo = false
      inscricao.subscription.unsubscribe()
    }
  }, [cliente])

  const entrar = useCallback(async (email: string, senha: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.signInWithPassword({ email: email.trim(), password: senha, ...(captchaToken ? { options: { captchaToken } } : {}) })
    return error ? { ok: false, erro: erroDoPedido(error, captchaToken) } : OK
  }, [])

  const cadastrar = useCallback(async (dados: DadosCadastro, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const email = dados.email.trim()
    const versaoTermos = dados.versaoTermos.trim()
    const { data, error } = await c.auth.signUp({
      email,
      password: dados.senha,
      options: {
        emailRedirectTo: enderecoDeVolta('confirmacao'),
        data: {
          nome: dados.nome.trim() || nomeSugerido(email),
          plano_desejado: dados.planoDesejado,
          situacao: dados.situacao,
          ...(dados.situacao === 'nutricionista' && dados.crn ? { crn_regiao: dados.crn.regiao, crn_numero: dados.crn.numero } : {}),
          // Sem versão (remendo do cadastro antigo, Tarefa 19 apaga), não grava aceite:
          // não houve termos para aceitar, então não é para constar como se tivesse.
          ...(versaoTermos ? { termos_versao: versaoTermos, termos_aceitos_em: new Date().toISOString() } : {}),
        },
        ...comVerificacao(captchaToken),
      },
    })
    if (error) return { ok: false, erro: erroDoPedido(error, captchaToken) }
    // Com confirmação ligada, o Supabase não conta que o e-mail já existe (para não
    // revelar quem tem conta): devolve um usuário sem identidade. É o mesmo aviso.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, erro: 'email-em-uso' }
    return { ok: true, erro: null, confirmarEmail: data.session === null }
  }, [])

  const reenviarConfirmacao = useCallback(async (email: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: enderecoDeVolta('confirmacao'), ...comVerificacao(captchaToken) },
    })
    return error ? { ok: false, erro: erroDoPedido(error, captchaToken) } : OK
  }, [])

  const confirmarCodigo = useCallback(async (email: string, codigo: string): Promise<ResultadoConfirmacao> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    // O e-mail de confirmação não traz link que confirme ao ser aberto: o antivírus do
    // Microsoft 365 abre todo link sozinho (spec confirmacao-por-codigo, D-89).
    const { data, error } = await c.auth.verifyOtp({ email: email.trim(), token: soDigitos(codigo), type: 'email' })
    if (error) return { ok: false, erro: traduzir(error.message, error.code) }
    const meta = data.user?.user_metadata ?? {}
    const situacao: unknown = meta['situacao']
    const plano: unknown = meta['plano_desejado']
    return { ...OK, ...(ehSituacao(situacao) ? { situacao } : {}), ...(ehIdPlano(plano) ? { planoDesejado: plano } : {}) }
  }, [])

  const pedirTrocaDeSenha = useCallback(async (email: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDeVolta('recuperacao'), ...comVerificacao(captchaToken) })
    if (!error) return OK
    // CA-460 e CA-461: a recusa da verificação aparece. Ela não diz se a conta existe: o servidor confere a
    // verificação antes de procurar a conta, então a resposta é a mesma para quem tem e quem não tem (CA-144).
    const recusa = erroDoPedido(error, captchaToken)
    if (recusa === 'verificacao-recusada' || recusa === 'verificacao-nao-carregou') return { ok: false, erro: recusa }
    // CA-144: a tela diz a mesma coisa exista a conta ou não — até o limite de
    // tentativas, que só dispara quando a conta existe de verdade, fica calado. Só a
    // falta de internet aparece, e é achada pelo tipo do erro, não por palavra no
    // texto: no WebKit (Safari e todo navegador de iPhone) a queda de rede chega como
    // "Load failed", que não contém "fetch" nem "network".
    if (isAuthRetryableFetchError(error) && error.status === 0) return { ok: false, erro: 'falha-rede' }
    return OK
  }, [])

  const conferirCodigoDeSenha = useCallback(async (email: string, codigo: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    // Dando certo, o Supabase avisa PASSWORD_RECOVERY, como no link: o modo de recuperação liga sozinho.
    const { error } = await c.auth.verifyOtp({ email: email.trim(), token: soDigitos(codigo), type: 'recovery' })
    return error ? { ok: false, erro: traduzir(error.message, error.code) } : OK
  }, [])

  const trocarSenha = useCallback(async (senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.updateUser({ password: senha })
    if (error) return { ok: false, erro: traduzir(error.message, error.code) }
    setEmRecuperacao(false)
    return OK
  }, [])

  const usuarioId = sessao?.id ?? null
  const sair = useCallback(
    async () => {
      // Apaga antes de sair: se a rede falhar no meio, o dado já não fica no computador (D-131).
      // Só o espaço de quem sai, e os dados de antes de que ela é dona (D-124); sem sessão, não há
      // conta saindo (DP-10).
      if (usuarioId !== null) apagarDadosDaConta(armazenamentoLocal(), usuarioId)
      const c = obterSupabase()
      if (!c) return
      await c.auth.signOut()
      setSessao(null)
      setEmRecuperacao(false)
    },
    [usuarioId],
  )

  return {
    sessao,
    carregando,
    disponivel,
    emRecuperacao,
    entrar,
    cadastrar,
    reenviarConfirmacao,
    confirmarCodigo,
    pedirTrocaDeSenha,
    conferirCodigoDeSenha,
    trocarSenha,
    sair,
  }
}

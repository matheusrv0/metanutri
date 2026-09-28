import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { nomeSugerido, type ErroConta, type IdPlano, type Sessao } from '@/domain/conta.ts'
import type { TipoVolta } from '../voltaExterna.ts'
import { obterSupabase, supabaseConfigurado } from './supabase.ts'

export interface Resultado {
  readonly ok: boolean
  readonly erro: ErroConta | null
  /** Cadastro com confirmação por e-mail pendente. */
  readonly confirmarEmail?: boolean
}

export interface DadosCadastro {
  readonly nome: string
  readonly email: string
  readonly senha: string
  /** O que a pessoa marcou. Não dá plano: quem dá é o servidor (spec estilo-spora, CA-174). */
  readonly planoDesejado: IdPlano
  readonly versaoTermos: string
}

export interface ValorConta {
  readonly sessao: Sessao | null
  readonly carregando: boolean
  /** Falso quando o projeto não tem chaves do Supabase: o app roda no modo local. */
  readonly disponivel: boolean
  /** Chegou pelo link de troca de senha e ainda não trocou. */
  readonly emRecuperacao: boolean
  readonly entrar: (email: string, senha: string) => Promise<Resultado>
  readonly cadastrar: (dados: DadosCadastro) => Promise<Resultado>
  readonly reenviarConfirmacao: (email: string) => Promise<Resultado>
  readonly pedirTrocaDeSenha: (email: string) => Promise<Resultado>
  readonly trocarSenha: (senha: string) => Promise<Resultado>
  readonly sair: () => Promise<void>
}

const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }
const OK: Resultado = { ok: true, erro: null }

/** As mensagens do Supabase, em inglês, viram os erros que a tela sabe explicar. */
export function traduzir(mensagem: string): ErroConta {
  const texto = mensagem.toLowerCase()
  if (texto.includes('already registered') || texto.includes('already been registered')) return 'email-em-uso'
  if (texto.includes('invalid login') || texto.includes('invalid credentials')) return 'credencial-invalida'
  if (texto.includes('not confirmed')) return 'email-nao-confirmado'
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

  const entrar = useCallback(async (email: string, senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.signInWithPassword({ email: email.trim(), password: senha })
    return error ? { ok: false, erro: traduzir(error.message) } : OK
  }, [])

  const cadastrar = useCallback(async (dados: DadosCadastro): Promise<Resultado> => {
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
          // Sem versão (remendo do cadastro antigo, Tarefa 19 apaga), não grava aceite:
          // não houve termos para aceitar, então não é para constar como se tivesse.
          ...(versaoTermos ? { termos_versao: versaoTermos, termos_aceitos_em: new Date().toISOString() } : {}),
        },
      },
    })
    if (error) return { ok: false, erro: traduzir(error.message) }
    // Com confirmação ligada, o Supabase não conta que o e-mail já existe (para não
    // revelar quem tem conta): devolve um usuário sem identidade. É o mesmo aviso.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, erro: 'email-em-uso' }
    return { ok: true, erro: null, confirmarEmail: data.session === null }
  }, [])

  const reenviarConfirmacao = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: enderecoDeVolta('confirmacao') } })
    return error ? { ok: false, erro: traduzir(error.message) } : OK
  }, [])

  const pedirTrocaDeSenha = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDeVolta('recuperacao') })
    if (!error) return OK
    // CA-144: a tela diz a mesma coisa exista a conta ou não — até o limite de
    // tentativas, que só dispara quando a conta existe de verdade, fica calado. Só a
    // falta de internet aparece, e é achada pelo tipo do erro, não por palavra no
    // texto: no WebKit (Safari e todo navegador de iPhone) a queda de rede chega como
    // "Load failed", que não contém "fetch" nem "network".
    if (isAuthRetryableFetchError(error) && error.status === 0) return { ok: false, erro: 'falha-rede' }
    return OK
  }, [])

  const trocarSenha = useCallback(async (senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.updateUser({ password: senha })
    if (error) return { ok: false, erro: traduzir(error.message) }
    setEmRecuperacao(false)
    return OK
  }, [])

  const sair = useCallback(async () => {
    const c = obterSupabase()
    if (!c) return
    await c.auth.signOut()
    setSessao(null)
    setEmRecuperacao(false)
  }, [])

  return { sessao, carregando, disponivel, emRecuperacao, entrar, cadastrar, reenviarConfirmacao, pedirTrocaDeSenha, trocarSenha, sair }
}

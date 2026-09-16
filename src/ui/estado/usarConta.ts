import { useCallback, useEffect, useState } from 'react'
import { nomeSugerido, type ErroConta, type IdPlano, type Sessao } from '@/domain/conta.ts'
import { obterSupabase, supabaseConfigurado } from './supabase.ts'

interface Resultado {
  readonly ok: boolean
  readonly erro: ErroConta | null
  /** Cadastro com confirmação por e-mail pendente. */
  readonly confirmarEmail?: boolean
}

export interface ValorConta {
  readonly sessao: Sessao | null
  readonly carregando: boolean
  /** Falso quando o projeto não tem chaves do Supabase: a área de conta explica isso. */
  readonly disponivel: boolean
  readonly entrar: (email: string, senha: string) => Promise<Resultado>
  readonly cadastrar: (email: string, senha: string) => Promise<Resultado>
  readonly sair: () => Promise<void>
}

const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }

function traduzir(mensagem: string): ErroConta {
  const texto = mensagem.toLowerCase()
  if (texto.includes('already registered') || texto.includes('already been registered')) return 'email-em-uso'
  if (texto.includes('invalid login') || texto.includes('invalid credentials')) return 'credencial-invalida'
  if (texto.includes('fetch') || texto.includes('network')) return 'falha-rede'
  return 'falha-rede'
}

/** Sessão da conta na nuvem. Sem Supabase configurado, devolve sessão nula e `disponivel: false`. */
export function useConta(): ValorConta {
  const disponivel = supabaseConfigurado()
  // Criado uma vez, fora da renderização: assim o estado inicial já sabe se há servidor.
  const [cliente] = useState(() => obterSupabase())
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(cliente !== null)

  useEffect(() => {
    if (!cliente) return

    let vivo = true
    const montarSessao = (usuario: { id: string; email?: string | undefined; user_metadata?: Record<string, unknown> } | null): Sessao | null => {
      if (!usuario?.email) return null
      const meta = usuario.user_metadata ?? {}
      const nome = typeof meta['nome'] === 'string' && meta['nome'].trim() ? (meta['nome'] as string) : nomeSugerido(usuario.email)
      const plano = typeof meta['plano'] === 'string' ? (meta['plano'] as IdPlano) : 'estudante'
      return { id: usuario.id, email: usuario.email, nome, plano }
    }

    void cliente.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSessao(montarSessao(data.session?.user ?? null))
      setCarregando(false)
    })

    const { data: inscricao } = cliente.auth.onAuthStateChange((_evento, nova) => {
      if (!vivo) return
      setSessao(montarSessao(nova?.user ?? null))
    })

    return () => {
      vivo = false
      inscricao.subscription.unsubscribe()
    }
  }, [cliente])

  const entrar = useCallback(async (email: string, senha: string): Promise<Resultado> => {
    const cliente = obterSupabase()
    if (!cliente) return SEM_SERVIDOR
    const { error } = await cliente.auth.signInWithPassword({ email: email.trim(), password: senha })
    return error ? { ok: false, erro: traduzir(error.message) } : { ok: true, erro: null }
  }, [])

  const cadastrar = useCallback(async (email: string, senha: string): Promise<Resultado> => {
    const cliente = obterSupabase()
    if (!cliente) return SEM_SERVIDOR
    const limpo = email.trim()
    const { data, error } = await cliente.auth.signUp({
      email: limpo,
      password: senha,
      options: { data: { nome: nomeSugerido(limpo), plano: 'estudante' } },
    })
    if (error) return { ok: false, erro: traduzir(error.message) }
    // Sem sessão na resposta: o projeto exige confirmar o e-mail antes de entrar.
    return { ok: true, erro: null, confirmarEmail: data.session === null }
  }, [])

  const sair = useCallback(async () => {
    const cliente = obterSupabase()
    if (!cliente) return
    await cliente.auth.signOut()
    setSessao(null)
  }, [])

  return { sessao, carregando, disponivel, entrar, cadastrar, sair }
}

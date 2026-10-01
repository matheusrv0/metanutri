// O perfil da conta (situação e CRN) e se ela é administradora. O navegador só lê;
// mudar a situação passa pelas funções do banco, que conferem cada pedido (spec
// conta-e-verificacao, D-40).
import { useCallback, useEffect, useState } from 'react'
import { daLinhaPerfil, type Crn, type PerfilConta, type Situacao } from '@/domain/situacao.ts'
import { mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorPerfilConta {
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  /** A primeira resposta chegou (ou não há sessão, ou não há servidor). */
  readonly carregado: boolean
  /** A leitura falhou: não dá para afirmar que a conta não tem perfil. */
  readonly falhou: boolean
  readonly informarSituacao: (situacao: Situacao, crn: Crn | null) => Promise<string | null>
  readonly meFormei: (crn: Crn) => Promise<string | null>
  readonly corrigirCrn: (crn: Crn) => Promise<string | null>
  readonly recarregar: () => void
}

interface Carga {
  readonly chave: string
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  readonly falhou: boolean
}

const COLUNAS = 'nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em, crn_decidido_em'
const SEM_SERVIDOR = 'A conta na nuvem não está configurada neste MetaNutri.'

export function usePerfilConta(usuarioId: string | null): ValorPerfilConta {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<Carga | null>(null)
  const [versao, setVersao] = useState(0)

  // A chave junta conta e versão: trocar de conta ou recarregar descarta a carga velha no render.
  const chave = usuarioId ? `${usuarioId}:${versao}` : 'sem-sessao'
  const atual = carga?.chave === chave ? carga : null
  const carregado = usuarioId === null || cliente === null || atual !== null

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !usuarioId) return
    let vivo = true
    // O administrador lê todos os perfis (RLS): sem o filtro, viriam várias linhas.
    void Promise.all([cliente.from('perfis').select(COLUNAS).eq('id', usuarioId).maybeSingle(), cliente.rpc('eh_admin')]).then(([perfil, admin]) => {
      if (!vivo) return
      setCarga({ chave, perfil: daLinhaPerfil(perfil.data), ehAdmin: admin.data === true, falhou: perfil.error !== null })
    })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId, chave])

  const chamar = useCallback(async (funcao: string, argumentos: Record<string, unknown>): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.rpc(funcao, argumentos)
    if (error) return mensagemDoBanco(error)
    setVersao((v) => v + 1)
    return null
  }, [])

  const informarSituacao = useCallback(
    (situacao: Situacao, crn: Crn | null) => chamar('informar_situacao', { p_situacao: situacao, p_regiao: crn?.regiao ?? null, p_numero: crn?.numero ?? null }),
    [chamar],
  )
  const meFormei = useCallback((crn: Crn) => chamar('me_formei', { p_regiao: crn.regiao, p_numero: crn.numero }), [chamar])
  const corrigirCrn = useCallback((crn: Crn) => chamar('corrigir_crn', { p_regiao: crn.regiao, p_numero: crn.numero }), [chamar])

  return {
    perfil: atual?.perfil ?? null,
    ehAdmin: atual?.ehAdmin ?? false,
    carregado,
    falhou: atual?.falhou ?? false,
    informarSituacao,
    meFormei,
    corrigirCrn,
    recarregar,
  }
}

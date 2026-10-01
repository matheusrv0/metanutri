// O perfil da conta (situação e CRN) e se ela é administradora. O navegador só lê;
// mudar a situação passa pelas funções do banco, que conferem cada pedido (spec
// conta-e-verificacao, D-40).
import { useCallback, useEffect, useState } from 'react'
import { daLinhaPerfil, type Crn, type PerfilConta, type Situacao } from '@/domain/situacao.ts'
import { armazenamentoLocal } from './armazenamentoLocal.ts'
import { mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorPerfilConta {
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  /** A primeira resposta desta conta chegou (ou não há sessão, ou não há servidor). Releituras não voltam a falso. */
  readonly carregado: boolean
  /** A leitura falhou: não dá para afirmar que a conta não tem perfil. */
  readonly falhou: boolean
  readonly informarSituacao: (situacao: Situacao, crn: Crn | null) => Promise<string | null>
  readonly meFormei: (crn: Crn) => Promise<string | null>
  readonly corrigirCrn: (crn: Crn) => Promise<string | null>
  readonly recarregar: () => void
}

interface Carga {
  /** De quem é esta leitura: a de outra conta nunca aparece. */
  readonly usuario: string
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  readonly falhou: boolean
}

const COLUNAS = 'nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em, crn_decidido_em'
const CHAVE_GUARDADA = 'metanutri:perfil-conta'

/** A última linha de perfil lida com sucesso, por conta: é o que vale quando a internet cai. */
function lerGuardada(usuarioId: string): unknown {
  try {
    const bruto: unknown = JSON.parse(armazenamentoLocal()?.getItem(CHAVE_GUARDADA) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return null
    const o = bruto as Record<string, unknown>
    return o['usuario'] === usuarioId ? o['linha'] : null
  } catch {
    return null
  }
}

function guardar(usuarioId: string, linha: unknown): void {
  try {
    armazenamentoLocal()?.setItem(CHAVE_GUARDADA, JSON.stringify({ usuario: usuarioId, linha: linha ?? null }))
  } catch {
    // sem espaço no aparelho: a próxima leitura com sucesso tenta de novo
  }
}

const SEM_SERVIDOR = 'A conta na nuvem não está configurada neste MetaNutri.'

export function usePerfilConta(usuarioId: string | null): ValorPerfilConta {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<Carga | null>(null)
  const [versao, setVersao] = useState(0)

  // A chave junta conta e versão e dispara a releitura. Enquanto relê a mesma conta, a última
  // leitura dela continua valendo (sem voltar a "carregando"); trocar de conta a descarta no render.
  const chave = usuarioId ? `${usuarioId}:${versao}` : 'sem-sessao'
  const atual = usuarioId !== null && carga?.usuario === usuarioId ? carga : null
  const carregado = usuarioId === null || cliente === null || atual !== null

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !usuarioId) return
    let vivo = true
    // O administrador lê todos os perfis (RLS): sem o filtro, viriam várias linhas.
    void Promise.all([cliente.from('perfis').select(COLUNAS).eq('id', usuarioId).maybeSingle(), cliente.rpc('eh_admin')]).then(([perfil, admin]) => {
      if (!vivo) return
      const falhou = perfil.error !== null
      if (!falhou) guardar(usuarioId, perfil.data)
      setCarga({
        usuario: usuarioId,
        perfil: daLinhaPerfil(falhou ? lerGuardada(usuarioId) : perfil.data),
        ehAdmin: admin.data === true,
        falhou,
      })
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

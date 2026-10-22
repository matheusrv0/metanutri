// O perfil da conta (situação e CRN) e se ela é administradora. O navegador só lê;
// mudar a situação passa pelas funções do banco, que conferem cada pedido (spec
// conta-e-verificacao, D-40).
//
// Administrador só com o código do app autenticador (spec seguranca-lote-5, D-260 e DP-L5-1): a conta é de
// administrador quando eh_admin ou admin_sem_segundo_fator dizem sim (DP-L5-2); ela fica liberada só com a
// sessão confirmada pelo código (aal2). O nível vem do token, sem rede. Quem decide de verdade é o banco.
import { useCallback, useEffect, useState } from 'react'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { daLinhaPerfil, type Crn, type PerfilConta, type Situacao } from '@/domain/situacao.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'
import { mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorPerfilConta {
  readonly perfil: PerfilConta | null
  /** Administrador com a sessão confirmada pelo código do app: as telas e as leituras do administrador abrem. */
  readonly ehAdmin: boolean
  /** Administrador sem o código do app nesta sessão: Negócio e Aprovações pedem o código (D-261). */
  readonly precisaSegundoFator: boolean
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
  readonly precisaSegundoFator: boolean
  readonly falhou: boolean
}

const COLUNAS = 'nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em, crn_decidido_em'
const CHAVE_GUARDADA = 'metanutri:perfil-conta'

/** A última linha de perfil lida com sucesso, por conta: é o que vale quando a internet cai. */
function lerGuardada(armazenamento: Armazenamento | null, usuarioId: string): unknown {
  try {
    const bruto: unknown = JSON.parse(armazenamento?.getItem(CHAVE_GUARDADA) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null) return null
    const o = bruto as Record<string, unknown>
    return o['usuario'] === usuarioId ? o['linha'] : null
  } catch {
    return null
  }
}

function guardar(armazenamento: Armazenamento | null, usuarioId: string, linha: unknown): void {
  try {
    armazenamento?.setItem(CHAVE_GUARDADA, JSON.stringify({ usuario: usuarioId, linha: linha ?? null }))
  } catch {
    // sem espaço no aparelho: a próxima leitura com sucesso tenta de novo
  }
}

const SEM_SERVIDOR = 'O servidor da conta não está configurado nesta instalação.'

export function usePerfilConta(usuarioId: string | null): ValorPerfilConta {
  const [cliente] = useState(() => obterSupabase())
  // A cópia guardada fica no espaço da conta (spec dados-por-conta, D-120).
  const armazenamento = useArmazenamento()
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
    void Promise.all([
      cliente.from('perfis').select(COLUNAS).eq('id', usuarioId).maybeSingle(),
      cliente.rpc('eh_admin'),
      // Antes do 014 esta função não existe: o erro vale como "não" (CA-840).
      cliente.rpc('admin_sem_segundo_fator'),
      cliente.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]).then(([perfil, admin, semFator, nivel]) => {
      if (!vivo) return
      const falhou = perfil.error !== null
      if (!falhou) guardar(armazenamento, usuarioId, perfil.data)
      const contaDeAdmin = admin.data === true || semFator.data === true
      const comCodigo = nivel.data?.currentLevel === 'aal2'
      setCarga({
        usuario: usuarioId,
        perfil: daLinhaPerfil(falhou ? lerGuardada(armazenamento, usuarioId) : perfil.data),
        ehAdmin: contaDeAdmin && comCodigo,
        precisaSegundoFator: contaDeAdmin && !comCodigo,
        falhou,
      })
    })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId, chave, armazenamento])

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
    precisaSegundoFator: atual?.precisaSegundoFator ?? false,
    carregado,
    falhou: atual?.falhou ?? false,
    informarSituacao,
    meFormei,
    corrigirCrn,
    recarregar,
  }
}

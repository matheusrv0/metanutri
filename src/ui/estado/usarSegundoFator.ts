// O segundo fator do administrador (spec seguranca-lote-5, D-260 e D-261): o app autenticador (TOTP), pelo
// MFA do Supabase. Sem app cadastrado, cadastra e mostra o código QR; com app, pede só o código. O código
// certo confirma a sessão (aal2), e quem chama relê o perfil, que então libera Negócio e Aprovações.
import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { confirmarComOApp, type ClienteDoApp } from './codigoDoApp.ts'
import { FALHA_DE_REDE } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

/** O código do app autenticador tem 6 dígitos. */
export const DIGITOS_DO_APP = 6

export const CODIGO_INCOMPLETO = `Digite os ${DIGITOS_DO_APP} dígitos do código.`
export const CODIGO_ERRADO = 'Código errado. Confira o app e tente de novo.'
export const MUITAS_TENTATIVAS = 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'
/** D-269 (CA-859): o servidor já não conhece o cadastro mostrado; a tela prepara outro. */
export const QR_MUDOU = 'O código QR mudou. Apague a entrada antiga do MetaNutri no app e leia este.'
const NAO_CONFIRMOU = 'Não consegui confirmar o código agora. Tente de novo.'
const NAO_PREPAROU = 'Não consegui preparar a verificação em duas etapas agora. Tente de novo.'

export type EtapaDoSegundoFator =
  | { readonly tipo: 'carregando' }
  | { readonly tipo: 'cadastrar'; readonly fatorId: string; readonly qr: string; readonly chave: string }
  | { readonly tipo: 'confirmar'; readonly fatorId: string }
  | { readonly tipo: 'falhou'; readonly mensagem: string }

export interface ValorSegundoFator {
  readonly etapa: EtapaDoSegundoFator
  /** Confirma o código digitado; devolve a mensagem de erro, ou nulo quando a sessão foi confirmada. */
  readonly confirmar: (codigo: string) => Promise<string | null>
  readonly tentarDeNovo: () => void
}

function mensagemDoErro(erro: AuthError, padrao: string): string {
  if (isAuthRetryableFetchError(erro)) return FALHA_DE_REDE
  if (erro.status === 429 || erro.code === 'over_request_rate_limit') return MUITAS_TENTATIVAS
  if (isAuthApiError(erro) && (erro.code === 'mfa_verification_failed' || erro.code === 'mfa_challenge_expired')) return CODIGO_ERRADO
  return padrao
}

/** Lê os fatores da conta e decide o passo: confirmar o código, ou cadastrar o app. */
async function prepararEtapa(cliente: ClienteDoApp): Promise<EtapaDoSegundoFator> {
  const lista = await cliente.auth.mfa.listFactors()
  if (lista.error) return { tipo: 'falhou', mensagem: mensagemDoErro(lista.error, NAO_PREPAROU) }
  const confirmado = lista.data.totp[0]
  if (confirmado) return { tipo: 'confirmar', fatorId: confirmado.id }
  // CB-260: o cadastro abandonado (não confirmado) sai antes de um novo.
  for (const fator of lista.data.all) {
    if (fator.factor_type === 'totp' && fator.status === 'unverified') await cliente.auth.mfa.unenroll({ factorId: fator.id })
  }
  // DP-L5-3: o nome que o app mostra é MetaNutri.
  const cadastro = await cliente.auth.mfa.enroll({ factorType: 'totp', issuer: 'MetaNutri' })
  if (cadastro.error) return { tipo: 'falhou', mensagem: mensagemDoErro(cadastro.error, NAO_PREPAROU) }
  return { tipo: 'cadastrar', fatorId: cadastro.data.id, qr: cadastro.data.totp.qr_code, chave: cadastro.data.totp.secret }
}

interface Carga {
  readonly versao: number
  /** De quem é este passo: o de outra conta nunca aparece (CB-269). */
  readonly usuario: string
  readonly etapa: EtapaDoSegundoFator
}

/**
 * `ativo`: o administrador está em Negócio ou Aprovações e falta o código. Fica no App, e não na tela, para o
 * código QR não mudar quando ele passa de uma tela para a outra no meio do cadastro (D-269).
 */
export function useSegundoFator(ativo: boolean, usuarioId: string | null, aoLiberado: () => void): ValorSegundoFator {
  const [cliente] = useState(() => obterSupabase())
  const [versao, setVersao] = useState(0)
  const [carga, setCarga] = useState<Carga | null>(null)
  // O passo já preparado desta conta, nesta versão: sair da tela e voltar não cadastra de novo (CA-859).
  const pronta = carga !== null && carga.versao === versao && carga.usuario === usuarioId

  useEffect(() => {
    if (!cliente || !ativo || usuarioId === null || pronta) return
    let vivo = true
    void prepararEtapa(cliente).then((etapa) => {
      if (vivo) setCarga({ versao, usuario: usuarioId, etapa })
    })
    return () => {
      vivo = false
    }
  }, [cliente, ativo, usuarioId, versao, pronta])

  // Uma leitura velha (de antes do "Tentar de novo") ou de outra conta não vale.
  const etapa: EtapaDoSegundoFator = pronta ? carga.etapa : { tipo: 'carregando' }
  const fatorId = etapa.tipo === 'cadastrar' || etapa.tipo === 'confirmar' ? etapa.fatorId : null

  const confirmar = useCallback(
    async (codigo: string): Promise<string | null> => {
      if (codigo.length !== DIGITOS_DO_APP) return CODIGO_INCOMPLETO
      const c = obterSupabase()
      if (!c || fatorId === null) return NAO_CONFIRMOU
      const erro = await confirmarComOApp(c, fatorId, codigo)
      if (erro?.code === 'mfa_factor_not_found') {
        // CA-859: outra aba ou outro aparelho começou outro cadastro; este já não existe.
        setVersao((v) => v + 1)
        return QR_MUDOU
      }
      if (erro) return mensagemDoErro(erro, NAO_CONFIRMOU)
      aoLiberado()
      return null
    },
    [fatorId, aoLiberado],
  )

  const tentarDeNovo = useCallback(() => setVersao((v) => v + 1), [])

  return { etapa, confirmar, tentarDeNovo }
}

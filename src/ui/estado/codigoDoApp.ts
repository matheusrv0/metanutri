// O código do app autenticador (spec seguranca-lote-5, D-260, D-268 e CB-269): achar o app confirmado da conta e
// confirmar a sessão com o código. Usado pelo passo do administrador (usarSegundoFator) e pela troca de senha
// (usarConta), que o servidor recusa com `insufficient_aal` quando a conta tem o app.
import type { AuthError } from '@supabase/supabase-js'
import type { obterSupabase } from './supabase.ts'

export type ClienteDoApp = NonNullable<ReturnType<typeof obterSupabase>>

/** O app confirmado da conta (o primeiro TOTP confirmado), ou nulo; o erro da leitura, quando houve. */
export async function appConfirmado(cliente: ClienteDoApp): Promise<{ readonly fatorId: string | null; readonly erro: AuthError | null }> {
  const lista = await cliente.auth.mfa.listFactors()
  if (lista.error) return { fatorId: null, erro: lista.error }
  return { fatorId: lista.data.totp[0]?.id ?? null, erro: null }
}

/**
 * Confirma a sessão com o código do app. O servidor recusa quando o endereço IP muda entre pedir e confirmar o
 * desafio (rede do celular trocando de antena, por exemplo): aí tenta mais uma vez, sozinho (CB-269).
 */
export async function confirmarComOApp(cliente: ClienteDoApp, fatorId: string, codigo: string): Promise<AuthError | null> {
  const primeira = await cliente.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo })
  if (primeira.error?.code !== 'mfa_ip_address_mismatch') return primeira.error
  return (await cliente.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo })).error
}

// A ligação das funções de e-mail ao ambiente (spec lado-do-paciente, seção 3.2 do PLAN): as variáveis da função, o
// banco de verdade e o Resend. Os index.ts só chamam isto; nada aqui decide regra.
//
// Variáveis lidas: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (as de sempre), `RESEND_API_KEY` (só de envio, presa ao
// subdomínio dos avisos, CA-2282), `ENDERECO_DO_APP` (padrão https://app.metanutri.com.br), `REMETENTE_DOS_AVISOS` (padrão
// avisos@avisos.metanutri.com.br) e os tetos `TETO_DIA`, `TETO_MES`, `TETO_AVISOS_DIA` e `TETO_AVISOS_MES` (CA-2274),
// lidos a cada chamada. `TURNSTILE_SECRET_KEY` e `RESEND_WEBHOOK_SECRET`, só nas funções que os usam.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import { criarBancoDosAvisos } from './bancoDosAvisosSupabase.ts'
import type { DependenciasComuns } from './comum.ts'
import { hashDoEmail } from './email.ts'
import type { Buscar } from './http.ts'
import { enviarEmLote } from './resend.ts'
import { lerTetos } from './tetos.ts'

export const APP_PADRAO = 'https://app.metanutri.com.br'
export const REMETENTE_PADRAO = 'avisos@avisos.metanutri.com.br'

export type LerVariavel = (nome: string) => string | undefined

const bytesAleatorios = (tamanho: number): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(tamanho))

/** O endereço do app, só https (ou http local) e sem caminho; senão o de produção. */
export function enderecoDoApp(valor: string | undefined): string {
  if (!valor) return APP_PADRAO
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? url.origin : APP_PADRAO
  } catch {
    return APP_PADRAO
  }
}

/** As dependências comuns de verdade. */
export function dependenciasDoAmbiente(ler: LerVariavel, cliente: SupabaseClient, buscar: Buscar, urlDoSupabase: string): DependenciasComuns {
  const endereco = ler('REMETENTE_DOS_AVISOS')?.trim() || REMETENTE_PADRAO
  return {
    banco: criarBancoDosAvisos(cliente, bytesAleatorios),
    enviar: (emails, idempotencia) =>
      enviarEmLote(emails, idempotencia, {
        buscar,
        chave: ler('RESEND_API_KEY')?.trim() || null,
        endereco,
        esperar: (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
      }),
    agora: () => new Date(),
    // Só mensagens fixas e números: nunca e-mail, nome, token ou corpo de pedido.
    log: (...partes) => console.error(...partes),
    ambiente: { app: enderecoDoApp(ler('ENDERECO_DO_APP')), funcoes: `${urlDoSupabase.replace(/\/+$/, '')}/functions/v1` },
    tetos: () => lerTetos(ler),
    hash: hashDoEmail,
    aleatorio: bytesAleatorios,
  }
}

/** O endereço de internet de quem pede: o que a Cloudflare ou o proxy do Supabase dizem. */
export function ipDoPedido(cabecalhos: { get(nome: string): string | null }): string | null {
  const direto = cabecalhos.get('cf-connecting-ip')?.trim()
  if (direto) return direto
  const repassado = cabecalhos.get('x-forwarded-for')?.split(',')[0]?.trim()
  return repassado || null
}

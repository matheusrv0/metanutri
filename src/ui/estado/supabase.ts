import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente do Supabase, ou `null` quando as chaves não foram configuradas.
 * Sem chaves o MetaNutri continua inteiro: só não existe conta na nuvem.
 *
 * Para ligar, crie um arquivo `.env.local` na raiz com:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 */
let cliente: SupabaseClient | null | undefined

export function supabaseConfigurado(): boolean {
  const url = import.meta.env['VITE_SUPABASE_URL']
  const chave = import.meta.env['VITE_SUPABASE_ANON_KEY']
  return typeof url === 'string' && url.startsWith('http') && typeof chave === 'string' && chave.length > 20
}

export function obterSupabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente
  if (!supabaseConfigurado()) {
    cliente = null
    return null
  }
  try {
    cliente = createClient(import.meta.env['VITE_SUPABASE_URL'] as string, import.meta.env['VITE_SUPABASE_ANON_KEY'] as string, {
      // PKCE (spec seguranca-lote-5, D-267): os e-mails só trazem código, e um endereço com a sessão dentro
      // (#access_token=...), montado por outra pessoa, não abre o site já dentro da conta dela.
      auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' },
    })
  } catch {
    cliente = null
  }
  return cliente
}

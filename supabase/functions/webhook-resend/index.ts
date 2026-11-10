// Os eventos do Resend: entregue, devolvido e queixa (spec lado-do-paciente, D-1236, D-1239). A decisão mora em
// ../_shared/avisos/webhookResend.ts, que o Vitest executa; aqui só se liga o ambiente. Deno / Supabase Edge Functions.
//
// Publicada com --no-verify-jwt: quem chama é o Resend. A assinatura do Svix (`svix-id`, `svix-timestamp`,
// `svix-signature`) é conferida com o segredo `RESEND_WEBHOOK_SECRET` antes de qualquer coisa: sem ela, 401 e nada muda.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { criarBancoDosAvisos } from '../_shared/avisos/bancoDosAvisosSupabase.ts'
import { receberEventoDoResend } from '../_shared/avisos/webhookResend.ts'

/** Um evento do Resend tem poucos KB; acima disto, recusa sem ler. */
const LIMITE = 65_536

const responder = (corpo: Readonly<Record<string, unknown>>, status: number): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)
  try {
    if (Number(req.headers.get('content-length') ?? '0') > LIMITE) return responder({ erro: 'O evento é grande demais.' }, 413)
    const corpo = await req.text()
    if (corpo.length > LIMITE) return responder({ erro: 'O evento é grande demais.' }, 413)
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)
    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const resposta = await receberEventoDoResend(
      { metodo: req.method, corpo, id: req.headers.get('svix-id'), momento: req.headers.get('svix-timestamp'), assinaturas: req.headers.get('svix-signature') },
      {
        banco: criarBancoDosAvisos(cliente, (tamanho) => globalThis.crypto.getRandomValues(new Uint8Array(tamanho))),
        agora: () => new Date(),
        log: (...partes) => console.error(...partes),
        segredo: Deno.env.get('RESEND_WEBHOOK_SECRET')?.trim() || null,
      },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // O Resend repete o evento que não recebeu 2xx.
    console.error('Falha inesperada no webhook do Resend:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: 'Falha inesperada.' }, 500)
  }
})

// Recebe os avisos da operadora de pagamento (spec cobranca-em-producao, D-83 e D-84). A decisão mora
// em ../_shared/webhook.ts, que o Vitest executa; aqui só se liga o ambiente. Publicada com
// --no-verify-jwt: quem chama é a operadora, que não tem conta no Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { criarBanco } from '../_shared/bancoSupabase.ts'
import { criarOperadora } from '../_shared/operadora.ts'
import { tratarAviso } from '../_shared/webhook.ts'

/** A operadora espera a resposta por 22 s. Com até quatro pedidos a ela por aviso, 4 s cada cabe. */
const PRAZO_DO_AVISO_MS = 4_000

Deno.serve(async (req: Request) => {
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    // Sem configuração não dá para ler nem anotar. O 500 faz a operadora mandar de novo depois.
    console.error('Função sem configuração; o aviso volta depois.')
    return new Response('sem configuração', { status: 500 })
  }
  const url = new URL(req.url)
  const lido: unknown = await req.json().catch(() => null)
  const status = await tratarAviso(
    {
      corpo: lido,
      idNaUrl: url.searchParams.get('data.id'),
      tipoNaUrl: url.searchParams.get('type'),
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
    },
    {
      operadora: criarOperadora(token, { prazoMs: PRAZO_DO_AVISO_MS, prazoDoPostMs: PRAZO_DO_AVISO_MS }),
      banco: criarBanco(createClient(urlSupabase, servico), console.error),
      // Como está no ambiente: o núcleo apara e, sem segredo, responde 500 sem processar nada (R1).
      segredo: Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? null,
      agora: () => new Date(),
      log: console.error,
    },
  )
  return new Response(status === 200 ? 'ok' : 'tente de novo', { status })
})

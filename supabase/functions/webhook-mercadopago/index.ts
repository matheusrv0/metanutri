// Recebe os avisos da operadora de pagamento (spec cobranca-em-producao, D-83 e D-84). A decisão mora
// em ../_shared/webhook.ts, que o Vitest executa; aqui só se liga o ambiente. Publicada com
// --no-verify-jwt: quem chama é a operadora, que não tem conta no Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { criarBanco } from '../_shared/bancoSupabase.ts'
import { lerCorpo } from '../_shared/corpo.ts'
import { criarOperadora } from '../_shared/operadora.ts'
import { tratarAviso } from '../_shared/webhook.ts'

/**
 * A operadora espera a resposta por 22 s. Um aviso faz até cinco pedidos a ela (a mensalidade recusada
 * sem linha: ler a mensalidade, ler a assinatura, cancelar com as duas palavras e conferir). Com 3,5 s
 * cada, são 17,5 s no pior caso, e sobra tempo para o banco e para a função acordar.
 */
const PRAZO_DO_AVISO_MS = 3_500

Deno.serve(async (req: Request) => {
  // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada, nem o registro de avisos.
  const lido = await lerCorpo(req)
  if (lido.grande) return new Response('grande demais', { status: 413 })
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    // Sem configuração não dá para ler nem anotar. O 500 faz a operadora mandar de novo depois.
    console.error('Função sem configuração; o aviso volta depois.')
    return new Response('sem configuração', { status: 500 })
  }
  const url = new URL(req.url)
  const status = await tratarAviso(
    {
      corpo: lido.json,
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

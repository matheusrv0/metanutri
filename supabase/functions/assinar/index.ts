// Assina com o cartão, dentro do site (spec checkout-proprio; spec cobranca-em-producao). A decisão
// mora em ../_shared/assinar.ts, que o Vitest executa; aqui só se liga o ambiente.
//
// Roda no servidor porque precisa do access token da operadora, que dá poder de cobrar em nome do dono.
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { assinar } from '../_shared/assinar.ts'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { CABECALHOS, responder, SEM_COBRANCA } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)

  try {
    // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada.
    const lido = await lerCorpo(req)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const site = (Deno.env.get('SITE_URL') ?? 'https://metanutri.com.br/').replace(/[?#].*$/, '')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await assinar(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
        site,
      },
      {
        // O POST espera o banco conferir o cartão, bem antes de a reserva vencer (5 minutos) e do limite da função.
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 30_000 }),
        banco: criarBanco(cliente, console.error),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com os cabeçalhos do site.
    console.error('Falha inesperada ao assinar:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: SEM_COBRANCA }, 500)
  }
})

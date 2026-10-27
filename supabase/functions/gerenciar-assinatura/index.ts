// Responde a prévia do cancelamento (D-81), cancela e troca o cartão, sem sair do site (spec
// checkout-proprio; spec cobranca-em-producao). A decisão mora em ../_shared/gerenciarAssinatura.ts,
// que o Vitest executa; aqui só se liga o ambiente.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { FORA, gerenciarAssinatura } from '../_shared/gerenciarAssinatura.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  // D-521 (spec separacao-site-app): a permissão do navegador vai só para um endereço da lista, o mesmo do pedido.
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)

  try {
    // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada.
    const lido = await lerCorpo(req)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500, origem)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await gerenciarAssinatura(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
      },
      {
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }),
        banco: criarBanco(cliente, console.error),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com a permissão do endereço que pediu.
    console.error('Falha inesperada ao mudar a assinatura:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: FORA }, 500, origem)
  }
})

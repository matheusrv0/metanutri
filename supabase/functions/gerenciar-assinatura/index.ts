// Responde a prévia do cancelamento (D-81), cancela e troca o cartão, sem sair do site (spec
// checkout-proprio; spec cobranca-em-producao). A decisão mora em ../_shared/gerenciarAssinatura.ts,
// que o Vitest executa; aqui só se liga o ambiente.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { CABECALHOS, responder } from '../_shared/cobranca.ts'
import { FORA, gerenciarAssinatura } from '../_shared/gerenciarAssinatura.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)

  try {
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

    const cliente = createClient(urlSupabase, servico)
    const lido: unknown = await req.json().catch(() => null)
    const resposta = await gerenciarAssinatura(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido,
      },
      {
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }),
        banco: criarBanco(cliente, console.error),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com os cabeçalhos do site.
    console.error('Falha inesperada ao mudar a assinatura:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: FORA }, 500)
  }
})

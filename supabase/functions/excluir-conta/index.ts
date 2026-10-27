// Exclui a conta de quem pede, com a senha conferida há pouco (spec exclusao-de-conta, D-251 a D-256). A decisão e a
// ordem dos passos moram em ../_shared/excluirConta.ts, que o Vitest executa; aqui só se liga o ambiente.
// Publicada com verify_jwt (o padrão): só chega aqui pedido com um token de sessão assinado pelo servidor de login.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { criarBanco } from '../_shared/bancoSupabase.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { EXCLUSAO_FALHOU, excluirConta } from '../_shared/excluirConta.ts'
import { criarPortaDaExclusao, quemPedeAExclusao } from '../_shared/exclusaoSupabase.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  // D-521 (spec separacao-site-app): a permissão do navegador vai só para um endereço da lista, o mesmo do pedido.
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)

  try {
    // CA-823: acima de 64 KB, recusa sem ler o resto e sem fazer nada.
    const lido = await lerCorpo(req)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500, origem)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await excluirConta(
      {
        quem: await quemPedeAExclusao(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
      },
      {
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }),
        banco: criarBanco(cliente, console.error),
        exclusao: criarPortaDaExclusao(cliente),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com a permissão do endereço que pediu.
    console.error('Falha inesperada ao excluir a conta:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: EXCLUSAO_FALHOU }, 500, origem)
  }
})

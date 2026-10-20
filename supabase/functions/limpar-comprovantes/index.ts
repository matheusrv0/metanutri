// Apaga os comprovantes de matrícula vencidos (spec seguranca-lote-5, D-263 e D-264). A decisão mora em
// ../_shared/limpeza.ts, que o Vitest executa; aqui só se liga o ambiente. Deno / Supabase Edge Functions.
//
// Quem chama é o agendamento diário do banco (014: pg_cron + pg_net), com a chave do cofre no cabeçalho
// x-chave-da-limpeza. Publicada com --no-verify-jwt: o banco não tem login de usuário; a chave é conferida no
// banco antes de qualquer coisa. O corpo do pedido não é lido.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { CABECALHO_DA_CHAVE, limparComprovantes } from '../_shared/limpeza.ts'
import { criarBancoDaLimpeza } from '../_shared/limpezaSupabase.ts'

const responder = (corpo: Readonly<Record<string, unknown>>, status: number): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  try {
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const resposta = await limparComprovantes(
      { metodo: req.method, chave: req.headers.get(CABECALHO_DA_CHAVE) },
      { banco: criarBancoDaLimpeza(cliente), agora: () => new Date(), log: console.log },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha do banco: o registro leva só a mensagem; a próxima rodada tenta de novo.
    console.error('Falha inesperada na limpeza:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: 'Falha inesperada na limpeza.' }, 500)
  }
})

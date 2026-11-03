// A rodada dos avisos (spec lado-do-paciente, D-1236, DP-LP-10): o resumo da adesão (N1), o plano atualizado (A1), o
// resumo da semana (A2) e os lembretes (A3, A4). A decisão mora em ../_shared/avisos/rodada.ts, que o Vitest executa;
// aqui só se liga o ambiente. Deno / Supabase Edge Functions.
//
// Quem chama é o agendamento do banco (supabase/017: pg_cron + pg_net), com a chave do cofre no cabeçalho
// x-chave-dos-avisos e `{"vez": "n1" | "manha" | "tarde" | "a1"}`. Publicada com --no-verify-jwt: o banco não tem login;
// a chave é conferida no banco antes de qualquer coisa (CA-2270).
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { dependenciasDoAmbiente } from '../_shared/avisos/ambiente.ts'
import { CABECALHO_DA_CHAVE, rodarAvisos } from '../_shared/avisos/rodada.ts'
import { lerCorpo } from '../_shared/corpo.ts'

const responder = (corpo: Readonly<Record<string, unknown>>, status: number): Response =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  try {
    const ler = (nome: string) => Deno.env.get(nome)
    const urlSupabase = ler('SUPABASE_URL')
    const servico = ler('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)
    const lido = await lerCorpo(req, 1024)
    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const resposta = await rodarAvisos(
      { metodo: req.method, chave: req.headers.get(CABECALHO_DA_CHAVE), corpo: lido.grande ? null : lido.json },
      dependenciasDoAmbiente(ler, cliente, (url, pedido) => fetch(url, pedido), urlSupabase),
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha do banco: o registro leva só a mensagem; a próxima rodada tenta de novo.
    console.error('Falha inesperada na rodada dos avisos:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: 'Falha inesperada na rodada dos avisos.' }, 500)
  }
})

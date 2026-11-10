// O que a nutricionista manda pelo servidor (spec lado-do-paciente, D-1215, D-1224, D-1227, D-1230): o S2, o convite,
// o S4 e o A1 agendado. A decisão mora em ../_shared/avisos/enviarLink.ts, que o Vitest executa; aqui só se liga o
// ambiente. Deno / Supabase Edge Functions.
//
// Publicada com verify_jwt (o padrão): só chega aqui pedido com um token de sessão assinado pelo servidor de login, e o
// link tem de ser da conta que pede.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { dependenciasDoAmbiente } from '../_shared/avisos/ambiente.ts'
import { quemPedeOEnvio } from '../_shared/avisos/bancoDosAvisosSupabase.ts'
import { NAO_ENVIOU } from '../_shared/avisos/comum.ts'
import { enviarLink } from '../_shared/avisos/enviarLink.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'

Deno.serve(async (req: Request) => {
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)
  try {
    const lido = await lerCorpo(req, 4096)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
    const ler = (nome: string) => Deno.env.get(nome)
    const urlSupabase = ler('SUPABASE_URL')
    const servico = ler('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: NAO_ENVIOU }, 500, origem)
    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const resposta = await enviarLink(
      { metodo: req.method, conta: await quemPedeOEnvio(cliente, req.headers.get('Authorization')), corpo: lido.json },
      dependenciasDoAmbiente(ler, cliente, (url, pedido) => fetch(url, pedido), urlSupabase),
    )
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    console.error('Falha inesperada em enviar-link:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: NAO_ENVIOU }, 502, origem)
  }
})

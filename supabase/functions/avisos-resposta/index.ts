// As páginas do aceite e do descadastro, e o descadastro de um clique (spec lado-do-paciente, D-1226, D-1235). A decisão
// mora em ../_shared/avisos/avisosResposta.ts, que o Vitest executa; aqui só se liga o ambiente. Deno / Supabase Edge
// Functions.
//
// Publicada com --no-verify-jwt: o paciente não tem conta; a chave do e-mail é a autorização. Dois jeitos de chegar:
//   - a página `app.metanutri.com.br/avisos/<chave>`, por POST com JSON (`{ acao, chave, avisos? }`), com CORS só para o app;
//   - o "Cancelar inscrição" do Gmail e do Apple Mail (RFC 8058): `POST ?c=<chave>` com `List-Unsubscribe=One-Click`.
// GET nunca muda nada (D-89).
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { dependenciasDoAmbiente } from '../_shared/avisos/ambiente.ts'
import { responderAosAvisos } from '../_shared/avisos/avisosResposta.ts'
import { NAO_ENVIOU } from '../_shared/avisos/comum.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'

/** O corpo do formulário de um clique é curto: `List-Unsubscribe=One-Click`. */
const LIMITE_DO_FORMULARIO = 1024

Deno.serve(async (req: Request) => {
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)
  try {
    const ler = (nome: string) => Deno.env.get(nome)
    const urlSupabase = ler('SUPABASE_URL')
    const servico = ler('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: NAO_ENVIOU }, 500, origem)

    const chaveDaUrl = new URL(req.url).searchParams.get('c')
    const formulario = (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/x-www-form-urlencoded')
    let corpo: unknown = null
    let umClique = false
    if (formulario) {
      const declarado = Number(req.headers.get('content-length') ?? '0')
      if (declarado > LIMITE_DO_FORMULARIO) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
      const texto = (await req.text()).slice(0, LIMITE_DO_FORMULARIO)
      umClique = new URLSearchParams(texto).get('List-Unsubscribe') === 'One-Click'
    } else {
      const lido = await lerCorpo(req, 4096)
      if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
      corpo = lido.json
    }

    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const resposta = await responderAosAvisos({ metodo: req.method, chaveDaUrl, corpo, umClique }, dependenciasDoAmbiente(ler, cliente, (url, pedido) => fetch(url, pedido), urlSupabase))
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    console.error('Falha inesperada em avisos-resposta:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' }, 502, origem)
  }
})

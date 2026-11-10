// O paciente pede o link e os avisos sem conta (spec lado-do-paciente, D-1220, D-1221, D-1226): "Recuperar meu link",
// "Receber meu link por e-mail" e ligar um aviso. A decisão mora em ../_shared/avisos/meuLink.ts, que o Vitest executa;
// aqui só se liga o ambiente. Deno / Supabase Edge Functions.
//
// Publicada com --no-verify-jwt: o paciente não tem conta. A recuperação confere a verificação contra robôs (Turnstile,
// `TURNSTILE_SECRET_KEY`); o resto vale pelo token do link, como a tela do paciente.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { dependenciasDoAmbiente, ipDoPedido } from '../_shared/avisos/ambiente.ts'
import { NAO_ENVIOU } from '../_shared/avisos/comum.ts'
import { temServidorDeEmail } from '../_shared/avisos/dns.ts'
import { meuLink } from '../_shared/avisos/meuLink.ts'
import { turnstileConfere } from '../_shared/avisos/turnstile.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'

/** O recurso de tarefa em segundo plano das Edge Functions (D-1249): o trabalho da recuperação que passa da resposta. */
const edge = (globalThis as { readonly EdgeRuntime?: { readonly waitUntil?: (trabalho: Promise<unknown>) => void } }).EdgeRuntime

Deno.serve(async (req: Request) => {
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)
  try {
    const lido = await lerCorpo(req, 16_384)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413, origem)
    const ler = (nome: string) => Deno.env.get(nome)
    const urlSupabase = ler('SUPABASE_URL')
    const servico = ler('SUPABASE_SERVICE_ROLE_KEY')
    if (!urlSupabase || !servico) return responder({ erro: NAO_ENVIOU }, 500, origem)
    const cliente = createClient(urlSupabase, servico, { auth: { persistSession: false, autoRefreshToken: false } })
    const buscar = (url: string, pedido: RequestInit) => fetch(url, pedido)
    const comuns = dependenciasDoAmbiente(ler, cliente, buscar, urlSupabase)
    const resposta = await meuLink(
      { metodo: req.method, corpo: lido.json, ip: ipDoPedido(req.headers) },
      {
        ...comuns,
        turnstile: (token, ip) => turnstileConfere({ buscar, segredo: ler('TURNSTILE_SECRET_KEY')?.trim() || null, token, ip }),
        temServidorDeEmail: (dominio) => temServidorDeEmail(dominio, buscar),
        ...(edge?.waitUntil ? { emSegundoPlano: (trabalho: Promise<unknown>) => edge.waitUntil?.(trabalho) } : {}),
      },
    )
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    console.error('Falha inesperada em meu-link:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: NAO_ENVIOU }, 502, origem)
  }
})

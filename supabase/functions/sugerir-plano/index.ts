// Sugere e adequa o plano alimentar com IA (spec assistente-ia). A decisão mora em ../_shared/ia.ts, que o Vitest executa;
// aqui só se liga o ambiente. Publicada com verify_jwt (o padrão): só chega aqui pedido com um token de sessão.
//
// Roda no servidor porque precisa da chave da Anthropic (segredo ANTHROPIC_API_KEY), que o navegador nunca vê (D-1324).
// Segredos opcionais: IA_MODELO, IA_ESFORCO, IA_TETO_DIARIO_USD e IA_MODO (só "falso", e só com o Supabase local).
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { quemPede } from '../_shared/bancoSupabase.ts'
import { cabecalhosPara, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { IA_INDISPONIVEL, sugerirPlano, tetoDoAmbiente } from '../_shared/ia.ts'
import { criarModeloAnthropic, esforcoDoAmbiente, modeloDoAmbiente, PRAZO_DA_IA_MS } from '../_shared/iaAnthropic.ts'
import { criarModeloFalso, modoFalso } from '../_shared/iaFalsa.ts'
import { criarBancoDaIa } from '../_shared/iaSupabase.ts'

Deno.serve(async (req: Request) => {
  // D-521 (spec separacao-site-app): a permissão do navegador vai só para um endereço da lista, o mesmo do pedido.
  const origem = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)

  try {
    // CA-2301: acima de 64 KB, recusa sem ler o resto, sem consultar o banco e sem chamar a IA.
    const lido = await lerCorpo(req)
    if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS, codigo: 'grande' }, 413, origem)
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const chave = Deno.env.get('ANTHROPIC_API_KEY')
    // CA-2321: o modo falso só vale com o Supabase local; em produção, é ignorado e anotado.
    const falso = modoFalso(Deno.env.get('IA_MODO'), urlSupabase ?? '')
    if (falso.ignorado) console.error('IA_MODO=falso ignorado: o Supabase desta função não é o local.')
    if (!urlSupabase || !servico || (!chave && !falso.ligado)) return responder({ erro: 'A função não está configurada no servidor.' }, 500, origem)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await sugerirPlano(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
        // D-1330: o navegador foi embora (fechou a gaveta, cancelou, caiu), a chamada à IA para.
        sinal: req.signal,
      },
      {
        banco: criarBancoDaIa(cliente, console.error),
        // Sem o modo falso, a chave existe (conferida acima).
        modelo: falso.ligado ? criarModeloFalso() : criarModeloAnthropic(chave ?? '', { prazoMs: PRAZO_DA_IA_MS }),
        modeloId: modeloDoAmbiente(Deno.env.get('IA_MODELO')),
        esforco: esforcoDoAmbiente(Deno.env.get('IA_ESFORCO')),
        tetoDiarioUsd: tetoDoAmbiente(Deno.env.get('IA_TETO_DIARIO_USD')),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status, origem)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com a permissão do endereço que pediu.
    console.error('Falha inesperada ao sugerir o plano:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: IA_INDISPONIVEL, codigo: 'indisponivel' }, 500, origem)
  }
})

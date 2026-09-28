// Cria a assinatura no Mercado Pago e devolve o link de pagamento.
//
// Isto roda no servidor porque precisa do access token do Mercado Pago, que dá
// poder de cobrar em nome do dono da conta. Se ele fosse para o navegador,
// qualquer pessoa que abrisse o site conseguiria emitir cobrança.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP = 'https://api.mercadopago.com/preapproval'

/** Os planos que podem ser assinados, com o preço que o servidor considera verdade. */
const PLANOS: Record<string, { readonly nome: string; readonly mensal: number; readonly anual: number }> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}

const cabecalhos = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
}

const erro = (mensagem: string, status: number) => new Response(JSON.stringify({ erro: mensagem }), { status, headers: cabecalhos })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhos })
  if (req.method !== 'POST') return erro('Use POST.', 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const site = Deno.env.get('SITE_URL') ?? 'https://matheusrv0.github.io/metanutri/'
  if (!token || !urlSupabase || !servico) return erro('A função não está configurada no servidor.', 500)

  // Quem está pedindo? O token do usuário vem no cabeçalho; sem ele, ninguém assina.
  const autorizacao = req.headers.get('Authorization') ?? ''
  const cliente = createClient(urlSupabase, servico)
  const { data: usuario, error: erroUsuario } = await cliente.auth.getUser(autorizacao.replace('Bearer ', ''))
  if (erroUsuario || !usuario.user?.email) return erro('Entre na sua conta antes de assinar.', 401)

  let corpo: { plano?: string; ciclo?: string }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const escolhido = PLANOS[corpo.plano ?? '']
  if (!escolhido) return erro('Plano desconhecido.', 400)
  const anual = corpo.ciclo === 'anual'
  const valor = anual ? escolhido.anual : escolhido.mensal

  // Quem já paga não assina de novo por aqui: nasceria uma segunda cobrança (spec CA-163).
  const { data: atual, error: erroAtual } = await cliente.from('assinaturas').select('status, plano').eq('nutricionista_id', usuario.user.id).maybeSingle()
  if (erroAtual) {
    console.error('Não consegui conferir a assinatura atual:', erroAtual)
    return erro('Não consegui conferir sua assinatura agora. Tente de novo em alguns minutos.', 502)
  }
  if (atual?.status === 'ativa' && (atual.plano === 'solo' || atual.plano === 'pro')) {
    return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)
  }

  // A volta vai sem `#`: o Mercado Pago pode descartar o que vem depois dele (spec R-11).
  const volta = `${site.replace(/[?#].*$/, '')}?volta=pagamento`

  const resposta = await fetch(MP, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: `${escolhido.nome} (${anual ? 'anual' : 'mensal'})`,
      external_reference: usuario.user.id,
      payer_email: usuario.user.email,
      back_url: volta,
      status: 'pending',
      auto_recurring: {
        frequency: anual ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: valor,
        currency_id: 'BRL',
      },
    }),
  })

  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok || !dados?.init_point) {
    console.error('Mercado Pago recusou:', resposta.status, dados)
    return erro('O Mercado Pago não aceitou a assinatura agora. Tente de novo em alguns minutos.', 502)
  }

  const vagas = await cliente.rpc('vagas_de_fundador_usadas')
  const travado = typeof vagas.data === 'number' && vagas.data < 200

  await cliente.from('assinaturas').upsert(
    {
      nutricionista_id: usuario.user.id,
      plano: corpo.plano,
      status: 'pendente',
      preapproval_id: dados.id,
      valor_centavos: Math.round(valor * 100),
      // Assinatura paga não vence por data; quem vence é o Estudante.
      expira_em: null,
      preco_travado: travado,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'nutricionista_id' },
  )

  return new Response(JSON.stringify({ pagamento: dados.init_point }), { headers: cabecalhos })
})

// Assina com o cartão, dentro do site (spec checkout-proprio, D-65 a D-68).
//
// O navegador manda só o plano, o ciclo e o código de uso único do cartão, mais a
// bandeira e os 4 últimos números para mostrar em Conta e plano (D-70). O número do
// cartão nunca passa por aqui: os campos seguros mandam direto para o Mercado Pago, que
// devolve o código. O preço sai da tabela abaixo, nunca do navegador (CA-375).
//
// Isto roda no servidor porque precisa do access token do Mercado Pago, que dá poder de
// cobrar em nome do dono da conta.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CABECALHOS,
  codigoDaRecusa,
  dataDepoisDe,
  lerCartao,
  previsaoDaProximaCobranca,
  RECUSA_PADRAO,
  responder,
  SEM_COBRANCA,
  traduzirStatus,
  UM_DIA_MS,
} from '../_shared/cobranca.ts'

const MP = 'https://api.mercadopago.com/preapproval'

/** Os planos que podem ser assinados, com o preço que o servidor considera verdade. */
const PLANOS: Record<string, { readonly nome: string; readonly mensal: number; readonly anual: number }> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}

const erro = (mensagem: string, status: number, codigo?: string) => responder(codigo ? { erro: mensagem, codigo } : { erro: mensagem }, status)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Use POST.', 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const site = (Deno.env.get('SITE_URL') ?? 'https://metanutri.com.br/').replace(/[?#].*$/, '')
  if (!token || !urlSupabase || !servico) return erro('A função não está configurada no servidor.', 500)

  // Quem está pedindo? O token do usuário vem no cabeçalho; sem ele, ninguém assina.
  const autorizacao = req.headers.get('Authorization') ?? ''
  const cliente = createClient(urlSupabase, servico)
  const { data: usuario, error: erroUsuario } = await cliente.auth.getUser(autorizacao.replace('Bearer ', ''))
  if (erroUsuario || !usuario.user?.email) return erro('Entre na sua conta antes de assinar.', 401)

  let corpo: { plano?: unknown; ciclo?: unknown; card_token_id?: unknown; cartao?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const plano = typeof corpo.plano === 'string' ? corpo.plano : ''
  // Só as chaves da própria tabela: "constructor" ou "toString" subiriam pelo protótipo.
  const escolhido = Object.hasOwn(PLANOS, plano) ? PLANOS[plano] : undefined
  if (!escolhido) return erro('Plano desconhecido.', 400)
  const anual = corpo.ciclo === 'anual'
  const valor = anual ? escolhido.anual : escolhido.mensal

  const cartaoToken = typeof corpo.card_token_id === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(corpo.card_token_id) ? corpo.card_token_id : null
  const cartao = lerCartao(corpo.cartao)
  if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

  // Duas abas (ou recarregar no meio) mandando juntas passariam as duas pela conferência abaixo e
  // criariam duas assinaturas cobrando. A reserva é uma linha por conta em assinando_agora (008): a
  // chave primária deixa um pedido só passar. A de uma função que morreu no meio vence em 5 minutos.
  const uid = usuario.user.id
  const { error: erroVencida } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', uid).lt('desde', new Date(Date.now() - 5 * 60_000).toISOString())
  if (erroVencida) console.error('Não consegui apagar a reserva vencida:', erroVencida.message)
  const { error: erroReserva } = await cliente.from('assinando_agora').insert({ nutricionista_id: uid })
  if (erroReserva) {
    if (erroReserva.code === '23505') return erro('Já estamos confirmando uma assinatura desta conta. Confira em Conta e plano em um minuto.', 409)
    console.error('Não consegui reservar a assinatura:', erroReserva.message)
    return erro(SEM_COBRANCA, 502)
  }

  try {
    // Quem já paga não assina de novo por aqui: nasceria uma segunda cobrança (CB-91, CA-163).
    // A cancelada, mesmo dentro do prazo, pode assinar de novo (CA-380). Lida depois da reserva:
    // o pedido que chega logo depois de outro já vê a assinatura que ele gravou.
    const { data: atual, error: erroAtual } = await cliente.from('assinaturas').select('status, plano, preapproval_id, cartao_final').eq('nutricionista_id', uid).maybeSingle()
    if (erroAtual) {
      console.error('Não consegui conferir a assinatura atual:', erroAtual.message)
      return erro('Não consegui conferir sua assinatura agora. Tente de novo em alguns minutos.', 502)
    }
    if (atual?.status === 'ativa' && (atual.plano === 'solo' || atual.plano === 'pro' || atual.plano === 'clinica')) {
      return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)
    }
    // Pendente ou pausada do fluxo do cartão (tem preapproval_id e cartao_final) também existe na operadora:
    // assinar de novo criaria uma segunda e deixaria a primeira cobrando sem ninguém ver.
    if (atual && (atual.status === 'pendente' || atual.status === 'pausada') && atual.preapproval_id && atual.cartao_final !== null) {
      return erro('Você já tem uma assinatura em andamento. Confira em Conta e plano.', 409)
    }

    const agora = new Date()
    const cabecalhosMp = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    let resposta: Response
    try {
      resposta = await fetch(MP, {
        method: 'POST',
        headers: cabecalhosMp,
        // Bem antes de a reserva vencer (5 minutos) e do limite da função.
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          reason: `${escolhido.nome} (${anual ? 'anual' : 'mensal'})`,
          external_reference: uid,
          payer_email: usuario.user.email,
          card_token_id: cartaoToken,
          // Criada já autorizada: o banco confere o cartão agora e a primeira cobrança cai em até uma hora (D-68).
          status: 'authorized',
          back_url: site,
          auto_recurring: {
            frequency: anual ? 12 : 1,
            frequency_type: 'months',
            transaction_amount: valor,
            currency_id: 'BRL',
          },
        }),
      })
    } catch (falha) {
      console.error('Sem resposta do Mercado Pago ao assinar:', falha instanceof Error ? falha.message : 'erro de rede')
      return erro(SEM_COBRANCA, 502)
    }

    const dados: Record<string, unknown> | null = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      const codigo = codigoDaRecusa(dados)
      const motivo = typeof dados?.['message'] === 'string' ? String(dados['message']).slice(0, 200) : ''
      console.error('Mercado Pago recusou a assinatura:', resposta.status, codigo, motivo)
      // 401/403: a credencial do servidor, não o cartão da pessoa; é falha nossa, nunca recusa (402).
      if (resposta.status === 401 || resposta.status === 403) return erro(SEM_COBRANCA, 502)
      if (resposta.status >= 500) return erro(SEM_COBRANCA, 502)
      return erro(RECUSA_PADRAO, 402, codigo)
    }

    const id = typeof dados?.['id'] === 'string' ? dados['id'] : null
    if (!id) {
      console.error('Mercado Pago respondeu sem o id da assinatura:', resposta.status)
      return erro(SEM_COBRANCA, 502)
    }
    const status = traduzirStatus(dados?.['status'])
    // A data de hoje é a primeira cobrança, ainda por cair: a próxima é a do ciclo seguinte.
    const proxima = dataDepoisDe(dados?.['next_payment_date'], agora.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(agora, anual ? 'anual' : 'mensal')

    const { error: erroGravar } = await cliente.from('assinaturas').upsert(
      {
        nutricionista_id: uid,
        plano,
        status,
        preapproval_id: id,
        valor_centavos: Math.round(valor * 100),
        ciclo: anual ? 'anual' : 'mensal',
        // Assinatura paga não vence por data; quem vence é o Estudante e a cancelada (CA-378).
        expira_em: null,
        cartao_bandeira: cartao.bandeira,
        cartao_final: cartao.final,
        proxima_cobranca: proxima,
        atualizado_em: agora.toISOString(),
      },
      { onConflict: 'nutricionista_id' },
    )

    if (erroGravar) {
      // A assinatura existe lá, mas não aqui: cancela lá para ninguém pagar sem ter o plano.
      console.error('Assinatura criada e não gravada; cancelando no Mercado Pago:', id, erroGravar.message)
      const pedido = { method: 'PUT', headers: cabecalhosMp }
      let cancelou = await fetch(`${MP}/${id}`, { ...pedido, body: JSON.stringify({ status: 'cancelled' }) }).catch(() => null)
      // A documentação em português escreve "canceled": se a operadora rejeitar uma grafia, tenta a outra.
      if (cancelou && cancelou.status >= 400 && cancelou.status < 500) {
        cancelou = await fetch(`${MP}/${id}`, { ...pedido, body: JSON.stringify({ status: 'canceled' }) }).catch(() => null)
      }
      if (!cancelou?.ok) console.error('CANCELAMENTO FALHOU: assinatura ficou ativa na operadora sem plano aqui; cancelar à mão:', id, cancelou?.status ?? 'sem resposta')
      return erro(SEM_COBRANCA, 502)
    }

    return responder({ status, proximaCobranca: proxima, cartao })
  } finally {
    // Só depois de gravar: o próximo pedido já encontra a assinatura e leva o 409.
    const { error: erroSoltar } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', uid)
    if (erroSoltar) console.error('Não consegui soltar a reserva da assinatura (ela vence em 5 minutos):', erroSoltar.message)
  }
})

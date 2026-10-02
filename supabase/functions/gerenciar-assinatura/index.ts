// Cancela a assinatura ou troca o cartão, sem sair do site (spec checkout-proprio, D-69,
// CA-377 a CA-379).
//
// Cancelada, ela para de cobrar no Mercado Pago, e o plano pago vale até o fim do período
// já pago (expira_em); depois o app volta sozinho para o Free (src/domain/assinatura.ts).
// Pedir para cancelar uma assinatura já cancelada não chama o Mercado Pago de novo (CB-93).
// Trocar o cartão manda o código de uso único do cartão novo; se o banco recusar, o
// cartão antigo continua (CA-379). Um pedido por vez é cuidado pela tela.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CABECALHOS, codigoDaRecusa, dataDepoisDe, fimDoPeriodoPago, lerCartao, responder, traduzirStatus } from '../_shared/cobranca.ts'

const MP = 'https://api.mercadopago.com/preapproval'
/** A operadora não respondeu: nada mudou lá nem aqui. */
const FORA = 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.'
const RECUSA_DO_CARTAO_NOVO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
const PAGOS = ['solo', 'pro', 'clinica']

const erro = (mensagem: string, status: number, codigo?: string) => responder(codigo ? { erro: mensagem, codigo } : { erro: mensagem }, status)

interface RespostaDaOperadora {
  readonly ok: boolean
  readonly status: number
  readonly dados: Record<string, unknown> | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Use POST.', 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) return erro('A função não está configurada no servidor.', 500)

  // Quem está pedindo? O token do usuário vem no cabeçalho, como na assinar.
  const autorizacao = req.headers.get('Authorization') ?? ''
  const cliente = createClient(urlSupabase, servico)
  const { data: usuario, error: erroUsuario } = await cliente.auth.getUser(autorizacao.replace('Bearer ', ''))
  if (erroUsuario || !usuario.user) return erro('Entre na sua conta antes de mudar a assinatura.', 401)
  const dono = usuario.user.id

  let corpo: { acao?: unknown; card_token_id?: unknown; cartao?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  const { data: linha, error: erroLinha } = await cliente
    .from('assinaturas')
    .select('plano, status, preapproval_id, proxima_cobranca, expira_em')
    .eq('nutricionista_id', dono)
    .maybeSingle()
  if (erroLinha) {
    console.error('Não consegui ler a assinatura:', erroLinha.message)
    return erro(FORA, 502)
  }
  if (!linha || !PAGOS.includes(linha.plano) || typeof linha.preapproval_id !== 'string') return erro('Esta conta não tem assinatura paga.', 409)
  const id: string = linha.preapproval_id

  const operadora = async (metodo: 'GET' | 'PUT', envio?: Record<string, unknown>): Promise<RespostaDaOperadora | null> => {
    try {
      const resposta = await fetch(`${MP}/${id}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(envio ? { body: JSON.stringify(envio) } : {}),
      })
      return { ok: resposta.ok, status: resposta.status, dados: await resposta.json().catch(() => null) }
    } catch {
      return null
    }
  }

  if (corpo.acao === 'cancelar') {
    // CB-93: a resposta do cancelamento se perdeu e a pessoa pediu de novo; nada a fazer lá.
    if (linha.status === 'cancelada') return responder({ status: 'cancelada', expiraEm: linha.expira_em ?? null })

    const lida = await operadora('GET')
    if (!lida?.ok) {
      console.error('Não consegui ler a assinatura na operadora:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }

    if (traduzirStatus(lida.dados?.['status']) !== 'cancelada') {
      let feito = await operadora('PUT', { status: 'cancelled' })
      // A documentação em português escreve "canceled"; se a API recusar uma grafia, tenta a outra.
      if (feito && !feito.ok && feito.status < 500) feito = await operadora('PUT', { status: 'canceled' })
      if (!feito?.ok) {
        console.error('A operadora não cancelou:', feito?.status ?? 'sem resposta', codigoDaRecusa(feito?.dados), id)
        return erro(FORA, 502)
      }
    }

    // O fim do período pago sai da próxima cobrança: a da operadora, se vier, senão a gravada aqui.
    const agora = Date.now()
    const proxima = dataDepoisDe(lida.dados?.['next_payment_date'], agora) ?? dataDepoisDe(linha.proxima_cobranca, agora)
    // Sem data de cobrança à frente, não há período pago a respeitar: volta ao Free na hora (CB-94).
    const expiraEm = proxima ? fimDoPeriodoPago(proxima) : null
    const { error: erroGravar } = await cliente.from('assinaturas').update({ status: 'cancelada', expira_em: expiraEm, atualizado_em: new Date(agora).toISOString() }).eq('nutricionista_id', dono).eq('preapproval_id', id)
    if (erroGravar) {
      // Pedir de novo resolve: lá já está cancelada, e esta função só grava aqui.
      console.error('Cancelada na operadora, mas não gravada aqui:', id, erroGravar.message)
      return erro('A assinatura foi cancelada, mas não consegui mostrar aqui. Abra Conta e plano de novo em alguns minutos.', 502)
    }
    return responder({ status: 'cancelada', expiraEm })
  }

  if (corpo.acao === 'trocar_cartao') {
    if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)
    const cartaoToken = typeof corpo.card_token_id === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(corpo.card_token_id) ? corpo.card_token_id : null
    const cartao = lerCartao(corpo.cartao)
    if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

    const feito = await operadora('PUT', { card_token_id: cartaoToken })
    if (!feito || feito.status >= 500) {
      console.error('A operadora não respondeu à troca de cartão:', feito?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    // 401 ou 403: a nossa credencial é que está errada, não o cartão da pessoa. Não vira recusa.
    if (feito.status === 401 || feito.status === 403) {
      console.error('A operadora não aceitou a nossa credencial na troca de cartão:', feito.status, id)
      return erro(FORA, 502)
    }
    if (!feito.ok) {
      const codigo = codigoDaRecusa(feito.dados)
      console.error('A operadora recusou o cartão novo:', feito.status, codigo, id)
      return erro(RECUSA_DO_CARTAO_NOVO, 402, codigo)
    }

    const { error: erroGravar } = await cliente.from('assinaturas').update({ cartao_bandeira: cartao.bandeira, cartao_final: cartao.final, atualizado_em: new Date().toISOString() }).eq('nutricionista_id', dono).eq('preapproval_id', id)
    // O cartão já foi trocado lá: se a gravação falhar, só a tela mostra o antigo até a próxima troca.
    if (erroGravar) console.error('Cartão trocado na operadora, mas não gravado aqui:', id, erroGravar.message)
    return responder({ cartao })
  }

  return erro('Ação desconhecida.', 400)
})

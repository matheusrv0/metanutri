// Recebe as notificações do Mercado Pago e atualiza a assinatura.
//
// Duas coisas que esta função não pode fazer, e por isso estão explícitas aqui:
//   1. Confiar no corpo da notificação. Qualquer um na internet consegue mandar um
//      POST dizendo "fulano pagou". Por isso a assinatura do cabeçalho é conferida,
//      e o estado real é buscado na API do Mercado Pago, não lido do corpo.
//   2. Devolver erro por bobagem. Se responder != 200, o Mercado Pago reenvia; o
//      que não entendemos é ignorado com 200 para não virar fila infinita.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ok = () => new Response('ok', { status: 200 })

/** Estado do Mercado Pago → o que o MetaNutri entende. */
function traduzirStatus(status: string): 'ativa' | 'pausada' | 'cancelada' | 'pendente' {
  if (status === 'authorized') return 'ativa'
  if (status === 'paused') return 'pausada'
  if (status === 'cancelled') return 'cancelada'
  return 'pendente'
}

/** Confere a assinatura do cabeçalho (x-signature) conforme o manifesto do Mercado Pago. */
async function assinaturaConfere(req: Request, id: string, segredo: string): Promise<boolean> {
  const cabecalho = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''

  const partes = Object.fromEntries(
    cabecalho
      .split(',')
      .map((p) => p.split('=').map((x) => x.trim()))
      .filter((p): p is [string, string] => p.length === 2),
  )
  const ts = partes['ts']
  const hash = partes['v1']
  if (!ts || !hash) return false

  const manifesto = `id:${id};request-id:${requestId};ts:${ts};`
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto))
  const esperado = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

  return esperado === hash
}

Deno.serve(async (req: Request) => {
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const segredo = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    console.error('Função sem configuração; notificação descartada.')
    return ok()
  }

  let corpo: { type?: string; action?: string; data?: { id?: string } }
  try {
    corpo = await req.json()
  } catch {
    return ok()
  }

  const tipo = corpo.type ?? corpo.action ?? ''
  const id = corpo.data?.id
  if (!id || !tipo.includes('preapproval')) return ok()

  if (segredo && !(await assinaturaConfere(req, id, segredo))) {
    console.error('Assinatura do webhook não confere; notificação descartada.')
    return ok()
  }

  // O estado verdadeiro vem da API, nunca do corpo da notificação.
  const resposta = await fetch(`https://api.mercadopago.com/preapproval/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!resposta.ok) {
    console.error('Não consegui ler a assinatura no Mercado Pago:', resposta.status)
    return ok()
  }

  const assinatura = await resposta.json()
  const dono = assinatura.external_reference
  if (typeof dono !== 'string' || !dono) return ok()

  const cliente = createClient(urlSupabase, servico)
  const status = traduzirStatus(String(assinatura.status ?? ''))

  // Só o status muda; o plano escolhido ao assinar continua na linha. O app só libera
  // plano pago com status ativa (D-27), e o "Tentar de novo" reabre esse plano (CA-169).
  // Gravar Free aqui fazia um aviso de "pendente" antes da autorização deixar quem
  // pagou no Free para sempre: a autorização mudava só o status.
  const mudanca = { status, atualizado_em: new Date().toISOString() }

  // Só a linha desta assinatura: a notificação de um checkout abandonado (ou de uma
  // assinatura antiga) não pode mexer no plano Estudante aprovado depois (CB-63).
  const { data: linhas, error } = await cliente.from('assinaturas').update(mudanca).eq('nutricionista_id', dono).eq('preapproval_id', id).select('nutricionista_id')
  if (error) {
    console.error('Não consegui atualizar a assinatura:', error)
  } else if (status === 'ativa' && (!linhas || linhas.length === 0)) {
    // Risco aceito: link de checkout antigo pago depois de outra mudança (ex.: Estudante aprovado).
    // A cobrança existe no Mercado Pago, mas nenhuma linha mudou: fica o rastro para conferir.
    console.error('Pagamento ativo sem assinatura com este preapproval_id; conferir à mão:', id, dono)
  }

  return ok()
})

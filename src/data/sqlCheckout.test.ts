import assinar from '../../supabase/functions/assinar/index.ts?raw'
import gerenciar from '../../supabase/functions/gerenciar-assinatura/index.ts?raw'
import webhook from '../../supabase/functions/webhook-mercadopago/index.ts?raw'

/** As linhas que escrevem no registro da função. */
const registros = (codigo: string) => codigo.split('\n').filter((linha) => linha.includes('console.'))

import sql from '../../supabase/008-cartao-da-assinatura.sql?raw'

describe('banco: o cartão da assinatura (spec checkout-proprio, 008)', () => {
  it('D-70: guarda só a bandeira, os 4 últimos números e a próxima cobrança', () => {
    expect(sql).toContain('alter table public.assinaturas add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);')
    expect(sql).toContain("alter table public.assinaturas add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');")
    expect(sql).toContain('alter table public.assinaturas add column if not exists proxima_cobranca timestamptz;')
  })

  it('D-70: nenhuma política nem permissão nova: quem escreve continua sendo só o servidor', () => {
    expect(sql).not.toMatch(/create policy|grant /i)
  })
})

describe('função assinar (spec checkout-proprio)', () => {
  it('CA-375: o preço sai da tabela do servidor; o navegador manda só plano, ciclo e o cartão', () => {
    expect(assinar).toContain('const valor = anual ? escolhido.anual : escolhido.mensal')
    expect(assinar).toContain('transaction_amount: valor,')
    expect(assinar).not.toMatch(/corpo\.(valor|preco|transaction_amount|valor_centavos)/)
  })

  it('D-68: cria a assinatura já autorizada, com o código de uso único do cartão', () => {
    expect(assinar).toContain("status: 'authorized',")
    expect(assinar).toContain('card_token_id: cartaoToken,')
    expect(assinar).not.toContain('init_point')
  })

  it('D-70: grava a bandeira, os 4 últimos números e a próxima cobrança, e devolve só isso ao navegador', () => {
    expect(assinar).toContain('cartao_bandeira: cartao.bandeira,')
    expect(assinar).toContain('cartao_final: cartao.final,')
    expect(assinar).toContain('proxima_cobranca: proxima,')
    expect(assinar).toContain('return responder({ status, proximaCobranca: proxima, cartao })')
  })

  it('CB-95: a assinatura paga não vence por data, então substitui o Estudante na hora em que o banco autoriza', () => {
    expect(assinar).toContain('expira_em: null,')
    expect(assinar).toContain("onConflict: 'nutricionista_id'")
  })

  it('CA-373: recusa vira 402 com o código; operadora fora vira 502', () => {
    expect(assinar).toContain('return erro(RECUSA_PADRAO, 402, codigo)')
    expect(assinar).toContain('if (resposta.status >= 500) return erro(SEM_COBRANCA, 502)')
  })

  it('CB-91: quem já tem assinatura paga ativa não assina de novo', () => {
    expect(assinar).toContain("return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)")
  })

  it('assinatura criada lá e não gravada aqui é cancelada lá na hora', () => {
    expect(assinar).toMatch(/if \(erroGravar\) \{[\s\S]*?body: JSON\.stringify\(\{ status: 'cancelled' \}\)[\s\S]*?return erro\(SEM_COBRANCA, 502\)/)
  })

  it('o cancelamento de compensação é conferido: tenta "canceled" se "cancelled" for rejeitado e grita se falhar', () => {
    expect(assinar).toContain('CANCELAMENTO FALHOU')
    expect(assinar).toContain("body: JSON.stringify({ status: 'canceled' })")
    expect(assinar).toContain('if (!cancelou?.ok) console.error(')
    expect(assinar).not.toMatch(/\.catch\(\(\) => undefined\)/)
  })

  it('não assina em dobro: pendente ou pausada do fluxo do cartão também dá 409', () => {
    expect(assinar).toContain("select('status, plano, preapproval_id, cartao_final')")
    expect(assinar).toMatch(/\(atual\.status === 'pendente' \|\| atual\.status === 'pausada'\) && atual\.preapproval_id && atual\.cartao_final !== null/)
    expect(assinar).toContain("return erro('Você já tem uma assinatura em andamento. Confira em Conta e plano.', 409)")
  })

  it('credencial do servidor recusada (401/403) é falha de cobrança, nunca recusa do cartão', () => {
    expect(assinar).toContain('if (resposta.status === 401 || resposta.status === 403) return erro(SEM_COBRANCA, 502)')
  })

  it('nenhum registro leva o código do cartão nem o corpo do pedido', () => {
    for (const linha of registros(assinar)) expect(linha).not.toMatch(/cartaoToken|card_token_id|corpo/)
  })
})

describe('webhook (spec checkout-proprio)', () => {
  it('D-70: grava a próxima cobrança só da ativa, e nunca mexe no expira_em (CA-378, CB-94)', () => {
    expect(webhook).toContain("const proxima = status === 'ativa' ? dataDepoisDe(assinatura.next_payment_date, Date.now() + UM_DIA_MS) : null")
    expect(webhook).toContain('if (proxima) Object.assign(mudanca, { proxima_cobranca: proxima })')
    expect(webhook).not.toMatch(/expira_em\s*:/)
  })

  it('traduz o estado pelo módulo comum, que aceita "cancelled" e "canceled"', () => {
    expect(webhook).toContain("from '../_shared/cobranca.ts'")
    expect(webhook).not.toContain('function traduzirStatus')
  })
})

describe('função gerenciar-assinatura (spec checkout-proprio)', () => {
  it('exige a sessão de quem pede e só mexe em assinatura paga', () => {
    expect(gerenciar).toContain("return erro('Entre na sua conta antes de mudar a assinatura.', 401)")
    expect(gerenciar).toContain("return erro('Esta conta não tem assinatura paga.', 409)")
  })

  it('CB-93: assinatura já cancelada aqui não chama a operadora de novo', () => {
    expect(gerenciar).toContain("if (linha.status === 'cancelada') return responder({ status: 'cancelada', expiraEm: linha.expira_em ?? null })")
  })

  it('CB-93: só cancela lá o que ainda não está cancelado lá', () => {
    expect(gerenciar).toContain("if (traduzirStatus(lida.dados?.['status']) !== 'cancelada') {")
  })

  it('CA-378: cancela lá com "cancelled" e, se a operadora recusar a palavra, com "canceled"', () => {
    expect(gerenciar).toContain("let feito = await operadora('PUT', { status: 'cancelled' })")
    expect(gerenciar).toContain("if (feito && !feito.ok && feito.status < 500) feito = await operadora('PUT', { status: 'canceled' })")
  })

  it('CA-378 e CB-94: grava cancelada com o fim do período pago; sem data de cobrança à frente, Free na hora', () => {
    expect(gerenciar).toContain("const proxima = dataDepoisDe(lida.dados?.['next_payment_date'], agora) ?? dataDepoisDe(linha.proxima_cobranca, agora)")
    expect(gerenciar).toContain('const expiraEm = proxima ? fimDoPeriodoPago(proxima) : null')
    expect(gerenciar).toContain("update({ status: 'cancelada', expira_em: expiraEm, atualizado_em: new Date(agora).toISOString() })")
  })

  it('CA-379: troca o cartão lá antes de gravar a bandeira e o final aqui; recusa vira 402 e o cartão antigo fica', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    const naOperadora = troca.indexOf("operadora('PUT', { card_token_id: cartaoToken })")
    expect(naOperadora).toBeGreaterThan(-1)
    expect(naOperadora).toBeLessThan(troca.indexOf('cartao_bandeira: cartao.bandeira'))
    expect(troca).toContain('return erro(RECUSA_DO_CARTAO_NOVO, 402, codigo)')
  })

  it('CA-379: 401 ou 403 da operadora é a nossa credencial, não o cartão: vira 502, nunca 402', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    const credencial = troca.indexOf('if (feito.status === 401 || feito.status === 403) {')
    expect(credencial).toBeGreaterThan(-1)
    expect(credencial).toBeLessThan(troca.indexOf('return erro(RECUSA_DO_CARTAO_NOVO, 402, codigo)'))
    expect(troca.slice(credencial, credencial + 300)).toContain('return erro(FORA, 502)')
  })

  it('só mexe na linha da mesma assinatura da operadora', () => {
    expect(gerenciar.match(/\.eq\('nutricionista_id', dono\)\.eq\('preapproval_id', id\)/g)).toHaveLength(2)
  })

  it('nenhum registro leva o código do cartão nem o corpo do pedido', () => {
    for (const linha of registros(gerenciar)) expect(linha).not.toMatch(/cartaoToken|card_token_id|corpo/)
  })
})

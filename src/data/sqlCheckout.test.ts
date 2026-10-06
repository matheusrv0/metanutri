import publicar from '../../.github/workflows/publicar.yml?raw'
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

  it('C1: a trava contra dois pedidos ao mesmo tempo é uma linha por conta, que só o servidor vê', () => {
    expect(sql).toContain('create table if not exists public.assinando_agora (')
    expect(sql).toContain('nutricionista_id uuid primary key references auth.users (id) on delete cascade,')
    expect(sql).toContain('desde timestamptz not null default now()')
    expect(sql).toContain('alter table public.assinando_agora enable row level security;')
    expect(sql).toContain('revoke all on public.assinando_agora from anon, authenticated;')
    expect(sql).not.toMatch(/revoke[^;]*service_role/i)
  })

  it('C1: a conferência depois de rodar também mostra a trava', () => {
    expect(sql).toMatch(/^-- select .*'public\.assinando_agora'/m)
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

  it('CA-388: não existe preço de fundador: a função não conta vagas nem grava preço travado', () => {
    expect(assinar).not.toContain('vagas_de_fundador_usadas')
    expect(assinar).not.toContain('preco_travado')
    expect(assinar).not.toMatch(/fundador/i)
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

  describe('C1: dois pedidos ao mesmo tempo (duas abas) não criam duas assinaturas', () => {
    const reservar = assinar.indexOf(".from('assinando_agora').insert({ nutricionista_id: uid })")
    const lerAtual = assinar.indexOf(".from('assinaturas').select('status, plano, preapproval_id, cartao_final')")
    const postar = assinar.indexOf('await fetch(MP, {')
    const tentar = assinar.indexOf('try {', reservar)
    const soltar = assinar.indexOf('} finally {', reservar)

    it('a reserva vem depois de validar o corpo e antes de ler a assinatura e de chamar a operadora', () => {
      expect(reservar).toBeGreaterThan(assinar.indexOf("return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)"))
      expect(reservar).toBeGreaterThan(-1)
      expect(lerAtual).toBeGreaterThan(reservar)
      expect(postar).toBeGreaterThan(reservar)
    })

    it('a reserva vencida (função que morreu no meio, mais de 5 minutos) sai antes de reservar', () => {
      const vencida = assinar.indexOf(".from('assinando_agora').delete().eq('nutricionista_id', uid).lt('desde',")
      expect(vencida).toBeGreaterThan(-1)
      expect(vencida).toBeLessThan(reservar)
      expect(assinar).toContain('5 * 60_000')
    })

    it('outro pedido já reservado (23505) leva 409; outra falha ao reservar, 502', () => {
      const depois = assinar.slice(reservar, tentar)
      expect(depois).toContain("if (erroReserva.code === '23505') return erro('Já estamos confirmando uma assinatura desta conta. Confira em Conta e plano em um minuto.', 409)")
      expect(depois).toContain('return erro(SEM_COBRANCA, 502)')
    })

    it('o try começa logo depois da reserva e cobre a leitura, os 409, o POST, a gravação e a compensação; o finally solta a reserva', () => {
      expect(tentar).toBeGreaterThan(reservar)
      expect(tentar).toBeLessThan(lerAtual)
      expect(soltar).toBeGreaterThan(assinar.indexOf('CANCELAMENTO FALHOU'))
      expect(soltar).toBeGreaterThan(assinar.indexOf("onConflict: 'nutricionista_id'"))
      expect(assinar.slice(soltar, soltar + 300)).toContain(".from('assinando_agora').delete().eq('nutricionista_id', uid)")
    })

    it('a assinar usa o cliente com a chave de serviço, que passa pela trava sem política', () => {
      expect(assinar).toContain('const cliente = createClient(urlSupabase, servico)')
    })
  })

  it('C1: assinatura ativa do Clínica também bloqueia assinar de novo', () => {
    expect(assinar).toContain("atual?.status === 'ativa' && (atual.plano === 'solo' || atual.plano === 'pro' || atual.plano === 'clinica')")
  })

  it('C1: o POST da operadora tem prazo de 30 s, bem antes de a reserva vencer', () => {
    const post = assinar.slice(assinar.indexOf('await fetch(MP, {'), assinar.indexOf('body: JSON.stringify({', assinar.indexOf('await fetch(MP, {')))
    expect(post).toContain('signal: AbortSignal.timeout(30_000),')
  })

  it('o plano só vale se for chave da própria tabela: "constructor" ou "toString" não sobem pelo protótipo', () => {
    expect(assinar).toContain('const escolhido = Object.hasOwn(PLANOS, plano) ? PLANOS[plano] : undefined')
    expect(assinar).not.toMatch(/const escolhido = PLANOS\[plano\]\s*$/m)
    expect(assinar).toContain("if (!escolhido) return erro('Plano desconhecido.', 400)")
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
    expect(gerenciar).toContain("const jaCanceladaLa = traduzirStatus(lida.dados?.['status']) === 'cancelada'")
    expect(gerenciar).toContain('if (!jaCanceladaLa) {')
  })

  it('CA-378: cancela lá com "cancelled" e, se a operadora recusar a palavra, com "canceled"', () => {
    expect(gerenciar).toContain("let feito = await operadora('PUT', { status: 'cancelled' })")
    expect(gerenciar).toContain("if (feito && !feito.ok && feito.status < 500) feito = await operadora('PUT', { status: 'canceled' })")
  })

  it('CA-378 e CB-94: grava cancelada com o fim do período pago; sem data de cobrança à frente, Free na hora', () => {
    expect(gerenciar).toContain("dataDepoisDe(lida.dados?.['next_payment_date'], limite) ?? dataDepoisDe(linha.proxima_cobranca, limite)")
    expect(gerenciar).toContain('const expiraEm = proxima ? fimDoPeriodoPago(proxima) : null')
    expect(gerenciar).toContain("update({ status: 'cancelada', expira_em: expiraEm, atualizado_em: new Date(agora).toISOString() })")
  })

  it('CA-379: troca o cartão lá antes de gravar a bandeira e o final aqui; recusa vira 402 e o cartão antigo fica', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    const naOperadora = troca.indexOf("operadora('PUT', { card_token_id: cartaoToken })")
    expect(naOperadora).toBeGreaterThan(-1)
    expect(naOperadora).toBeLessThan(troca.indexOf('cartao_bandeira: cartao.bandeira'))
    expect(troca).toContain('return erro(RECUSA_PADRAO, 402, codigo)')
  })

  it('CA-379: 401 ou 403 da operadora é a nossa credencial, não o cartão: vira 502, nunca 402', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    const credencial = troca.indexOf('if (feito.status === 401 || feito.status === 403) {')
    expect(credencial).toBeGreaterThan(-1)
    expect(credencial).toBeLessThan(troca.indexOf('return erro(RECUSA_PADRAO, 402, codigo)'))
    expect(troca.slice(credencial, credencial + 300)).toContain('return erro(FORA, 502)')
  })

  it('só quem estava ativa ganha período pago ao cancelar; pendente e pausada voltam ao Free na hora', () => {
    expect(gerenciar).toContain("const proxima = linha.status !== 'ativa' ? null :")
  })

  it('a próxima cobrança só conta se passar de amanhã, como na assinar e no webhook', () => {
    expect(gerenciar).toContain('const limite = agora + UM_DIA_MS')
    expect(gerenciar).toContain('UM_DIA_MS')
  })

  it('se a operadora já dizia cancelada, o fim do período vem só da cobrança gravada aqui', () => {
    expect(gerenciar).toContain("jaCanceladaLa ? dataDepoisDe(linha.proxima_cobranca, limite) :")
  })

  it('CB-93: a operadora tem prazo, e o cancelamento perdido é conferido com outra leitura antes do 502', () => {
    expect(gerenciar).toContain('signal: AbortSignal.timeout(10_000)')
    const cancelar = gerenciar.split("if (corpo.acao === 'cancelar') {")[1]?.split("if (corpo.acao === 'trocar_cartao') {")[0] ?? ''
    const put = cancelar.indexOf("if (!feito?.ok) {")
    const conferencia = cancelar.indexOf("const conferida = await operadora('GET')")
    const fora = cancelar.indexOf("console.error('A operadora não cancelou:'")
    expect(put).toBeGreaterThan(-1)
    expect(conferencia).toBeGreaterThan(put)
    expect(fora).toBeGreaterThan(conferencia)
    expect(cancelar).toContain("traduzirStatus(conferida?.dados?.['status']) !== 'cancelada'")
    expect(cancelar.slice(fora, fora + 300)).toContain('return erro(FORA, 502)')
  })

  it('CB-93: a gravação que falha é tentada de novo antes do 502', () => {
    expect(gerenciar).toContain('if (erroGravar) ({ error: erroGravar } = await gravar())')
    expect(gerenciar).toContain("console.error('Cancelada na operadora, mas não gravada aqui:'")
  })

  it('cancelar: sem leitura da operadora não há cancelamento, só 502', () => {
    const cancelar = gerenciar.split("if (corpo.acao === 'cancelar') {")[1] ?? ''
    const guarda = cancelar.indexOf('if (!lida?.ok) {')
    expect(guarda).toBeGreaterThan(-1)
    expect(guarda).toBeLessThan(cancelar.indexOf("operadora('PUT'"))
    expect(cancelar.slice(guarda, guarda + 250)).toContain('return erro(FORA, 502)')
  })

  it('trocar cartão: só assinatura ativa (409) e operadora fora (>= 500) vira 502', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    expect(troca).toContain("if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)")
    const cinco = troca.indexOf('if (!feito || feito.status >= 500) {')
    expect(cinco).toBeGreaterThan(-1)
    expect(troca.slice(cinco, cinco + 250)).toContain('return erro(FORA, 502)')
  })

  it('corpo que não é objeto é pedido inválido, não erro do servidor', () => {
    expect(gerenciar).toContain("if (typeof lido !== 'object' || lido === null || Array.isArray(lido)) return erro('Corpo da requisição inválido.', 400)")
  })

  it('só mexe na linha da mesma assinatura da operadora', () => {
    expect(gerenciar.match(/\.eq\('nutricionista_id', dono\)\.eq\('preapproval_id', id\)/g)).toHaveLength(2)
  })

  it('nenhum registro leva o código do cartão nem o corpo do pedido', () => {
    for (const linha of registros(gerenciar)) expect(linha).not.toMatch(/cartaoToken|card_token_id|corpo/)
  })
})

describe('o site publicado (D-72)', () => {
  it('a chave pública do pagamento vem de uma variável do GitHub', () => {
    expect(publicar).toContain('VITE_MERCADOPAGO_PUBLIC_KEY: ${{ vars.VITE_MERCADOPAGO_PUBLIC_KEY }}')
  })
})

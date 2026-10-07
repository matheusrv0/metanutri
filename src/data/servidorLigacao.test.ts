// @vitest-environment node
// As três funções viram ligação fina (spec cobranca-em-producao, D-88): os index.ts e o banco de
// verdade rodam no Deno e o Vitest não os executa. Aqui se confere o texto deles; a decisão é testada
// nos núcleos (servidorAssinar, servidorGerenciar, servidorWebhook e servidorOperadora).
import assinarIndex from '../../supabase/functions/assinar/index.ts?raw'
import gerenciarIndex from '../../supabase/functions/gerenciar-assinatura/index.ts?raw'
import webhookIndex from '../../supabase/functions/webhook-mercadopago/index.ts?raw'
import bancoSupabase from '../../supabase/functions/_shared/bancoSupabase.ts?raw'
import nucleoAssinar from '../../supabase/functions/_shared/assinar.ts?raw'
import cobranca from '../../supabase/functions/_shared/cobranca.ts?raw'
import corpoDoPedido from '../../supabase/functions/_shared/corpo.ts?raw'
import nucleoGerenciar from '../../supabase/functions/_shared/gerenciarAssinatura.ts?raw'
import operadora from '../../supabase/functions/_shared/operadora.ts?raw'
import portas from '../../supabase/functions/_shared/portas.ts?raw'
import tentativas from '../../supabase/functions/_shared/tentativas.ts?raw'
import chamadas from '../../supabase/functions/_shared/chamadas.ts?raw'
import nucleoWebhook from '../../supabase/functions/_shared/webhook.ts?raw'

const INDICES = { assinar: assinarIndex, 'gerenciar-assinatura': gerenciarIndex, 'webhook-mercadopago': webhookIndex }
const NUCLEOS = { assinar: nucleoAssinar, gerenciarAssinatura: nucleoGerenciar, webhook: nucleoWebhook, operadora, portas, cobranca, tentativas, corpo: corpoDoPedido, chamadas }
const registros = (codigo: string) => codigo.split('\n').filter((linha) => linha.includes('console.'))

describe('as funções são só ligação (D-88)', () => {
  it.each(Object.entries(INDICES))('%s: cliente com a chave de serviço, banco de verdade, e nenhuma decisão', (_, codigo) => {
    expect(codigo).toContain('createClient(urlSupabase, servico)')
    expect(codigo).toContain("from '../_shared/bancoSupabase.ts'")
    expect(codigo).not.toMatch(/\.from\(|api\.mercadopago\.com|traduzirStatus|preapproval|PLANOS/)
  })

  it.each(Object.entries(NUCLEOS))('%s: sem Deno, sem esm.sh, sem console e sem relógio solto', (_, codigo) => {
    expect(codigo).not.toMatch(/Deno\.|esm\.sh|console\.|Date\.now\(\)|new Date\(\)/)
  })

  it('o supabase-js tem a versão fixa nas três funções e no banco: o comportamento foi conferido nela', () => {
    for (const codigo of [...Object.values(INDICES), bancoSupabase]) {
      expect(codigo.match(/https:\/\/esm\.sh\/[^'"]+/g)).toEqual(['https://esm.sh/@supabase/supabase-js@2.117.2'])
    }
  })

  it('prazos: criar a assinatura espera 30 s; gerenciar, 10 s; o aviso, 3,5 s por pedido (até cinco pedidos; a operadora espera a resposta por 22 s)', () => {
    expect(assinarIndex).toContain('prazoDoPostMs: 30_000')
    expect(gerenciarIndex).toContain('prazoMs: 10_000')
    expect(webhookIndex).toContain('const PRAZO_DO_AVISO_MS = 3_500')
    expect(webhookIndex).toContain('Um aviso faz até cinco pedidos a ela')
  })

  it.each([
    ['assinar', assinarIndex, 'ao assinar', 'SEM_COBRANCA'],
    ['gerenciar-assinatura', gerenciarIndex, 'ao mudar a assinatura', 'FORA'],
  ])('%s: falha inesperada responde 500 com os cabeçalhos do site e a frase de falha da função; o registro leva só a mensagem', (_, codigo, onde, frase) => {
    const tentar = codigo.indexOf('\n  try {\n')
    const pegar = codigo.indexOf('\n  } catch (erro) {\n')
    expect(tentar).toBeGreaterThan(codigo.indexOf("if (req.method !== 'POST')"))
    expect(tentar).toBeLessThan(codigo.indexOf("Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')"))
    expect(pegar).toBeGreaterThan(codigo.indexOf('return responder(resposta.corpo, resposta.status)'))
    const depois = codigo.slice(pegar)
    expect(depois).toContain(`console.error('Falha inesperada ${onde}:', erro instanceof Error ? erro.message : 'erro desconhecido')`)
    expect(depois).toContain(`return responder({ erro: ${frase} }, 500)`)
  })

  it('o aviso lê o data.id e o type da URL e os dois cabeçalhos da assinatura', () => {
    expect(webhookIndex).toContain("url.searchParams.get('data.id')")
    expect(webhookIndex).toContain("url.searchParams.get('type')")
    expect(webhookIndex).toContain("req.headers.get('x-signature')")
    expect(webhookIndex).toContain("req.headers.get('x-request-id')")
  })

  it('o aviso sem configuração responde 500, para a operadora mandar de novo depois', () => {
    expect(webhookIndex).toMatch(/if \(!token \|\| !urlSupabase \|\| !servico\) \{[\s\S]*?status: 500/)
  })

  it('R1: o segredo do aviso vai como está no ambiente; o núcleo apara e, sem ele, responde 500', () => {
    expect(webhookIndex).toContain("segredo: Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? null,")
  })

  it('nenhum registro das funções leva o corpo do pedido nem o código do cartão', () => {
    for (const codigo of Object.values(INDICES)) for (const linha of registros(codigo)) expect(linha).not.toMatch(/corpo|card_token|cartao/)
  })

  it('R6: nenhuma função lê o IP de quem pede', () => {
    for (const codigo of [...Object.values(INDICES), bancoSupabase]) expect(codigo).not.toMatch(/x-forwarded-for|\bip\b/i)
  })

  it.each(Object.entries(INDICES))('CA-451: %s lê o corpo com o teto de 64 KB antes de qualquer outra coisa, sem o req.json()', (_, codigo) => {
    const ler = codigo.indexOf('const lido = await lerCorpo(req)')
    expect(ler).toBeGreaterThan(-1)
    expect(codigo).toContain("from '../_shared/corpo.ts'")
    expect(codigo).not.toContain('req.json(')
    expect(ler).toBeLessThan(codigo.indexOf("Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')"))
    expect(ler).toBeLessThan(codigo.indexOf('createClient(urlSupabase, servico)'))
    expect(codigo).toContain('corpo: lido.json,')
  })

  it('CA-451: acima de 64 KB, assinar e gerenciar respondem 413 com os cabeçalhos do site; o aviso responde 413 sem anotar nada', () => {
    for (const codigo of [assinarIndex, gerenciarIndex]) expect(codigo).toContain('if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)')
    const grande = webhookIndex.indexOf("if (lido.grande) return new Response('grande demais', { status: 413 })")
    expect(grande).toBeGreaterThan(-1)
    expect(grande).toBeLessThan(webhookIndex.indexOf('await tratarAviso('))
  })

  it('CA-425: assinar e gerenciar respondem ao pré-voo do navegador só com os cabeçalhos do site', () => {
    for (const codigo of [assinarIndex, gerenciarIndex]) {
      expect(codigo).toContain("if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })")
      expect(codigo).toContain('return responder(resposta.corpo, resposta.status)')
    }
  })
})

describe('o banco de verdade (bancoSupabase.ts)', () => {
  it('só mexe na linha da conta com a mesma assinatura da operadora', () => {
    expect(bancoSupabase).toContain(".update(mudanca).eq('nutricionista_id', conta).eq('preapproval_id', preapprovalId)")
  })
  it('CB-95: a assinatura nova é gravada por cima da linha da conta', () => {
    expect(bancoSupabase).toContain("upsert(nova, { onConflict: 'nutricionista_id' })")
  })
  it('C1: a reserva vencida sai pela data, e a reserva guarda o cartão (CA-400)', () => {
    expect(bancoSupabase).toContain(".from('assinando_agora').delete().eq('nutricionista_id', conta).lt('desde', antesDe)")
    expect(bancoSupabase).toContain('insert({ nutricionista_id: conta, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })')
  })
  it('CA-398: os avisos velhos saem pela data de chegada', () => {
    expect(bancoSupabase).toContain(".from('avisos_da_operadora').delete().lt('recebido_em', data)")
  })
  it('o código vazio do erro (falha de rede) vira nulo; só o 23505 (reserva) e o 23503 e o 22P02 (conta que não existe, CB-111) decidem alguma coisa', () => {
    expect(bancoSupabase).toContain('codigo: erro.code || null')
  })
  it('CB-111: ler a conta e gravar a assinatura devolvem o erro do banco com o código do Postgres', () => {
    const lerDaConta = bancoSupabase.split('async lerDaConta(')[1]?.split('async lerDaOperadora(')[0] ?? ''
    expect(lerDaConta).toContain("eq('nutricionista_id', conta)")
    expect(lerDaConta).toContain('falha: falhaDe(error)')
    const gravar = bancoSupabase.split('async gravar(')[1]?.split('async mudar(')[0] ?? ''
    expect(gravar).toContain('return falhaDe(error)')
    expect(bancoSupabase).toContain('erro ? { mensagem: erro.message, codigo: erro.code || null } : null')
  })
  it('lê as colunas do 009', () => {
    for (const coluna of ['ultima_cobranca_paga', 'encerrada_por', 'encerrada_em', 'ciclo', 'cartao_final']) expect(bancoSupabase).toContain(coluna)
  })

  describe('as tentativas de cartão (D-101, R6 e R7)', () => {
    it('CA-433 e CA-434: só as recusas contam, em janelas estritas de 24 h (da conta) e de 1 h (do site inteiro)', () => {
      expect(bancoSupabase).toContain(".from('tentativas_de_cartao').select('id', { count: 'exact', head: true }).eq('recusada', true)")
      expect(bancoSupabase).toContain("recusas().eq('nutricionista_id', conta).gt('quando', desde24h)")
      expect(bancoSupabase).toContain("recusas().gt('quando', desde1h)")
      expect(bancoSupabase).toContain('new Date(agora.getTime() - UM_DIA_MS).toISOString()')
      expect(bancoSupabase).toContain('new Date(agora.getTime() - UMA_HORA_MS).toISOString()')
    })
    it('CA-435: as seguidas são as recusas da conta em 24 h depois do último sucesso dela', () => {
      expect(bancoSupabase).toContain(".eq('recusada', false).order('quando', { ascending: false }).limit(1).maybeSingle()")
      expect(bancoSupabase).toContain("ultimoSucesso ? daConta24h().gt('quando', ultimoSucesso) : daConta24h()")
    })
    it('R5: sem conseguir contar, rejeita (o portão responde 502 e não deixa passar)', () => {
      const contar = bancoSupabase.split('async contarRecusas(')[1]?.split('async anotarTentativa(')[0] ?? ''
      expect(contar).toContain('throw new Error(')
      expect(contar).not.toContain('catch')
    })
    it('a contagem que falha sem mensagem (HEAD não tem corpo) leva o status HTTP para o registro', () => {
      expect(bancoSupabase).toContain('consulta.error?.message || `HTTP ${consulta.status}`')
      expect(bancoSupabase).toContain('if (contagem.error) throw new Error(erroDa(contagem))')
      expect(bancoSupabase).toContain('if (sucesso.error) throw new Error(erroDa(sucesso))')
    })
    it('R4: anota a tentativa com a hora do banco; a falha só vai para o registro', () => {
      expect(bancoSupabase).toContain(".from('tentativas_de_cartao').insert({ nutricionista_id: conta, recusada })")
      const anotar = bancoSupabase.split('async anotarTentativa(')[1]?.split('async apagarTentativasAntesDe(')[0] ?? ''
      expect(anotar).toContain('catch')
      expect(anotar).not.toContain('throw')
    })
    it('R7: as tentativas antigas saem pela data, e a falha só vai para o registro', () => {
      expect(bancoSupabase).toContain(".from('tentativas_de_cartao').delete().lt('quando', data.toISOString())")
      const apagar = bancoSupabase.split('async apagarTentativasAntesDe(')[1] ?? ''
      expect(apagar).toContain('catch')
      expect(apagar.split('export async function quemPede')[0]).not.toContain('throw')
    })
  })

  describe('as chamadas à cobrança (D-108)', () => {
    it('CB-115: contar e anotar são um passo só, na função do banco (011)', () => {
      expect(bancoSupabase).toContain("cliente.rpc('anotar_chamada_da_cobranca', { p_conta: conta, p_tipo: tipo, p_limite: limite, p_desde: desde.toISOString() })")
    })
    it('CB-114: sem a resposta sim ou não do banco, rejeita (a função responde 502 e não chama a operadora)', () => {
      const anotar = bancoSupabase.split('async anotarChamada(')[1]?.split('async apagarChamadasAntesDe(')[0] ?? ''
      expect(anotar).toContain('if (error) throw new Error(')
      expect(anotar).toContain("if (typeof data !== 'boolean') throw new Error(")
      expect(anotar).not.toContain('catch')
    })
    it('as chamadas antigas saem pela data, e a falha só vai para o registro', () => {
      expect(bancoSupabase).toContain(".from('chamadas_da_cobranca').delete().lt('quando', data.toISOString())")
      const apagar = bancoSupabase.split('async apagarChamadasAntesDe(')[1]?.split('// As janelas são estritas')[0] ?? ''
      expect(apagar).toContain('catch')
      expect(apagar).not.toContain('throw')
    })
  })

  it('quem pede vem do token da sessão; sem token, ninguém', () => {
    expect(bancoSupabase).toContain('cliente.auth.getUser(jwt)')
    expect(bancoSupabase).toContain('if (!jwt) return null')
  })
})

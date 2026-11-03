// @vitest-environment node
// A função sugerir-plano é só ligação (spec assistente-ia, D-1316): o index.ts e o banco de verdade rodam no Deno e o
// Vitest não os executa. Aqui se confere o texto deles; a decisão é testada no núcleo (servidorIa.test.ts), na porta da
// Anthropic (servidorIaAnthropic.test.ts) e no banco (sqlAssistenteIa.test.ts e testes/seguranca/ia.test.ts).
import sql from '../../supabase/016-assistente-ia.sql?raw'
import nucleo from '../../supabase/functions/_shared/ia.ts?raw'
import custo from '../../supabase/functions/_shared/iaCusto.ts?raw'
import anthropic from '../../supabase/functions/_shared/iaAnthropic.ts?raw'
import catalogo from '../../supabase/functions/_shared/iaCatalogo.ts?raw'
import contrato from '../../supabase/functions/_shared/iaContrato.ts?raw'
import falsa from '../../supabase/functions/_shared/iaFalsa.ts?raw'
import portas from '../../supabase/functions/_shared/iaPortas.ts?raw'
import prompt from '../../supabase/functions/_shared/iaPrompt.ts?raw'
import bancoDaIa from '../../supabase/functions/_shared/iaSupabase.ts?raw'
import indice from '../../supabase/functions/sugerir-plano/index.ts?raw'
import { cabecalhosPara, responder } from '../../supabase/functions/_shared/cobranca.ts'
import { tetoDoAmbiente } from '../../supabase/functions/_shared/ia.ts'

const NUCLEOS = { ia: nucleo, iaCusto: custo, iaAnthropic: anthropic, iaCatalogo: catalogo, iaContrato: contrato, iaFalsa: falsa, iaPortas: portas, iaPrompt: prompt }

describe('D-1316: a função é só ligação', () => {
  it('o index.ts liga o cliente com a chave de serviço, o banco e o modelo, e não decide nada', () => {
    expect(indice).toContain('createClient(urlSupabase, servico)')
    expect(indice).toContain("from '../_shared/iaSupabase.ts'")
    expect(indice).toContain('sugerirPlano(')
    expect(indice).not.toMatch(/\.from\(|\.rpc\(|api\.anthropic\.com|LIMITE|PRECOS|refusal|stop_reason/)
  })

  it.each(Object.entries(NUCLEOS))('%s: sem Deno, sem import de fora, sem console e sem relógio solto', (_, codigo) => {
    expect(codigo).not.toMatch(/Deno\.|esm\.sh|npm:|console\.|Date\.now\(\)|new Date\(\)/)
  })

  it('o supabase-js vem do npm com a versão fixa das outras funções, no index e no banco; nada mais vem de fora', () => {
    for (const codigo of [indice, bancoDaIa]) {
      expect(codigo.match(/from '(?:npm:|jsr:|https?:)[^']+'/g)).toEqual(["from 'npm:@supabase/supabase-js@2.117.2'"])
    }
    for (const codigo of Object.values(NUCLEOS)) expect(codigo).not.toMatch(/@anthropic-ai|from 'https?:/)
  })

  it('D-1324: a chave da Anthropic só é lida do ambiente, no index, e nunca vai para o registro', () => {
    expect(indice).toContain("Deno.env.get('ANTHROPIC_API_KEY')")
    const registros = indice.split('\n').filter((l) => l.includes('console.'))
    for (const linha of registros) expect(linha).not.toMatch(/chave|ANTHROPIC_API_KEY|lido\.json|req\./)
    for (const codigo of [nucleo, bancoDaIa]) expect(codigo).not.toContain('ANTHROPIC_API_KEY')
  })

  it('CA-2301: o pedido acima de 64 KB responde 413 antes de ler a configuração e a sessão', () => {
    const grande = indice.indexOf("if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS, codigo: 'grande' }, 413, origem)")
    expect(grande).toBeGreaterThan(-1)
    expect(grande).toBeLessThan(indice.indexOf("Deno.env.get('SUPABASE_URL')"))
    expect(grande).toBeLessThan(indice.indexOf('quemPede('))
  })

  it('falha inesperada responde 500 com a frase de indisponível e os cabeçalhos do site; o registro leva só a mensagem', () => {
    const pegar = indice.indexOf('\n  } catch (erro) {\n')
    expect(pegar).toBeGreaterThan(indice.indexOf('return responder(resposta.corpo, resposta.status, origem)'))
    const depois = indice.slice(pegar)
    expect(depois).toContain("console.error('Falha inesperada ao sugerir o plano:', erro instanceof Error ? erro.message : 'erro desconhecido')")
    expect(depois).toContain("return responder({ erro: IA_INDISPONIVEL, codigo: 'indisponivel' }, 500, origem)")
  })

  it('CA-2312: o prazo de 110 s vai para a porta da Anthropic; o modo falso só pelo modoFalso (CA-2321)', () => {
    expect(indice).toContain('criarModeloAnthropic(chave ?? \'\', { prazoMs: PRAZO_DA_IA_MS })')
    expect(indice).toContain("const falso = modoFalso(Deno.env.get('IA_MODO'), urlSupabase ?? '')")
    expect(indice).toContain('modelo: falso.ligado ? criarModeloFalso() :')
  })

  it('CA-2383 e D-1330: o index passa o sinal do pedido do navegador ao núcleo', () => {
    expect(indice).toContain('sinal: req.signal,')
  })

  it('D-1318: IA_TETO_DIARIO_USD vale quando é número maior que zero; senão, US$ 5', () => {
    expect(tetoDoAmbiente(undefined)).toBe(5)
    expect(tetoDoAmbiente('12.5')).toBe(12.5)
    expect(tetoDoAmbiente('0')).toBe(5)
    expect(tetoDoAmbiente('dez')).toBe(5)
  })
})

describe('CA-2300: a permissão do navegador e o método, pelo que a função devolve', () => {
  const APP = 'https://app.metanutri.com.br'

  it('o index responde OPTIONS e o 405 antes de qualquer outra coisa, com os cabeçalhos de cabecalhosPara(origem)', () => {
    const opcoes = indice.indexOf("if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosPara(origem) })")
    const metodo = indice.indexOf("if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405, origem)")
    expect(opcoes).toBeGreaterThan(indice.indexOf("const origem = req.headers.get('Origin')"))
    expect(metodo).toBeGreaterThan(opcoes)
    expect(metodo).toBeLessThan(indice.indexOf('await lerCorpo(req)'))
  })

  it('do app: a permissão repete o endereço; de outro endereço ou sem endereço: sem permissão; sempre Vary: Origin', () => {
    expect(cabecalhosPara(APP)).toMatchObject({ 'Access-Control-Allow-Origin': APP, Vary: 'Origin' })
    expect(cabecalhosPara('https://metanutri.com.br')).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(cabecalhosPara('https://atacante.exemplo')).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(cabecalhosPara(null)).not.toHaveProperty('Access-Control-Allow-Origin')
    expect(JSON.stringify(cabecalhosPara(APP))).not.toContain('*')
  })

  it('o 405 sai em JSON, com a permissão só para o app', async () => {
    const r = responder({ erro: 'Use POST.' }, 405, APP)
    expect(r.status).toBe(405)
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe(APP)
    expect(await r.json()).toEqual({ erro: 'Use POST.' })
    expect(responder({ erro: 'Use POST.' }, 405, 'https://atacante.exemplo').headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})

describe('o banco de verdade fala com as funções do 016 pelos nomes e parâmetros de lá', () => {
  const chamadas = [...bancoDaIa.matchAll(/rpc\('([a-z_]+)', \{([^}]*)\}/g)].map((m) => ({ nome: m[1] ?? '', parametros: [...(m[2] ?? '').matchAll(/(p_[a-z_]+):/g)].map((p) => p[1] ?? '') }))

  it('as quatro funções são chamadas', () => {
    expect(chamadas.map((c) => c.nome).sort()).toEqual(['concluir_uso_da_ia', 'custo_da_ia_desde', 'reservar_uso_da_ia', 'uso_da_ia_no_mes'])
  })

  it.each(['reservar_uso_da_ia', 'concluir_uso_da_ia', 'uso_da_ia_no_mes', 'custo_da_ia_desde'])('%s: cada parâmetro existe no SQL, na mesma ordem', (nome) => {
    const chamada = chamadas.find((c) => c.nome === nome)
    const assinatura = sql.split(`create or replace function public.${nome}(`)[1]?.split(')')[0] ?? ''
    const doSql = [...assinatura.matchAll(/(p_[a-z_]+) /g)].map((p) => p[1])
    expect(chamada?.parametros).toEqual(doSql)
  })

  it('D-1305: lê o perfil, o pedido de estudante aprovado e a assinatura da conta', () => {
    expect(bancoDaIa).toContain("cliente.from('perfis').select('situacao, crn_status').eq('id', conta).maybeSingle()")
    expect(bancoDaIa).toContain("cliente.from('pedidos_estudante').select('id').eq('usuario', conta).eq('status', 'aprovado').limit(1)")
    expect(bancoDaIa).toContain("cliente.from('assinaturas').select('plano, status, expira_em').eq('nutricionista_id', conta).maybeSingle()")
  })
})

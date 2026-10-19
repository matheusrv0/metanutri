// @vitest-environment node
// A função excluir-conta é ligação fina (spec exclusao-de-conta; o mesmo jeito do D-88 da cobranca-em-producao): o
// index.ts e o lado de verdade rodam no Deno e o Vitest não os executa aqui. Aqui se confere o texto deles; a decisão é
// testada no núcleo (servidorExcluir.test.ts), e o lado de verdade roda contra o Supabase local
// (testes/seguranca/exclusao.test.ts, pelo npm run test:seguranca).
import indice from '../../supabase/functions/excluir-conta/index.ts?raw'
import ladoDeVerdade from '../../supabase/functions/_shared/exclusaoSupabase.ts?raw'
import nucleo from '../../supabase/functions/_shared/excluirConta.ts?raw'

const registros = (codigo: string) => codigo.split('\n').filter((linha) => linha.includes('console.'))
const SUPABASE_NPM = 'npm:@supabase/supabase-js@2.117.2'

describe('excluir-conta: a ligação (index.ts)', () => {
  it('cliente com a chave de serviço, pelo npm:, e nenhuma decisão aqui', () => {
    expect(indice).toContain(`import { createClient } from '${SUPABASE_NPM}'`)
    expect(indice).not.toContain('esm.sh')
    expect(indice).toContain('createClient(urlSupabase, servico)')
    expect(indice).toContain("from '../_shared/bancoSupabase.ts'")
    expect(indice).toContain("from '../_shared/exclusaoSupabase.ts'")
    expect(indice).toContain("from '../_shared/excluirConta.ts'")
    expect(indice).not.toMatch(/\.from\(|api\.mercadopago\.com|traduzirStatus|preapproval|PLANOS|deleteUser|storage|administradores/)
  })

  it('CA-823: lê o corpo com o teto de 64 KB antes de qualquer outra coisa, sem o req.json(), e responde 413', () => {
    const ler = indice.indexOf('const lido = await lerCorpo(req)')
    expect(ler).toBeGreaterThan(-1)
    expect(indice).toContain("from '../_shared/corpo.ts'")
    expect(indice).not.toContain('req.json(')
    expect(ler).toBeLessThan(indice.indexOf("Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')"))
    expect(ler).toBeLessThan(indice.indexOf('createClient(urlSupabase, servico)'))
    expect(indice).toContain('if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)')
    expect(indice).toContain('corpo: lido.json,')
  })

  it('responde ao pré-voo do navegador só com os cabeçalhos do site, e só aceita POST', () => {
    expect(indice).toContain("if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })")
    expect(indice).toContain("if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)")
    expect(indice).toContain('return responder(resposta.corpo, resposta.status)')
  })

  it('quem pede vem do cabeçalho Authorization, lido pelo lado de verdade', () => {
    expect(indice).toContain("quem: await quemPedeAExclusao(cliente, req.headers.get('Authorization')),")
  })

  it('o cancelamento usa a mesma operadora e o mesmo banco da gerenciar-assinatura, com o prazo de 10 s', () => {
    expect(indice).toContain('operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }),')
    expect(indice).toContain('banco: criarBanco(cliente, console.error),')
    expect(indice).toContain('exclusao: criarPortaDaExclusao(cliente),')
  })

  it('sem configuração, 500 sem apagar nada; falha inesperada, 500 com a frase do CA-809 e só a mensagem no registro', () => {
    expect(indice).toContain("if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)")
    const tentar = indice.indexOf('\n  try {\n')
    const pegar = indice.indexOf('\n  } catch (erro) {\n')
    expect(tentar).toBeGreaterThan(indice.indexOf("if (req.method !== 'POST')"))
    expect(tentar).toBeLessThan(indice.indexOf('const lido = await lerCorpo(req)'))
    expect(pegar).toBeGreaterThan(indice.indexOf('return responder(resposta.corpo, resposta.status)'))
    const depois = indice.slice(pegar)
    expect(depois).toContain("console.error('Falha inesperada ao excluir a conta:', erro instanceof Error ? erro.message : 'erro desconhecido')")
    expect(depois).toContain('return responder({ erro: EXCLUSAO_FALHOU }, 500)')
  })

  it('nenhum registro leva o corpo, o token da sessão ou o e-mail; ninguém lê o IP', () => {
    for (const linha of registros(indice)) expect(linha).not.toMatch(/corpo|Authorization|jwt|email/i)
    for (const codigo of [indice, ladoDeVerdade]) expect(codigo).not.toMatch(/x-forwarded-for|\bip\b/i)
  })
})

describe('excluir-conta: o lado de verdade (exclusaoSupabase.ts)', () => {
  it('só o tipo do supabase-js, pelo npm:; sem Deno e sem console', () => {
    expect(ladoDeVerdade).toContain(`import type { SupabaseClient } from '${SUPABASE_NPM}'`)
    expect(ladoDeVerdade.match(/from '[^']+'/g)).toEqual([`from '${SUPABASE_NPM}'`, "from './excluirConta.ts'"])
    expect(ladoDeVerdade).not.toMatch(/esm\.sh|Deno\.|console\./)
  })

  it('CA-815 e CA-821: sem token, ninguém; login que não existe mais, "apagada"; a hora da senha sai do token', () => {
    expect(ladoDeVerdade).toContain("if (!jwt) return { tipo: 'ninguem' }")
    expect(ladoDeVerdade).toContain('cliente.auth.getUser(jwt)')
    expect(ladoDeVerdade).toContain("if (error?.code === 'user_not_found') return { tipo: 'apagada' }")
    expect(ladoDeVerdade).toContain('senhaEm: horaDaSenha(jwt)')
  })

  it('CA-817: administrador é quem está em administradores, lido com a chave de serviço; sem resposta, rejeita', () => {
    const ehAdmin = ladoDeVerdade.split('async ehAdmin(')[1]?.split('async apagarArquivos(')[0] ?? ''
    expect(ehAdmin).toContain(".from('administradores').select('usuario').eq('usuario', conta).maybeSingle()")
    expect(ehAdmin).toContain('if (error) throw new Error(')
  })

  it('CB-259: os comprovantes saem da pasta da conta, lida em páginas de 100, com as subpastas', () => {
    expect(ladoDeVerdade).toContain("const BALDE = 'comprovantes'")
    expect(ladoDeVerdade).toContain('const PAGINA = 100')
    expect(ladoDeVerdade).toContain('.list(pasta, { limit: PAGINA, offset: desde })')
    expect(ladoDeVerdade).toContain('.remove(')
  })

  it('CB-252: apagar o login que já não existe conta como feito', () => {
    const apagar = ladoDeVerdade.split('async apagarLogin(')[1] ?? ''
    expect(apagar).toContain('cliente.auth.admin.deleteUser(conta)')
    expect(apagar).toContain("error.code === 'user_not_found'")
  })
})

describe('excluir-conta: o núcleo (excluirConta.ts)', () => {
  it('sem Deno, sem esm.sh, sem npm:, sem console e sem relógio solto', () => {
    expect(nucleo).not.toMatch(/Deno\.|esm\.sh|npm:|console\.|Date\.now\(\)|new Date\(\)/)
  })

  it('o cancelamento é o da gerenciar-assinatura, sem caminho próprio até a operadora', () => {
    expect(nucleo).toContain("gerenciarAssinatura({ conta: quem.conta, corpo: { acao: 'cancelar' } }, deps)")
    expect(nucleo).not.toMatch(/deps\.operadora\(|tentarCancelarNaOperadora|preapproval\//)
  })
})

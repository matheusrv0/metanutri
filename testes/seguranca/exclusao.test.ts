// A exclusão de conta de ponta a ponta num Supabase LOCAL (spec exclusao-de-conta, CA-812 a CA-826, CB-250 a CB-252 e
// CB-259). O núcleo da função excluir-conta roda com o banco e a porta de verdade (supabase-js com a chave de serviço
// local); só a operadora de pagamento é de mentira: o Mercado Pago nunca é chamado daqui.
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { EM_ANDAMENTO } from '../../supabase/functions/_shared/assinar.ts'
import { criarBanco } from '../../supabase/functions/_shared/bancoSupabase.ts'
import { excluirConta, horaDaSenha, type PortaDaExclusao, type QuemPedeAExclusao } from '../../supabase/functions/_shared/excluirConta.ts'
import { criarPortaDaExclusao, quemPedeAExclusao } from '../../supabase/functions/_shared/exclusaoSupabase.ts'
import type { Operadora, Registro } from '../../supabase/functions/_shared/portas.ts'
import { daLinhaMudanca, receitaNoHistorico, type MudancaDeAssinatura } from '../../src/domain/negocio.ts'
import { arquivoPdf, BALDE, barrado, clienteSemSessao, prepararCenario, TABELAS_DA_CONTA, type Cenario, type Conta } from './preparo.ts'

const MINUTO_MS = 60_000
const EXCLUIDA = { status: 200, corpo: { excluida: true } }

interface PedidoAOperadora {
  readonly metodo: string
  readonly caminho: string
  readonly corpo: unknown
}

/** A operadora de mentira: lê a assinatura como ativa e já cobrada, e cancela. `fora`: sem resposta. */
function operadoraFalsa(fora = false) {
  const pedidos: PedidoAOperadora[] = []
  const proxima = new Date(Date.now() + 20 * 24 * 60 * MINUTO_MS).toISOString()
  const operadora: Operadora = async (metodo, caminho, corpo) => {
    pedidos.push({ metodo, caminho, corpo })
    if (fora) return null
    if (metodo === 'GET') return { ok: true, status: 200, dados: { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: proxima } }
    return { ok: true, status: 200, dados: {} }
  }
  return { operadora, pedidos }
}

interface Extra {
  readonly operadora?: Operadora
  readonly exclusao?: PortaDaExclusao
  readonly agora?: () => Date
}

/** As dependências da função como o index.ts liga, com a operadora de mentira. */
function dependencias(servico: SupabaseClient, extra: Extra = {}) {
  const log = vi.fn<Registro>()
  return {
    log,
    deps: {
      operadora: extra.operadora ?? operadoraFalsa().operadora,
      banco: criarBanco(servico, log),
      exclusao: extra.exclusao ?? criarPortaDaExclusao(servico),
      agora: extra.agora ?? (() => new Date()),
      log,
    },
  }
}

async function tokenDa(conta: Conta): Promise<string> {
  const { data } = await conta.cliente.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error(`sem sessão para ${conta.email}`)
  return token
}

async function quemE(c: Cenario, conta: Conta): Promise<QuemPedeAExclusao> {
  return quemPedeAExclusao(c.servico, `Bearer ${await tokenDa(conta)}`)
}

const PEDIDO = { acao: 'excluir' }

/** Tudo de uma conta, lido com a chave de serviço: as linhas de cada tabela e os arquivos da pasta dela no balde. */
async function fotoDaConta(c: Cenario, id: string): Promise<string> {
  const foto: Record<string, unknown> = {}
  for (const { tabela, dono } of TABELAS_DA_CONTA) {
    const r = await c.servico.from(tabela).select('*').eq(dono, id)
    if (r.error) throw new Error(`foto de ${tabela}: ${r.error.message}`)
    foto[tabela] = (r.data ?? []).map((linha) => JSON.stringify(linha)).sort()
  }
  foto['arquivos'] = await arquivosDa(c, id)
  return JSON.stringify(foto)
}

/** Os caminhos de todos os arquivos da pasta da conta, com as subpastas. */
async function arquivosDa(c: Cenario, pasta: string): Promise<string[]> {
  const r = await c.servico.storage.from(BALDE).list(pasta, { limit: 1000 })
  if (r.error) throw new Error(`listar ${pasta}: ${r.error.message}`)
  const achados: string[] = []
  for (const item of r.data ?? []) {
    if (item.id) achados.push(`${pasta}/${item.name}`)
    else achados.push(...(await arquivosDa(c, `${pasta}/${item.name}`)))
  }
  return achados.sort()
}

async function loginExiste(c: Cenario, id: string): Promise<boolean> {
  const r = await c.servico.auth.admin.getUserById(id)
  if (r.error && r.error.code !== 'user_not_found') throw new Error(`ler o login: ${r.error.message}`)
  return r.data.user !== null
}

async function consegueEntrar(c: Cenario, conta: Conta): Promise<boolean> {
  const r = await clienteSemSessao(c.ambiente).auth.signInWithPassword({ email: conta.email, password: conta.senha })
  return r.error === null
}

interface LinhaDoHistorico {
  readonly nutricionista_id: string
  readonly plano: string
  readonly status: string
  readonly quando: string
}

async function historicoDe(c: Cenario, filtro: { readonly coluna: 'nutricionista_id' | 'valor_centavos'; readonly valores: readonly (string | number)[] }): Promise<LinhaDoHistorico[]> {
  const r = await c.servico.from('assinaturas_historico').select('nutricionista_id, plano, status, quando').in(filtro.coluna, [...filtro.valores])
  if (r.error) throw new Error(`ler o histórico: ${r.error.message}`)
  return (r.data ?? []) as LinhaDoHistorico[]
}

async function registroDa(c: Cenario, preapprovalId: string): Promise<Record<string, unknown>[]> {
  const r = await c.servico.from('assinaturas_de_contas_excluidas').select('*').eq('preapproval_id', preapprovalId)
  if (r.error) throw new Error(`ler o registro: ${r.error.message}`)
  return (r.data ?? []) as Record<string, unknown>[]
}

/**
 * O cenário deixa a conta reservada agora (assinando_agora), como um pagamento em andamento. Aqui a reserva vira a de
 * uma função que morreu há 10 minutos: vencida, ela sai sozinha na exclusão (CB-253).
 */
async function reservaVencida(c: Cenario): Promise<void> {
  const r = await c.servico.from('assinando_agora').update({ desde: new Date(Date.now() - 10 * MINUTO_MS).toISOString() }).eq('nutricionista_id', c.vitima.id)
  if (r.error) throw new Error(`vencer a reserva: ${r.error.message}`)
}

/** Um login novo, criado pela chave de serviço, sem perfil nem nada (CB-258). */
async function loginNovo(c: Cenario, prefixo: string): Promise<string> {
  const criada = await c.servico.auth.admin.createUser({ email: `${prefixo}.${randomBytes(4).toString('hex')}@exemplo.com`, password: `Senha-${randomBytes(8).toString('hex')}`, email_confirm: true })
  const id = criada.data.user?.id
  if (criada.error || !id) throw new Error(`criar o login: ${criada.error?.message ?? 'sem id'}`)
  return id
}

describe('CA-812 a CA-820: a conta com tudo é excluída, e só ela', () => {
  let c: Cenario
  let fotoDaOutra: string
  let fotoDoAdmin: string
  let avisosAntes: string
  let historicoAntes: LinhaDoHistorico[]
  let arquivosAntes: string[]
  let jwt: string
  const operadora = operadoraFalsa()
  const valorUnico = 710_000 + Math.floor(Math.random() * 9_000)
  let resposta: Awaited<ReturnType<typeof excluirConta>>

  beforeAll(async () => {
    c = await prepararCenario()
    // A dieta no link e um comprovante numa subpasta, além do que o cenário já tem.
    const dieta = await c.vitima.cliente.from('acompanhamentos').update({ dieta: { refeicoes: [{ nome: `Almoço ${c.marcador}` }] } }).eq('id', c.vitima.linkId)
    if (dieta.error) throw new Error(dieta.error.message)
    const sub = await c.vitima.cliente.storage.from(BALDE).upload(`${c.vitima.id}/pasta/terceiro.pdf`, arquivoPdf('terceiro'), { contentType: 'application/pdf' })
    if (sub.error) throw new Error(sub.error.message)
    // Um valor só deste teste: com as datas arredondadas para o dia (L2), é por ele que o histórico é reencontrado.
    const valor = await c.servico.from('assinaturas').update({ valor_centavos: valorUnico }).eq('nutricionista_id', c.vitima.id)
    if (valor.error) throw new Error(valor.error.message)
    await reservaVencida(c)
    fotoDaOutra = await fotoDaConta(c, c.atacante.id)
    fotoDoAdmin = await fotoDaConta(c, c.admin.id)
    avisosAntes = JSON.stringify((await c.servico.from('avisos_da_operadora').select('*').order('id')).data)
    historicoAntes = await historicoDe(c, { coluna: 'nutricionista_id', valores: [c.vitima.id] })
    arquivosAntes = await arquivosDa(c, c.vitima.id)
    jwt = await tokenDa(c.vitima)
    const { deps } = dependencias(c.servico, { operadora: operadora.operadora })
    resposta = await excluirConta({ quem: await quemPedeAExclusao(c.servico, `Bearer ${jwt}`), corpo: PEDIDO }, deps)
  })

  it('controle: o cenário tinha comprovantes (um numa subpasta), histórico e o resto da conta', () => {
    expect(historicoAntes.length).toBeGreaterThan(0)
    expect(arquivosAntes).toEqual([c.vitima.arquivo, c.vitima.segundoArquivo, `${c.vitima.id}/pasta/terceiro.pdf`].sort())
    expect(JSON.parse(fotoDaOutra)).toMatchObject({ copias: [expect.any(String)], acompanhamentos: [expect.any(String)] })
  })

  it('CA-812: a resposta é 200', () => {
    expect(resposta).toEqual(EXCLUIDA)
  })

  it('CA-814: a assinatura foi lida e cancelada na operadora (o caminho do "Cancelar assinatura")', () => {
    const caminho = `/preapproval/${encodeURIComponent(`pre-${c.marcador}`)}`
    expect(operadora.pedidos.map((p) => [p.metodo, p.caminho, p.corpo])).toEqual([
      ['GET', caminho, undefined],
      ['PUT', caminho, { status: 'cancelled' }],
    ])
  })

  it.each(TABELAS_DA_CONTA.filter(({ tabela }) => tabela !== 'assinaturas_historico'))('CA-812: nada da conta sobra em $tabela', async ({ tabela, dono }) => {
    const r = await c.servico.from(tabela).select('*').eq(dono, c.vitima.id)
    expect(r.error).toBeNull()
    expect(r.data).toEqual([])
  })

  it('CA-812 e CB-259: nenhum comprovante sobra na pasta da conta, nem na subpasta', async () => {
    expect(await arquivosDa(c, c.vitima.id)).toEqual([])
  })

  it('CA-812: o login não existe mais, e a senha antiga não entra', async () => {
    expect(await loginExiste(c, c.vitima.id)).toBe(false)
    expect(await consegueEntrar(c, c.vitima)).toBe(false)
  })

  it('CA-813: o link do paciente não acha mais nada', async () => {
    const r = await c.anonimo.rpc('missoes_por_token', { p_token: c.vitima.token })
    expect(r.error).toBeNull()
    expect(r.data).toEqual([])
  })

  it('CA-818: fica o registro da assinatura, sem nome, e-mail, cartão nem o código da conta', async () => {
    const linhas = await registroDa(c, `pre-${c.marcador}`)
    expect(linhas).toHaveLength(1)
    const linha = linhas[0] ?? {}
    expect(linha).toMatchObject({ plano: 'solo', ciclo: 'mensal', valor_centavos: valorUnico, encerrada_por: 'pessoa' })
    expect(Object.keys(linha).sort()).toEqual(['ciclo', 'encerrada_em', 'encerrada_por', 'excluida_em', 'id', 'plano', 'preapproval_id', 'ultima_cobranca_paga', 'valor_centavos'])
    // L2: só o dia, o de Brasília.
    const hojeEmBrasilia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    expect(linha['excluida_em']).toBe(hojeEmBrasilia)
    expect(linha['encerrada_em']).toBe(hojeEmBrasilia)
    const texto = JSON.stringify(linha)
    for (const proibido of [c.vitima.id, c.vitima.email, 'Visa', '4242']) expect(texto).not.toContain(proibido)
  })

  it('CA-819: o histórico fica, todo com um mesmo código novo que não é o da conta nem de login nenhum, com o cancelamento no fim', async () => {
    expect(await historicoDe(c, { coluna: 'nutricionista_id', valores: [c.vitima.id] })).toEqual([])
    const reencontradas = await historicoDe(c, { coluna: 'valor_centavos', valores: [valorUnico] })
    const codigos = [...new Set(reencontradas.map((h) => h.nutricionista_id))]
    expect(codigos).toHaveLength(1)
    const codigo = codigos[0] ?? ''
    expect(codigo).not.toBe(c.vitima.id)
    expect(await loginExiste(c, codigo)).toBe(false)
    const todas = await historicoDe(c, { coluna: 'nutricionista_id', valores: [codigo] })
    expect(todas).toHaveLength(historicoAntes.length + 1)
    expect(todas.map((h) => h.status)).toContain('cancelada')
    // L2: as datas ficam só com o dia (a meia-noite de Brasília, 03:00 UTC).
    for (const h of todas) expect(new Date(h.quando).toISOString()).toMatch(/T03:00:00\.000Z$/)
    // O painel do dono lê o histórico assim: as linhas da conta excluída continuam lá.
    const painel = await c.admin.cliente.rpc('painel_historico_assinaturas')
    expect(painel.error).toBeNull()
    expect(JSON.stringify(painel.data)).toContain(codigo)
  })

  it('CA-820: a outra conta, o administrador e o registro de avisos não mudam', async () => {
    expect(await fotoDaConta(c, c.atacante.id)).toBe(fotoDaOutra)
    expect(await fotoDaConta(c, c.admin.id)).toBe(fotoDoAdmin)
    expect(JSON.stringify((await c.servico.from('avisos_da_operadora').select('*').order('id')).data)).toBe(avisosAntes)
    expect(await consegueEntrar(c, c.atacante)).toBe(true)
  })

  it('CA-821 e CB-250: o mesmo pedido de novo, com o mesmo token, responde "já excluída" e não faz nada', async () => {
    const quem = await quemPedeAExclusao(c.servico, `Bearer ${jwt}`)
    expect(quem).toEqual({ tipo: 'apagada' })
    const outraOperadora = operadoraFalsa()
    const { deps } = dependencias(c.servico, { operadora: outraOperadora.operadora })
    expect(await excluirConta({ quem, corpo: PEDIDO }, deps)).toEqual(EXCLUIDA)
    expect(outraOperadora.pedidos).toEqual([])
  })

  it('CA-824: conta comum e visitante não leem nem escrevem o registro', async () => {
    for (const cliente of [c.atacante.cliente, c.anonimo]) {
      barrado(await cliente.from('assinaturas_de_contas_excluidas').select('*'))
      barrado(await cliente.from('assinaturas_de_contas_excluidas').insert({ preapproval_id: 'pre-invasor', plano: 'pro', valor_centavos: 1 }))
      barrado(await cliente.from('assinaturas_historico').select('*'))
    }
  })
})

describe('nada muda quando a exclusão é recusada (CA-814, CA-816, CA-817, CA-822)', () => {
  let c: Cenario
  let foto: string

  beforeAll(async () => {
    c = await prepararCenario()
    // Sem pagamento em andamento: a recusa de cada teste vem do que ele testa, não da reserva (CB-253, testado abaixo).
    const semReserva = await c.servico.from('assinando_agora').delete().eq('nutricionista_id', c.vitima.id)
    if (semReserva.error) throw new Error(semReserva.error.message)
    foto = await fotoDaConta(c, c.vitima.id)
  })

  const igual = async () => {
    expect(await fotoDaConta(c, c.vitima.id)).toBe(foto)
    expect(await consegueEntrar(c, c.vitima)).toBe(true)
  }

  it('D-251: o token de verdade traz a hora da entrada, de agora', async () => {
    const hora = horaDaSenha(await tokenDa(c.vitima))
    expect(hora).not.toBeNull()
    expect(Math.abs(Date.now() - (hora?.getTime() ?? 0))).toBeLessThan(5 * MINUTO_MS)
  })

  it('CA-815: sem token, 401', async () => {
    const { deps } = dependencias(c.servico)
    expect((await excluirConta({ quem: await quemPedeAExclusao(c.servico, null), corpo: PEDIDO }, deps)).status).toBe(401)
    expect((await excluirConta({ quem: await quemPedeAExclusao(c.servico, 'Bearer nao-e-token'), corpo: PEDIDO }, deps)).status).toBe(401)
    await igual()
  })

  it('CA-816: a senha conferida há mais de 10 minutos, 401 "Confirme sua senha de novo."', async () => {
    const { deps } = dependencias(c.servico, { agora: () => new Date(Date.now() + 15 * MINUTO_MS) })
    expect(await excluirConta({ quem: await quemE(c, c.vitima), corpo: PEDIDO }, deps)).toEqual({ status: 401, corpo: { erro: 'Confirme sua senha de novo.', codigo: 'login-antigo' } })
    await igual()
  })

  it('CA-817: conta de administrador, 403, e o administrador continua', async () => {
    const operadora = operadoraFalsa()
    const { deps } = dependencias(c.servico, { operadora: operadora.operadora })
    const fotoDoAdmin = await fotoDaConta(c, c.admin.id)
    expect((await excluirConta({ quem: await quemE(c, c.admin), corpo: PEDIDO }, deps)).status).toBe(403)
    expect(await loginExiste(c, c.admin.id)).toBe(true)
    expect(await fotoDaConta(c, c.admin.id)).toBe(fotoDoAdmin)
    expect(operadora.pedidos).toEqual([])
  })

  it('CA-814: a operadora fora: 502, a assinatura continua ativa e nada é apagado', async () => {
    const { deps } = dependencias(c.servico, { operadora: operadoraFalsa(true).operadora })
    expect((await excluirConta({ quem: await quemE(c, c.vitima), corpo: PEDIDO }, deps)).status).toBe(502)
    // A tentativa fica anotada no limite (D-256); o resto, igual.
    await c.servico.from('chamadas_da_cobranca').delete().eq('nutricionista_id', c.vitima.id).in('tipo', ['excluir', 'conferir'])
    await igual()
  })

  it('CA-822 e D-256: o banco aceita o tipo excluir, e com 5 pedidos na última hora o próximo é barrado sem fazer nada', async () => {
    const semeadas = await c.servico.from('chamadas_da_cobranca').insert(Array.from({ length: 5 }, () => ({ nutricionista_id: c.vitima.id, tipo: 'excluir' })))
    expect(semeadas.error).toBeNull()
    const { deps } = dependencias(c.servico)
    expect((await excluirConta({ quem: await quemE(c, c.vitima), corpo: PEDIDO }, deps)).status).toBe(429)
    await c.servico.from('chamadas_da_cobranca').delete().eq('nutricionista_id', c.vitima.id).eq('tipo', 'excluir')
    await igual()
  })
})

describe('CA-821 e CB-251: falha no meio, e o pedido seguinte termina', () => {
  it('o login não sai: a conta continua entrando, com os dados; o pedido seguinte não cancela de novo e termina', async () => {
    const c = await prepararCenario()
    await reservaVencida(c)
    const real = criarPortaDaExclusao(c.servico)
    let falhas = 1
    const porta: PortaDaExclusao = { ...real, apagarLogin: async (conta) => (falhas-- > 0 ? 'login fora (teste)' : real.apagarLogin(conta)) }
    const operadora = operadoraFalsa()
    const { deps } = dependencias(c.servico, { operadora: operadora.operadora, exclusao: porta })
    const quem = await quemE(c, c.vitima)

    expect((await excluirConta({ quem, corpo: PEDIDO }, deps)).status).toBe(502)
    expect(await consegueEntrar(c, c.vitima)).toBe(true)
    expect((await c.servico.from('copias').select('nutricionista_id').eq('nutricionista_id', c.vitima.id)).data).toHaveLength(1)
    expect((await c.servico.from('assinaturas').select('status').eq('nutricionista_id', c.vitima.id).single()).data).toEqual({ status: 'cancelada' })
    expect(await arquivosDa(c, c.vitima.id)).toEqual([])

    expect(await excluirConta({ quem, corpo: PEDIDO }, deps)).toEqual(EXCLUIDA)
    expect(operadora.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
    expect(await loginExiste(c, c.vitima.id)).toBe(false)
    expect((await c.servico.from('copias').select('nutricionista_id').eq('nutricionista_id', c.vitima.id)).data).toEqual([])
    expect(await registroDa(c, `pre-${c.marcador}`)).toHaveLength(1)
  })
})

describe('L8 da revisão: o que o D-251 e o CA-820 supõem', () => {
  it('L8 (a), D-251 e CA-816: renovar a sessão, sem senha, troca o token mas não a hora da entrada', async () => {
    const c = await prepararCenario()
    const antes = await tokenDa(c.vitima)
    await new Promise((resolver) => setTimeout(resolver, 2_000))
    const renovada = await c.vitima.cliente.auth.refreshSession()
    expect(renovada.error).toBeNull()
    const depois = renovada.data.session?.access_token ?? ''
    expect(depois).not.toBe(antes)
    expect(horaDaSenha(depois)).not.toBeNull()
    expect(horaDaSenha(depois)).toEqual(horaDaSenha(antes))
  })

  it('L8 (b) e CA-820: o token de uma conta com o código de outra no corpo exclui só a dona do token', async () => {
    const c = await prepararCenario()
    const fotoDaVitima = await fotoDaConta(c, c.vitima.id)
    const quem = await quemE(c, c.atacante)
    const resposta = await excluirConta({ quem, corpo: { acao: 'excluir', conta: c.vitima.id, nutricionista_id: c.vitima.id } }, dependencias(c.servico).deps)
    expect(resposta).toEqual(EXCLUIDA)
    expect(await loginExiste(c, c.atacante.id)).toBe(false)
    expect(await loginExiste(c, c.vitima.id)).toBe(true)
    expect(await fotoDaConta(c, c.vitima.id)).toBe(fotoDaVitima)
    expect(await consegueEntrar(c, c.vitima)).toBe(true)
  })
})

describe('CB-253 (L4 da revisão): pagamento em andamento', () => {
  it('a conta reservada agora (o cenário deixa um pagamento em andamento) recebe 409 e nada muda; vencida a reserva, a exclusão segue', async () => {
    const c = await prepararCenario()
    const operadora = operadoraFalsa()
    const quem = await quemE(c, c.vitima)
    const antes = await fotoDaConta(c, c.vitima.id)
    expect(await excluirConta({ quem, corpo: PEDIDO }, dependencias(c.servico, { operadora: operadora.operadora }).deps)).toEqual({
      status: 409,
      corpo: { erro: EM_ANDAMENTO, codigo: 'em-andamento' },
    })
    expect(operadora.pedidos).toEqual([])
    // A tentativa conta no limite (D-256); o resto, igual, inclusive a reserva do pagamento.
    await c.servico.from('chamadas_da_cobranca').delete().eq('nutricionista_id', c.vitima.id).eq('tipo', 'excluir')
    expect(await fotoDaConta(c, c.vitima.id)).toBe(antes)
    expect(await loginExiste(c, c.vitima.id)).toBe(true)

    await reservaVencida(c)
    expect(await excluirConta({ quem, corpo: PEDIDO }, dependencias(c.servico).deps)).toEqual(EXCLUIDA)
  })
})

describe('CB-252: dois pedidos ao mesmo tempo', () => {
  it('a conta sai uma vez: um responde 200, o outro 200, o 409 da reserva (CB-253) ou a falha do CA-809, e o pedido seguinte acha a conta já excluída', async () => {
    const c = await prepararCenario()
    await reservaVencida(c)
    const jwt = await tokenDa(c.vitima)
    const quem = await quemPedeAExclusao(c.servico, `Bearer ${jwt}`)
    const respostas = await Promise.all([
      excluirConta({ quem, corpo: PEDIDO }, dependencias(c.servico).deps),
      excluirConta({ quem, corpo: PEDIDO }, dependencias(c.servico).deps),
    ])
    expect(respostas).toContainEqual(EXCLUIDA)
    for (const r of respostas) expect([200, 409, 502]).toContain(r.status)
    expect(await loginExiste(c, c.vitima.id)).toBe(false)
    expect(await registroDa(c, `pre-${c.marcador}`)).toHaveLength(1)
    expect(await quemPedeAExclusao(c.servico, `Bearer ${jwt}`)).toEqual({ tipo: 'apagada' })
  })
})

describe('CA-825 e CA-826: o banco ao apagar um login pelo painel do Supabase', () => {
  it('guarda a assinatura, tira o código do histórico e apaga do registro o que passou de 5 anos', async () => {
    const c = await prepararCenario()
    const id = await loginNovo(c, 'painel')
    const sufixo = randomBytes(4).toString('hex')
    const assinatura = await c.servico.from('assinaturas').insert({ nutricionista_id: id, plano: 'pro', status: 'ativa', valor_centavos: 3990, ciclo: 'mensal', preapproval_id: `pre-painel-${sufixo}` })
    expect(assinatura.error).toBeNull()
    const seisAnos = new Date(Date.now() - 6 * 365 * 24 * 60 * MINUTO_MS).toISOString()
    const quatroAnos = new Date(Date.now() - 4 * 365 * 24 * 60 * MINUTO_MS).toISOString()
    const antigos = await c.servico.from('assinaturas_de_contas_excluidas').insert([
      { preapproval_id: `pre-seis-${sufixo}`, plano: 'solo', valor_centavos: 2990, excluida_em: seisAnos },
      { preapproval_id: `pre-quatro-${sufixo}`, plano: 'solo', valor_centavos: 2990, excluida_em: quatroAnos },
    ])
    expect(antigos.error).toBeNull()

    const apagou = await c.servico.auth.admin.deleteUser(id)
    expect(apagou.error).toBeNull()

    expect(await registroDa(c, `pre-painel-${sufixo}`)).toEqual([expect.objectContaining({ plano: 'pro', valor_centavos: 3990, ciclo: 'mensal' })])
    expect(await registroDa(c, `pre-seis-${sufixo}`)).toEqual([])
    expect(await registroDa(c, `pre-quatro-${sufixo}`)).toHaveLength(1)
    expect(await historicoDe(c, { coluna: 'nutricionista_id', valores: [id] })).toEqual([])
    expect((await c.servico.from('assinaturas').select('*').eq('nutricionista_id', id)).data).toEqual([])
  })

  it('M2 e L8 (c): excluir pelo painel uma conta Pro ativa fecha o histórico, e a receita dos meses seguintes não a conta', async () => {
    const c = await prepararCenario()
    const id = await loginNovo(c, 'receita')
    // Um valor só deste teste, para achar as linhas dele no histórico do painel.
    const valor = 640_000 + Math.floor(Math.random() * 9_000)
    const assinatura = await c.servico
      .from('assinaturas')
      .insert({ nutricionista_id: id, plano: 'pro', status: 'ativa', valor_centavos: valor, ciclo: 'mensal', preapproval_id: `pre-receita-${randomBytes(4).toString('hex')}` })
    expect(assinatura.error).toBeNull()
    expect((await c.servico.auth.admin.deleteUser(id)).error).toBeNull()

    const painel = await c.admin.cliente.rpc('painel_historico_assinaturas')
    expect(painel.error).toBeNull()
    const linhas = (Array.isArray(painel.data) ? painel.data : []).map(daLinhaMudanca).filter((m): m is MudancaDeAssinatura => m !== null && m.valorCentavos === valor)
    expect(linhas.map((m) => m.status)).toEqual(['ativa', 'cancelada'])
    const codigos = [...new Set(linhas.map((m) => m.conta))]
    expect(codigos).toHaveLength(1)
    expect(codigos[0]).not.toBe(id)
    const mesQueVem = Date.now() + 31 * 24 * 60 * MINUTO_MS
    expect(receitaNoHistorico(linhas, mesQueVem)).toBe(0)
    // Sem a linha de fechamento, a conta excluída seguiria somando para sempre.
    expect(receitaNoHistorico(linhas.filter((m) => m.status !== 'cancelada'), mesQueVem)).toBe(valor)
  })

  it('M2: a conta excluída pelo site (assinatura já cancelada no passo 2) não ganha uma segunda linha de fechamento', async () => {
    const c = await prepararCenario()
    const id = await loginNovo(c, 'ja-cancelada')
    const valor = 650_000 + Math.floor(Math.random() * 9_000)
    await c.servico.from('assinaturas').insert({ nutricionista_id: id, plano: 'solo', status: 'ativa', valor_centavos: valor, ciclo: 'mensal', preapproval_id: `pre-cancelada-${randomBytes(4).toString('hex')}` })
    await c.servico.from('assinaturas').update({ status: 'cancelada', encerrada_por: 'pessoa', encerrada_em: new Date().toISOString() }).eq('nutricionista_id', id)
    expect((await c.servico.auth.admin.deleteUser(id)).error).toBeNull()
    const painel = await c.admin.cliente.rpc('painel_historico_assinaturas')
    const linhas = (Array.isArray(painel.data) ? painel.data : []).map(daLinhaMudanca).filter((m): m is MudancaDeAssinatura => m !== null && m.valorCentavos === valor)
    expect(linhas.map((m) => m.status)).toEqual(['ativa', 'cancelada'])
  })

  it('CB-258: login sem perfil, sem assinatura e sem histórico também sai, sem deixar registro', async () => {
    const c = await prepararCenario()
    const id = await loginNovo(c, 'vazio')
    const antes = (await c.servico.from('assinaturas_de_contas_excluidas').select('id')).data?.length ?? 0
    expect((await c.servico.auth.admin.deleteUser(id)).error).toBeNull()
    expect((await c.servico.from('assinaturas_de_contas_excluidas').select('id')).data?.length ?? 0).toBe(antes)
  })
})

describe('CB-259: mais de 100 arquivos na pasta da conta', () => {
  it('todos saem, os da subpasta também', async () => {
    const c = await prepararCenario()
    const id = await loginNovo(c, 'arquivos')
    const balde = c.servico.storage.from(BALDE)
    const caminhos = [...Array.from({ length: 105 }, (_, i) => `${id}/arquivo-${String(i).padStart(3, '0')}.pdf`), `${id}/sub/a.pdf`, `${id}/sub/b.pdf`]
    for (const caminho of caminhos) {
      const r = await balde.upload(caminho, arquivoPdf(caminho), { contentType: 'application/pdf' })
      if (r.error) throw new Error(`enviar ${caminho}: ${r.error.message}`)
    }
    expect(await arquivosDa(c, id)).toHaveLength(107)
    expect(await criarPortaDaExclusao(c.servico).apagarArquivos(id)).toBeNull()
    expect(await arquivosDa(c, id)).toEqual([])
    // A pasta vazia de novo: nada a apagar, e não é erro.
    expect(await criarPortaDaExclusao(c.servico).apagarArquivos(id)).toBeNull()
  }, 120_000)
})

interface RegistroDeAcesso {
  readonly payload?: { readonly actor_username?: string }
}

/** Os registros de acesso (auth.audit_log_entries) de um e-mail, pela API de administração do servidor de login. */
async function registrosDeAcesso(c: Cenario, email: string): Promise<RegistroDeAcesso[]> {
  const resposta = await fetch(`${c.ambiente.url}/auth/v1/admin/audit?per_page=1000`, {
    headers: { apikey: c.ambiente.servico, Authorization: `Bearer ${c.ambiente.servico}` },
  })
  if (!resposta.ok) throw new Error(`ler os registros de acesso: HTTP ${resposta.status}`)
  const lista = (await resposta.json()) as RegistroDeAcesso[]
  return lista.filter((r) => r.payload?.actor_username === email)
}

describe('D-259 (revisão de 19/10/2026): a rotina diária', () => {
  it('apaga os registros de acesso com mais de 6 meses e deixa os mais novos', async () => {
    const c = await prepararCenario()
    // Entrar deixa um registro de acesso com o e-mail (CA-827: a Política diz isso).
    expect((await registrosDeAcesso(c, c.vitima.email)).length).toBeGreaterThan(0)
    expect((await c.servico.rpc('limpar_registros_guardados')).error).toBeNull()
    expect((await registrosDeAcesso(c, c.vitima.email)).length).toBeGreaterThan(0)
    // Daqui a 7 meses, os de hoje passaram de 6: a mesma rotina os apaga, com a permissão que ela tem no banco.
    const daquiA7Meses = new Date(Date.now() + 7 * 31 * 24 * 60 * MINUTO_MS).toISOString()
    expect((await c.servico.rpc('limpar_registros_guardados', { p_agora: daquiA7Meses })).error).toBeNull()
    expect(await registrosDeAcesso(c, c.vitima.email)).toEqual([])
  })

  it('CA-825 (L1): apaga o registro de assinaturas com mais de 5 anos, sem precisar de outra exclusão', async () => {
    const c = await prepararCenario()
    const sufixo = randomBytes(4).toString('hex')
    const ano = 365 * 24 * 60 * MINUTO_MS
    const antigos = await c.servico.from('assinaturas_de_contas_excluidas').insert([
      { preapproval_id: `pre-rotina-seis-${sufixo}`, plano: 'solo', valor_centavos: 2990, excluida_em: new Date(Date.now() - 6 * ano).toISOString().slice(0, 10) },
      { preapproval_id: `pre-rotina-quatro-${sufixo}`, plano: 'solo', valor_centavos: 2990, excluida_em: new Date(Date.now() - 4 * ano).toISOString().slice(0, 10) },
    ])
    expect(antigos.error).toBeNull()
    expect((await c.servico.rpc('limpar_registros_guardados')).error).toBeNull()
    expect(await registroDa(c, `pre-rotina-seis-${sufixo}`)).toEqual([])
    expect(await registroDa(c, `pre-rotina-quatro-${sufixo}`)).toHaveLength(1)
  })

  it('conta comum e visitante não chamam a rotina', async () => {
    const c = await prepararCenario()
    for (const cliente of [c.atacante.cliente, c.anonimo]) barrado(await cliente.rpc('limpar_registros_guardados'))
  })
})

// CA-489 (spec seguranca-lote-4): texto de SQL injection em filtros, buscas e campos enviados ao banco.
// Esperado: tratado como texto, sem linha de outra conta, sem erro de sintaxe do SQL na resposta (DP-A4) e
// com as tabelas inteiras no fim.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambienteLocal, BALDE, clienteSemSessao, fotografar, negadoOuVazio, prepararCenario, semErroDeSql, semNadaDaVitima, TABELAS_DA_CONTA, type Cenario } from './preparo.ts'

const CARGAS = [
  "' OR '1'='1",
  "'; --",
  "' OR 1=1 --",
  "x' OR nutricionista_id IS NOT NULL --",
  "'); DROP TABLE public.acompanhamentos; --",
  "' UNION SELECT * FROM public.copias --",
  '" OR ""="',
  "\\'; SELECT pg_sleep(5); --",
  "%' OR '1'='1' --",
] as const

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterAll(async () => {
  // As tabelas continuam lá, e nada da vítima mudou.
  for (const { tabela } of TABELAS_DA_CONTA) {
    expect((await c.servico.from(tabela).select('*', { count: 'exact', head: true })).error, `a tabela ${tabela} sumiu`).toBeNull()
  }
  expect(await fotografar(c)).toBe(foto)
})

const quem = (): readonly [string, SupabaseClient][] => [
  ['outra conta', c.atacante.cliente],
  ['sem login', c.anonimo],
]

describe('CA-489: SQL injection em filtros e buscas', () => {
  it.each(CARGAS)('CA-489: eq, ilike, in e or com %s não trazem linha de outra conta nem erro de SQL', async (carga) => {
    for (const [rotulo, cliente] of quem()) {
      const respostas: readonly [string, { readonly data: unknown; readonly error: unknown }][] = [
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').eq('token', carga)],
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').eq('nome', carga)],
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').ilike('nome', carga)],
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').in('caso_id', [carga])],
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').or(`token.eq.${carga},nome.ilike.${carga}`)],
        ['nutricionista_id', await cliente.from('acompanhamentos').select('*').eq('nutricionista_id', carga)],
        ['nutricionista_id', await cliente.from('copias').select('*').eq('aparelho', carga)],
        ['id', await cliente.from('perfis').select('*').ilike('nome', carga)],
        ['usuario', await cliente.from('pedidos_estudante').select('*').eq('instituicao', carga)],
      ]
      for (const [dono, r] of respostas) {
        semErroDeSql(r)
        semNadaDaVitima(c, r)
        // Com o próprio login, só linha da própria conta; sem login, nenhuma.
        const linhas: unknown[] = Array.isArray(r.data) ? r.data : []
        const donos = linhas.map((l) => (l !== null && typeof l === 'object' ? (l as Record<string, unknown>)[dono] : null))
        expect(donos.every((d) => d === c.atacante.id), `${rotulo} viu linha de outra conta`).toBe(true)
        if (rotulo === 'sem login') expect(linhas).toEqual([])
      }
    }
  })

  it.each(CARGAS)('CA-489: o nome do arquivo na busca do armazenamento com %s não mostra arquivo de outra conta', async (carga) => {
    for (const [, cliente] of quem()) {
      const r = await cliente.storage.from(BALDE).list(c.vitima.id, { search: carga })
      negadoOuVazio(r)
      semErroDeSql(r)
      const raiz = await cliente.storage.from(BALDE).list('', { search: carga })
      semNadaDaVitima(c, raiz)
      semErroDeSql(raiz)
    }
  })
})

describe('CA-489: SQL injection nos parâmetros de texto das funções do banco', () => {
  it.each(CARGAS)('CA-489: o token do link do paciente com %s não acha nem marca o link de ninguém', async (carga) => {
    for (const [, cliente] of quem()) {
      const inicio = Date.now()
      const lido = await cliente.rpc('missoes_por_token', { p_token: carga })
      expect(Date.now() - inicio, 'pg_sleep rodou').toBeLessThan(4000)
      negadoOuVazio(lido)
      semErroDeSql(lido)
      semNadaDaVitima(c, lido)
      const marcado = await cliente.rpc('marcar_missoes', { p_token: carga, p_marcacoes: [{ dia: '2026-10-14', missoes: ['invasor'] }] })
      semErroDeSql(marcado)
    }
  })

  it('CA-489: instituição e matrícula com SQL injection ficam gravadas como texto', async () => {
    const instituicao = "'); DROP TABLE public.perfis; --"
    const matricula = "' OR '1'='1"
    const r = await c.atacante.cliente.rpc('enviar_pedido_estudante', {
      p_instituicao: instituicao,
      p_matricula: matricula,
      p_periodo: 2,
      p_formatura: '2030-12-01',
      p_arquivo: c.atacante.arquivo,
    })
    expect(r.error).toBeNull()
    const gravado = await c.servico.from('pedidos_estudante').select('instituicao, matricula').eq('usuario', c.atacante.id).single()
    expect(gravado.data).toEqual({ instituicao, matricula })
  })

  it('CA-489: o caminho do comprovante com SQL injection é recusado pela regra, sem erro de SQL', async () => {
    for (const carga of CARGAS) {
      const r = await c.atacante.cliente.rpc('enviar_pedido_estudante', {
        p_instituicao: 'Universidade',
        p_matricula: '123456',
        p_periodo: 2,
        p_formatura: '2030-12-01',
        p_arquivo: `${c.atacante.id}/${carga}`,
      })
      semErroDeSql(r)
      semNadaDaVitima(c, r)
    }
  })

  // Usa o pedido em análise que o teste da instituição deixou na conta do atacante.
  it('CA-489: o motivo da recusa com SQL injection fica gravado como texto e não dá plano a ninguém', async () => {
    const pedido = await c.servico.from('pedidos_estudante').select('id').eq('usuario', c.atacante.id).eq('status', 'em_analise').single()
    expect(pedido.error).toBeNull()
    const motivo = "x'; UPDATE public.assinaturas SET plano = 'pro'; --"
    const r = await c.admin.cliente.rpc('decidir_pedido', { p_pedido: pedido.data?.id, p_aprovar: false, p_motivo: motivo })
    expect(r.error).toBeNull()
    const gravado = await c.servico.from('pedidos_estudante').select('motivo, status').eq('id', pedido.data?.id).single()
    expect(gravado.data).toEqual({ motivo, status: 'recusado' })
    const pro = await c.servico.from('assinaturas').select('nutricionista_id').eq('plano', 'pro')
    expect(pro.data).toEqual([])
  })

  it.each(CARGAS)('CA-489: situação e CRN com %s são recusados pela regra, sem erro de SQL', async (carga) => {
    const situacao = await c.atacante.cliente.rpc('informar_situacao', { p_situacao: carga, p_regiao: 6, p_numero: carga })
    semErroDeSql(situacao)
    expect(situacao.error).not.toBeNull()
    const crn = await c.admin.cliente.rpc('decidir_crn', { p_usuario: c.admin.id, p_status: carga })
    semErroDeSql(crn)
    expect(crn.error).not.toBeNull()
    const comprovantes = await c.admin.cliente.rpc('marcar_comprovantes_apagados', { p_caminhos: [carga] })
    semErroDeSql(comprovantes)
  })
})

describe('CA-489: SQL injection no cadastro e no login', () => {
  it('CA-489: e-mail e senha com SQL injection no login não entram e não dão erro de SQL', async () => {
    const cliente = clienteSemSessao(ambienteLocal())
    for (const carga of CARGAS) {
      const r = await cliente.auth.signInWithPassword({ email: `${c.vitima.email}${carga}`, password: carga })
      expect(r.data.session).toBeNull()
      semErroDeSql(r)
      const so = await cliente.auth.signInWithPassword({ email: c.vitima.email, password: carga })
      expect(so.data.session).toBeNull()
      semErroDeSql(so)
    }
  })

  it('CA-489: o nome do cadastro com SQL injection vira o nome do perfil, como texto', async () => {
    const cliente = clienteSemSessao(ambienteLocal())
    const nome = "Robert'); DROP TABLE public.perfis; --"
    const email = `sqli.${Date.now()}@exemplo.com`
    const r = await cliente.auth.signUp({ email, password: `Senha-${Date.now()}`, options: { data: { situacao: 'estudante', nome } } })
    expect(r.error).toBeNull()
    const id = r.data.user?.id ?? ''
    const perfil = await c.servico.from('perfis').select('nome, situacao').eq('id', id).single()
    expect(perfil.data).toEqual({ nome, situacao: 'estudante' })
    const invalido = await cliente.auth.signUp({ email: "' OR '1'='1@exemplo.com", password: 'Senha-123456' })
    expect(invalido.data.user).toBeNull()
    semErroDeSql(invalido)
  })
})

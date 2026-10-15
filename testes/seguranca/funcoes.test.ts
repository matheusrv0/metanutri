// CA-488 (spec seguranca-lote-4): as funções do banco chamadas com os ids e tokens de outra conta, as
// funções do administrador por conta comum e sem login, e as funções que ninguém de fora chama.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { barrado, barradoOuVazio, fotografar, prepararCenario, recusadoCom, semNadaDaVitima, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'a função mudou dado da vítima ou do que é fechado').toBe(foto)
})

const quem = (): readonly [string, SupabaseClient][] => [
  ['outra conta', c.atacante.cliente],
  ['sem login', c.anonimo],
]

/** As nove funções do administrador, com argumentos que mirariam a vítima. */
const DO_ADMINISTRADOR = (): readonly [string, Readonly<Record<string, unknown>>][] => [
  ['pedidos_em_analise', {}],
  ['crn_para_conferir', {}],
  ['comprovantes_para_apagar', {}],
  ['painel_contas', {}],
  ['painel_historico_assinaturas', {}],
  ['painel_uso', {}],
  ['decidir_pedido', { p_pedido: c.vitima.pedidoId, p_aprovar: false, p_motivo: 'recusado pelo atacante' }],
  ['decidir_crn', { p_usuario: c.admin.id, p_status: 'nao_encontrado' }],
  ['marcar_comprovantes_apagados', { p_caminhos: [c.vitima.arquivo, c.vitima.segundoArquivo] }],
]

describe('controle: o administrador usa as funções dele', () => {
  it('a fila de pedidos do administrador traz o pedido da vítima (o ataque abaixo não é vazio)', async () => {
    const fila = await c.admin.cliente.rpc('pedidos_em_analise')
    expect(fila.error).toBeNull()
    expect(JSON.stringify(fila.data)).toContain(c.vitima.pedidoId)
    const contas = await c.admin.cliente.rpc('painel_contas')
    expect(JSON.stringify(contas.data)).toContain(c.vitima.id)
  })
})

describe('CA-488: conta comum e visitante sem login não usam funções do administrador', () => {
  it.each(['pedidos_em_analise', 'crn_para_conferir', 'comprovantes_para_apagar', 'painel_contas', 'painel_historico_assinaturas', 'painel_uso', 'decidir_pedido', 'decidir_crn', 'marcar_comprovantes_apagados'])(
    'CA-488: %s é recusada e não devolve nada',
    async (funcao) => {
      const args = DO_ADMINISTRADOR().find(([nome]) => nome === funcao)?.[1] ?? {}
      for (const [, cliente] of quem()) {
        const r = await cliente.rpc(funcao, args)
        barrado(r)
        semNadaDaVitima(c, r)
      }
    },
  )

  it('CA-488: eh_admin diz não para a conta comum e é fechada para quem não entrou', async () => {
    expect((await c.atacante.cliente.rpc('eh_admin')).data).toBe(false)
    barrado(await c.anonimo.rpc('eh_admin'))
  })
})

describe('CA-488: funções da conta chamadas com o que é de outra conta', () => {
  it('CA-488: fechar_aviso_estudante com o pedido aprovado da vítima não fecha o aviso dela', async () => {
    const r = await c.atacante.cliente.rpc('fechar_aviso_estudante', { p_pedido: c.vitima.pedidoAprovadoId })
    semNadaDaVitima(c, r)
    barrado(await c.anonimo.rpc('fechar_aviso_estudante', { p_pedido: c.vitima.pedidoAprovadoId }))
  })

  it.each([
    ['o arquivo da vítima', (): string => c.vitima.arquivo],
    ['um caminho com ".." até a pasta da vítima', (): string => `${c.atacante.id}/../${c.vitima.arquivo}`],
  ])('CA-488: enviar_pedido_estudante com %s é recusado', async (_caso, caminho) => {
    const r = await c.atacante.cliente.rpc('enviar_pedido_estudante', {
      p_instituicao: 'Universidade do atacante',
      p_matricula: '999999',
      p_periodo: 2,
      p_formatura: '2030-12-01',
      p_arquivo: caminho(),
    })
    // A regra da própria função: o arquivo tem de estar na pasta de quem pede.
    recusadoCom(r, ['22023'])
    semNadaDaVitima(c, r)
    const usados = await c.servico.from('pedidos_estudante').select('usuario').like('arquivo', `%${c.vitima.id}%`)
    expect(usados.data?.every((p) => p.usuario === c.vitima.id)).toBe(true)
    barrado(await c.anonimo.rpc('enviar_pedido_estudante', { p_instituicao: 'x', p_matricula: '123', p_periodo: 1, p_formatura: '2030-12-01', p_arquivo: c.vitima.arquivo }))
  })

  it('CA-488: comprovantes_da_conta e conferir_envio_de_comprovante só falam da própria conta', async () => {
    // A vítima tem 2 arquivos; o atacante, 1.
    expect((await c.atacante.cliente.rpc('comprovantes_da_conta')).data).toBe(1)
    expect((await c.vitima.cliente.rpc('comprovantes_da_conta')).data).toBe(2)
    expect((await c.atacante.cliente.rpc('conferir_envio_de_comprovante')).data).toBe('ok')
    barrado(await c.anonimo.rpc('comprovantes_da_conta'))
    barrado(await c.anonimo.rpc('conferir_envio_de_comprovante'))
  })

  it('CA-488: informar_situacao e corrigir_crn só mexem na própria conta', async () => {
    // As duas só olham a conta de quem pede: aqui, a regra de cada uma recusa (situação já registrada; não é nutricionista).
    recusadoCom(await c.atacante.cliente.rpc('informar_situacao', { p_situacao: 'nutricionista', p_regiao: 6, p_numero: '123' }), ['P0001'])
    recusadoCom(await c.atacante.cliente.rpc('corrigir_crn', { p_regiao: 6, p_numero: '123' }), ['P0001'])
    for (const funcao of ['informar_situacao', 'corrigir_crn', 'me_formei']) {
      barrado(await c.anonimo.rpc(funcao, funcao === 'informar_situacao' ? { p_situacao: 'estudante', p_regiao: null, p_numero: null } : { p_regiao: 6, p_numero: '123' }))
    }
  })

  it('CA-488: missoes_por_token e marcar_missoes com token que não existe não acham nem mudam nada', async () => {
    for (const [, cliente] of quem()) {
      const lido = await cliente.rpc('missoes_por_token', { p_token: 'naoexiste12345' })
      barradoOuVazio(lido)
      const marcado = await cliente.rpc('marcar_missoes', { p_token: 'naoexiste12345', p_marcacoes: [{ dia: '2026-10-14', missoes: ['m1'] }] })
      semNadaDaVitima(c, marcado)
    }
  })

  it('CA-488: me_formei da outra conta mexe só nela', async () => {
    const r = await c.atacante.cliente.rpc('me_formei', { p_regiao: 6, p_numero: '54321' })
    expect(r.error).toBeNull()
    const vitima = await c.servico.from('perfis').select('situacao').eq('id', c.vitima.id).single()
    expect(vitima.data?.situacao).toBe('estudante')
  })
})

describe('CA-488: funções que ninguém de fora chama', () => {
  it.each([
    ['eh_email_de_faculdade', { email: 'alguem@gmail.com' }],
    ['crn_valido', { p_regiao: 6, p_numero: '123' }],
    ['anotar_chamada_da_cobranca', { p_conta: '', p_tipo: 'cartao', p_limite: 1000, p_desde: '2000-01-01T00:00:00Z' }],
    ['criar_perfil', {}],
    ['conferir_link_do_paciente', {}],
    ['registrar_mudanca_de_assinatura', {}],
    ['vagas_de_fundador_usadas', {}],
  ] as const)('CA-488: %s é recusada', async (funcao, args) => {
    const comConta = funcao === 'anotar_chamada_da_cobranca' ? { ...args, p_conta: c.vitima.id } : args
    // As fechadas dão "permission denied" (42501); as de gatilho e a que saiu nem aparecem na API (PGRST202).
    const esperado = ['eh_email_de_faculdade', 'crn_valido', 'anotar_chamada_da_cobranca'].includes(funcao) ? ['42501'] : ['PGRST202']
    for (const [, cliente] of quem()) {
      const r = await cliente.rpc(funcao, comConta)
      recusadoCom(r, esperado)
      semNadaDaVitima(c, r)
    }
  })
})

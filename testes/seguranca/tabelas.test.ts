// CA-488 (spec seguranca-lote-4): uma conta tentando ler, mudar, apagar e criar dado de outra, tabela por
// tabela, com o próprio login e sem login. Depois de cada ataque, o dado da vítima é lido com a chave de
// serviço e comparado com a foto de antes.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { barrado, barradoOuVazio, fotografar, prepararCenario, recusadoCom, semNadaDaVitima, TABELAS_DA_CONTA, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'o ataque mudou dado da vítima ou do que é fechado').toBe(foto)
})

/** Uma mudança que faria sentido em cada tabela: dar plano, aprovar, trocar o dono, etc. */
const MUDANCA: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  acompanhamentos: { nome: 'mudado pelo atacante', marcacoes: [] },
  copias: { aparelho: 'mudado pelo atacante', dados: { roubado: true } },
  assinaturas: { plano: 'pro', status: 'ativa', expira_em: null },
  perfis: { nome: 'mudado pelo atacante' },
  pedidos_estudante: { status: 'recusado', motivo: 'mudado pelo atacante' },
  assinaturas_historico: { plano: 'pro' },
  assinando_agora: { desde: '2020-01-01T00:00:00Z' },
  tentativas_de_cartao: { recusada: true },
  chamadas_da_cobranca: { tipo: 'conferir' },
}

/** Uma linha nova em nome da vítima, em cada tabela. */
function linhaEmNomeDa(conta: string, tabela: string): Readonly<Record<string, unknown>> {
  switch (tabela) {
    case 'acompanhamentos':
      return { id: crypto.randomUUID(), nutricionista_id: conta, token: `invasor${Date.now()}`, caso_id: 'x', nome: 'invasor' }
    case 'copias':
      return { nutricionista_id: conta, dados: { invasor: true } }
    case 'assinaturas':
      return { nutricionista_id: conta, plano: 'pro', status: 'ativa' }
    case 'perfis':
      return { id: conta, nome: 'invasor', situacao: 'estudante' }
    case 'pedidos_estudante':
      return { usuario: conta, instituicao: 'invasor', matricula: '123', periodo: 1, formatura: '2030-12-01', status: 'aprovado' }
    case 'assinaturas_historico':
      return { nutricionista_id: conta, plano: 'pro', status: 'ativa', valor_centavos: 0, preco_travado: false }
    case 'assinando_agora':
      return { nutricionista_id: conta }
    case 'tentativas_de_cartao':
      return { nutricionista_id: conta, recusada: true }
    case 'chamadas_da_cobranca':
      return { nutricionista_id: conta, tipo: 'cartao' }
    default:
      throw new Error(`tabela sem linha de ataque: ${tabela}`)
  }
}

const quem = (): readonly [string, SupabaseClient][] => [
  ['outra conta', c.atacante.cliente],
  ['sem login', c.anonimo],
]

describe('controle: o cenário não é vazio', () => {
  it.each([
    ['acompanhamentos', 'nutricionista_id'],
    ['copias', 'nutricionista_id'],
    ['assinaturas', 'nutricionista_id'],
    ['perfis', 'id'],
    ['pedidos_estudante', 'usuario'],
  ] as const)('a própria vítima lê a linha dela em %s com o mesmo filtro do ataque', async (tabela, dono) => {
    const r = await c.vitima.cliente.from(tabela).select('*').eq(dono, c.vitima.id)
    expect(r.error).toBeNull()
    expect(r.data?.length ?? 0).toBeGreaterThan(0)
  })

  it('a foto percebe quando o dado da vítima muda', async () => {
    await c.servico.from('acompanhamentos').update({ nome: 'mudou' }).eq('id', c.vitima.linkId)
    expect(await fotografar(c)).not.toBe(foto)
    await c.servico.from('acompanhamentos').update({ nome: `Paciente ${c.marcador}` }).eq('id', c.vitima.linkId)
  })
})

describe('CA-488: uma conta não lê, não muda, não apaga e não cria dado de outra (tabelas)', () => {
  describe.each(TABELAS_DA_CONTA.map((t) => [t.tabela, t.dono] as const))('%s', (tabela, dono) => {
    it(`CA-488: ${tabela}: ler tudo e ler a linha da vítima não traz nada dela`, async () => {
      for (const [, cliente] of quem()) {
        const tudo = await cliente.from(tabela).select('*')
        semNadaDaVitima(c, tudo)
        const daVitima = await cliente.from(tabela).select('*').eq(dono, c.vitima.id)
        barradoOuVazio(daVitima)
        semNadaDaVitima(c, daVitima)
      }
    })

    it(`CA-488: ${tabela}: mudar a linha da vítima não muda nada`, async () => {
      const mudanca = MUDANCA[tabela] ?? {}
      for (const [, cliente] of quem()) {
        const r = await cliente.from(tabela).update(mudanca).eq(dono, c.vitima.id).select()
        barradoOuVazio(r)
        semNadaDaVitima(c, r)
      }
    })

    it(`CA-488: ${tabela}: apagar a linha da vítima não apaga nada`, async () => {
      for (const [, cliente] of quem()) {
        const r = await cliente.from(tabela).delete().eq(dono, c.vitima.id).select()
        barradoOuVazio(r)
        semNadaDaVitima(c, r)
      }
    })

    it(`CA-488: ${tabela}: criar uma linha em nome da vítima é recusado`, async () => {
      for (const [, cliente] of quem()) {
        const r = await cliente.from(tabela).insert(linhaEmNomeDa(c.vitima.id, tabela)).select()
        barrado(r)
        semNadaDaVitima(c, r)
      }
    })
  })

  const FECHADAS: readonly (readonly [string, string, Readonly<Record<string, unknown>>])[] = [
    ['administradores', 'usuario', { usuario: '00000000-0000-0000-0000-000000000000' }],
    ['dominios_faculdade', 'dominio', { dominio: 'gmail.com' }],
    ['avisos_da_operadora', 'topico', { topico: 'invasor', resultado: 'invasor' }],
  ]
  describe.each(FECHADAS)('%s (só o servidor)', (tabela, coluna, linha) => {
    it(`CA-488: ${tabela}: ninguém de fora lê, muda, apaga ou cria`, async () => {
      for (const [, cliente] of quem()) {
        const lido = await cliente.from(tabela).select('*')
        barradoOuVazio(lido)
        semNadaDaVitima(c, lido)
        // Filtro que pega todas as linhas: sem filtro nenhum, o PostgREST recusa update e delete.
        barradoOuVazio(await cliente.from(tabela).update(linha).not(coluna, 'is', null).select())
        barradoOuVazio(await cliente.from(tabela).delete().not(coluna, 'is', null).select())
        barrado(await cliente.from(tabela).insert(linha).select())
      }
    })
  })
})

describe('CA-488: uma conta não se dá plano, aprovação nem papel de administrador', () => {
  it('CA-488: a conta não se dá o plano Pro (nem criando, nem mudando a própria assinatura)', async () => {
    barrado(await c.atacante.cliente.from('assinaturas').insert({ nutricionista_id: c.atacante.id, plano: 'pro', status: 'ativa' }).select())
    const servico = await c.servico.from('assinaturas').insert({ nutricionista_id: c.atacante.id, plano: 'free', status: 'pendente' })
    expect(servico.error).toBeNull()
    barradoOuVazio(await c.atacante.cliente.from('assinaturas').update({ plano: 'pro', status: 'ativa' }).eq('nutricionista_id', c.atacante.id).select())
    const depois = await c.servico.from('assinaturas').select('plano, status').eq('nutricionista_id', c.atacante.id).single()
    expect(depois.data).toEqual({ plano: 'free', status: 'pendente' })
  })

  it('CA-488: a conta não muda a própria situação nem confere o próprio CRN', async () => {
    barradoOuVazio(
      await c.atacante.cliente.from('perfis').update({ situacao: 'nutricionista', crn_regiao: 6, crn_numero: '1', crn_status: 'conferido', crn_declarado_em: new Date().toISOString() }).eq('id', c.atacante.id).select(),
    )
    const depois = await c.servico.from('perfis').select('situacao, crn_status').eq('id', c.atacante.id).single()
    expect(depois.data).toEqual({ situacao: 'estudante', crn_status: null })
  })

  it('CA-488: a conta não aprova o próprio pedido de estudante', async () => {
    const pedido = await c.atacante.cliente.rpc('enviar_pedido_estudante', {
      p_instituicao: 'Universidade do atacante',
      p_matricula: '999999',
      p_periodo: 2,
      p_formatura: '2030-12-01',
      p_arquivo: c.atacante.arquivo,
    })
    expect(pedido.error).toBeNull()
    barradoOuVazio(await c.atacante.cliente.from('pedidos_estudante').update({ status: 'aprovado', decidido_em: new Date().toISOString() }).eq('usuario', c.atacante.id).select())
    barrado(
      await c.atacante.cliente
        .from('pedidos_estudante')
        .insert({ usuario: c.atacante.id, instituicao: 'x', matricula: '123', periodo: 1, formatura: '2030-12-01', status: 'aprovado' })
        .select(),
    )
    const depois = await c.servico.from('pedidos_estudante').select('status').eq('usuario', c.atacante.id)
    expect(depois.data).toEqual([{ status: 'em_analise' }])
  })

  it('CA-488: a conta não se faz administradora nem põe domínio de faculdade', async () => {
    barrado(await c.atacante.cliente.from('administradores').insert({ usuario: c.atacante.id }).select())
    barrado(await c.atacante.cliente.from('dominios_faculdade').insert({ dominio: 'gmail.com' }).select())
    const eh = await c.atacante.cliente.rpc('eh_admin')
    expect(eh.data).toBe(false)
  })
})

describe('CA-488: a conta não toma o link nem a cópia de outra pelo próprio login', () => {
  it('CA-488: gravar por cima do link da vítima (mesmo id ou mesmo token) é recusado', async () => {
    const mesmoId = await c.atacante.cliente
      .from('acompanhamentos')
      .upsert({ id: c.vitima.linkId, nutricionista_id: c.atacante.id, token: `tomado${Date.now()}`, caso_id: 'x', nome: 'tomado' })
      .select()
    barrado(mesmoId)
    semNadaDaVitima(c, mesmoId)
    const mesmoToken = await c.atacante.cliente
      .from('acompanhamentos')
      .insert({ id: crypto.randomUUID(), nutricionista_id: c.atacante.id, token: c.vitima.token, caso_id: 'x', nome: 'tomado' })
      .select()
    // A linha seria do próprio atacante (a regra de dono deixa); quem barra é o token ser único. O link da
    // vítima fica igual (a foto confere).
    recusadoCom(mesmoToken, ['23505'])
    semNadaDaVitima(c, mesmoToken)
  })

  it('CA-488: passar o próprio link ou a própria cópia para o nome da vítima é recusado', async () => {
    barrado(await c.atacante.cliente.from('acompanhamentos').update({ nutricionista_id: c.vitima.id }).eq('id', c.atacante.linkId).select())
    barrado(await c.atacante.cliente.from('copias').update({ nutricionista_id: c.vitima.id }).eq('nutricionista_id', c.atacante.id).select())
    const proprio = await c.servico.from('acompanhamentos').select('nutricionista_id').eq('id', c.atacante.linkId).single()
    expect(proprio.data?.nutricionista_id).toBe(c.atacante.id)
  })

  it('CA-488: gravar por cima da cópia da vítima (upsert) é recusado', async () => {
    const r = await c.atacante.cliente.from('copias').upsert({ nutricionista_id: c.vitima.id, dados: { tomado: true } }).select()
    barrado(r)
    semNadaDaVitima(c, r)
  })
})

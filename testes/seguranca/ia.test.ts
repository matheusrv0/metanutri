// Spec assistente-ia (D-1318, D-1319; CA-2322 a CA-2324): o registro de uso da IA e as quatro funções do 016 no Supabase
// local. A tabela fechada para outra conta e para quem não entrou está em tabelas.test.ts (TABELAS_DA_CONTA), e a
// cascata ao excluir a conta, em exclusao.test.ts. Aqui: só o servidor chama as funções, duas abas não passam juntas do
// limite, a hora conta tudo, concluir vale uma vez e os usos velhos saem.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { barrado, fotografar, prepararCenario, semNadaDaVitima, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'o teste mudou dado da vítima ou do que é fechado').toBe(foto)
})

const UMA_HORA_MS = 60 * 60 * 1000
const inicioDoMes = (): string => new Date(Date.now() - 20 * 24 * UMA_HORA_MS).toISOString()

/** Apaga os usos do atacante, que é a conta dos testes daqui (a vítima fica intacta para a foto). */
async function limparAtacante(): Promise<void> {
  const r = await c.servico.from('uso_da_ia').delete().eq('nutricionista_id', c.atacante.id)
  expect(r.error).toBeNull()
}

const reservar = (limiteMes: number, limiteHora = 10, consentimento = true) =>
  c.servico.rpc('reservar_uso_da_ia', {
    p_conta: c.atacante.id,
    p_modo: 'gerar',
    p_consentimento: consentimento,
    p_limite_mes: limiteMes,
    p_inicio_mes: inicioDoMes(),
    p_limite_hora: limiteHora,
  })

type Linha = { readonly reserva: number | null; readonly motivo: string | null }
const linhaDe = (dados: unknown): Linha => {
  const [linha] = (dados ?? []) as readonly Linha[]
  if (!linha) throw new Error('reservar_uso_da_ia não devolveu linha')
  return linha
}

describe('CA-2322: só o servidor chama as funções da IA', () => {
  it.each([
    ['reservar_uso_da_ia', () => ({ p_conta: c.vitima.id, p_modo: 'gerar', p_consentimento: true, p_limite_mes: 99, p_inicio_mes: inicioDoMes(), p_limite_hora: 99 })],
    ['concluir_uso_da_ia', () => ({ p_reserva: 1, p_status: 'ok', p_modelo: 'x', p_entrada: 0, p_cache_gravados: 0, p_cache_lidos: 0, p_saida: 0, p_custo: 0, p_duracao: 0, p_custo_estimado: false })],
    ['uso_da_ia_no_mes', () => ({ p_conta: c.vitima.id, p_inicio_mes: inicioDoMes() })],
    ['custo_da_ia_desde', () => ({ p_desde: new Date(Date.now() - 24 * UMA_HORA_MS).toISOString() })],
    ['consentimento_ia_do_paciente', () => ({ p_conta: c.vitima.id, p_paciente: 'paciente-1' })],
  ] as const)('%s é recusada para outra conta e para quem não entrou', async (funcao, args) => {
    for (const cliente of [c.atacante.cliente, c.anonimo, c.vitima.cliente]) {
      const r = await cliente.rpc(funcao, args())
      barrado(r)
      semNadaDaVitima(c, r)
    }
  })
})

describe('CA-2399 e D-1347: a autorização do paciente, lida da ficha na cópia da conta', () => {
  const fichas = [
    { id: 'com-autorizacao', nome: 'Paciente A', consentimentoIa: { em: '2026-11-03', versao: 'ia-1' } },
    { id: 'sem-autorizacao', nome: 'Paciente B', consentimentoIa: null },
    { id: 'data-estragada', nome: 'Paciente C', consentimentoIa: { em: 'ontem', versao: 'ia-1' } },
    { id: 'de-antes', nome: 'Paciente D' },
  ]
  const copiaCom = (pacientes: string) => ({ formato: 1, geradoEm: new Date().toISOString(), dados: { 'metanutri:pacientes': pacientes } })
  const autorizou = async (conta: string, paciente: string): Promise<unknown> => {
    const r = await c.servico.rpc('consentimento_ia_do_paciente', { p_conta: conta, p_paciente: paciente })
    expect(r.error).toBeNull()
    return r.data
  }
  const gravarCopiaDoAtacante = async (dados: unknown) => {
    const r = await c.servico.from('copias').update({ dados }).eq('nutricionista_id', c.atacante.id)
    expect(r.error).toBeNull()
  }

  it('só a ficha com consentimentoIa.em no formato AAAA-MM-DD autoriza', async () => {
    await gravarCopiaDoAtacante(copiaCom(JSON.stringify(fichas)))
    try {
      expect(await autorizou(c.atacante.id, 'com-autorizacao')).toBe(true)
      for (const id of ['sem-autorizacao', 'data-estragada', 'de-antes', 'nao-existe', "com-autorizacao' or '1'='1"]) expect(await autorizou(c.atacante.id, id)).toBe(false)
      // A ficha de uma conta não autoriza na outra.
      expect(await autorizou(c.vitima.id, 'com-autorizacao')).toBe(false)
    } finally {
      await gravarCopiaDoAtacante({ meu: true })
    }
  })

  it('a cópia sem fichas, com texto que não é JSON ou com outra forma dá falso, sem erro', async () => {
    try {
      for (const dados of [{ meu: true }, copiaCom('{isto não é json'), copiaCom('{"id":"com-autorizacao"}'), { formato: 1, dados: { 'metanutri:pacientes': 42 } }]) {
        await gravarCopiaDoAtacante(dados)
        expect(await autorizou(c.atacante.id, 'com-autorizacao')).toBe(false)
      }
      // A conta sem cópia nenhuma.
      expect(await autorizou('00000000-0000-4000-8000-00000000abcd', 'com-autorizacao')).toBe(false)
    } finally {
      await gravarCopiaDoAtacante({ meu: true })
    }
  })
})

describe('D-1318: a reserva', () => {
  it('CA-2323: cinco pedidos ao mesmo tempo com duas vagas no mês: só dois reservam', async () => {
    await limparAtacante()
    const respostas = await Promise.all(Array.from({ length: 5 }, () => reservar(2)))
    for (const r of respostas) expect(r.error).toBeNull()
    const linhas = respostas.map((r) => linhaDe(r.data))
    expect(linhas.filter((l) => l.reserva !== null)).toHaveLength(2)
    expect(linhas.filter((l) => l.motivo === 'limite-mes')).toHaveLength(3)
    const contagem = await c.servico.from('uso_da_ia').select('id', { count: 'exact', head: true }).eq('nutricionista_id', c.atacante.id)
    expect(contagem.count).toBe(2)
  })

  it('CA-2308: recusa e erro não contam no mês; a reserva presa há mais de 10 minutos também não', async () => {
    await limparAtacante()
    const antiga = new Date(Date.now() - 11 * 60 * 1000).toISOString()
    const semear = await c.servico.from('uso_da_ia').insert([
      { nutricionista_id: c.atacante.id, modo: 'gerar', status: 'recusa', consentimento_declarado: true, criado_em: antiga },
      { nutricionista_id: c.atacante.id, modo: 'gerar', status: 'erro', consentimento_declarado: true, criado_em: antiga },
      { nutricionista_id: c.atacante.id, modo: 'ajustar', status: 'reservado', consentimento_declarado: true, criado_em: antiga },
      { nutricionista_id: c.atacante.id, modo: 'gerar', status: 'ok', consentimento_declarado: true, criado_em: antiga },
    ])
    expect(semear.error).toBeNull()
    const mes = await c.servico.rpc('uso_da_ia_no_mes', { p_conta: c.atacante.id, p_inicio_mes: inicioDoMes() })
    expect(mes.data).toBe(1)
    expect(linhaDe((await reservar(2)).data).reserva).not.toBeNull()
    expect(linhaDe((await reservar(2)).data).motivo).toBe('limite-mes')
  })

  it('DP-IA-7 e CA-2309: na última hora conta todo pedido, com qualquer resultado', async () => {
    await limparAtacante()
    const agora = new Date().toISOString()
    await c.servico.from('uso_da_ia').insert([
      { nutricionista_id: c.atacante.id, modo: 'gerar', status: 'recusa', consentimento_declarado: true, criado_em: agora },
      { nutricionista_id: c.atacante.id, modo: 'gerar', status: 'erro', consentimento_declarado: true, criado_em: agora },
    ])
    expect(linhaDe((await reservar(40, 3)).data).reserva).not.toBeNull()
    expect(linhaDe((await reservar(40, 3)).data).motivo).toBe('limite-hora')
  })

  it('D-1304: sem a autorização do paciente, a reserva é recusada e nada é anotado', async () => {
    await limparAtacante()
    const r = await reservar(40, 10, false)
    expect(r.error?.code).toBe('22023')
    const contagem = await c.servico.from('uso_da_ia').select('id', { count: 'exact', head: true }).eq('nutricionista_id', c.atacante.id)
    expect(contagem.count).toBe(0)
  })

  it('CA-2324: a reserva apaga os usos de mais de 13 meses', async () => {
    await limparAtacante()
    const velho = new Date(Date.now() - 400 * 24 * UMA_HORA_MS).toISOString()
    await c.servico.from('uso_da_ia').insert({ nutricionista_id: c.atacante.id, modo: 'gerar', status: 'ok', consentimento_declarado: true, criado_em: velho })
    expect(linhaDe((await reservar(40)).data).reserva).not.toBeNull()
    const velhos = await c.servico.from('uso_da_ia').select('id').eq('nutricionista_id', c.atacante.id).lt('criado_em', new Date(Date.now() - 300 * 24 * UMA_HORA_MS).toISOString())
    expect(velhos.data).toEqual([])
  })
})

describe('CA-2324: concluir', () => {
  it('muda o uso reservado uma vez só, com tokens, custo e modelo; a segunda vez não muda nada', async () => {
    await limparAtacante()
    const reserva = linhaDe((await reservar(40)).data).reserva
    const concluir = (status: string, custo: number) =>
      c.servico.rpc('concluir_uso_da_ia', { p_reserva: reserva, p_status: status, p_modelo: 'claude-opus-5-5', p_entrada: 1500, p_cache_gravados: 0, p_cache_lidos: 10_000, p_saida: 6000, p_custo: custo, p_duracao: 70_000, p_custo_estimado: false })
    expect((await concluir('ok', 128_000)).data).toBe(true)
    expect((await concluir('erro', 1)).data).toBe(false)
    const linha = await c.servico.from('uso_da_ia').select('status, custo_microdolares, modelo, tokens_saida, concluido_em').eq('id', reserva).single()
    expect(linha.data).toMatchObject({ status: 'ok', custo_microdolares: 128_000, modelo: 'claude-opus-5-5', tokens_saida: 6000 })
    expect(linha.data?.concluido_em).not.toBeNull()
  })

  it('resultado desconhecido é recusado', async () => {
    const r = await c.servico.rpc('concluir_uso_da_ia', { p_reserva: 1, p_status: 'reservado', p_modelo: 'x', p_entrada: 0, p_cache_gravados: 0, p_cache_lidos: 0, p_saida: 0, p_custo: 0, p_duracao: 0, p_custo_estimado: false })
    expect(r.error?.code).toBe('22023')
  })
})

describe('CA-2382: a chamada cortada', () => {
  it('fica marcada como custo estimado, não conta no mês e entra no gasto do dia', async () => {
    await limparAtacante()
    const desde = new Date(Date.now() - 60 * 1000).toISOString()
    const antes = Number((await c.servico.rpc('custo_da_ia_desde', { p_desde: desde })).data)
    const reserva = linhaDe((await reservar(40)).data).reserva
    const r = await c.servico.rpc('concluir_uso_da_ia', { p_reserva: reserva, p_status: 'erro', p_modelo: 'claude-opus-5-5', p_entrada: 20_000, p_cache_gravados: 10_000, p_cache_lidos: 0, p_saida: 16_500, p_custo: 506_000, p_duracao: 110_000, p_custo_estimado: true })
    expect(r.data).toBe(true)
    const linha = await c.servico.from('uso_da_ia').select('status, custo_estimado').eq('id', reserva).single()
    expect(linha.data).toEqual({ status: 'erro', custo_estimado: true })
    expect(Number((await c.servico.rpc('custo_da_ia_desde', { p_desde: desde })).data) - antes).toBe(506_000)
    expect((await c.servico.rpc('uso_da_ia_no_mes', { p_conta: c.atacante.id, p_inicio_mes: inicioDoMes() })).data).toBe(0)
    await limparAtacante()
  })
})

describe('CA-2310: o gasto do dia', () => {
  it('soma o custo de todas as contas desde a data', async () => {
    await limparAtacante()
    const desde = new Date(Date.now() - 60 * 1000).toISOString()
    const antes = (await c.servico.rpc('custo_da_ia_desde', { p_desde: desde })).data as number
    await c.servico.from('uso_da_ia').insert({ nutricionista_id: c.atacante.id, modo: 'gerar', status: 'ok', consentimento_declarado: true, custo_microdolares: 250_000 })
    const depois = (await c.servico.rpc('custo_da_ia_desde', { p_desde: desde })).data as number
    expect(Number(depois) - Number(antes)).toBe(250_000)
    await limparAtacante()
  })
})

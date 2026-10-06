import {
  assinaturasPorPlano,
  cicloDe,
  daLinhaContaNoPainel,
  daLinhaMudanca,
  daLinhaUso,
  ehVerificada,
  filtrarContas,
  funilDe30Dias,
  marcasDoEixo,
  receitaNoHistorico,
  receitaPorMes,
  rendaMensal,
  resumirNegocio,
  situacoesDeAssinatura,
} from './negocio.ts'
import { AGORA, conta, mudanca, paga } from './negocio.test-utils.ts'

describe('leitura das linhas do banco', () => {
  it('lê uma conta com assinatura paga', () => {
    const lida = daLinhaContaNoPainel({
      id: 'u1',
      nome: ' Ana ',
      email: 'ana@exemplo.com',
      criada_em: '2026-09-20T12:00:00+00:00',
      email_confirmado_em: null,
      ultimo_login_em: '2026-10-01T10:00:00+00:00',
      situacao: 'nutricionista',
      crn_regiao: 6,
      crn_status: 'conferido',
      pedido_status: null,
      plano: 'pro',
      status: 'ativa',
      ciclo: 'anual',
      valor_centavos: 59900,
      preco_travado: true,
      expira_em: null,
      assinatura_atualizada_em: '2026-09-21T12:00:00+00:00',
    })
    expect(lida).toEqual({
      id: 'u1',
      nome: 'Ana',
      email: 'ana@exemplo.com',
      criadaEm: '2026-09-20T12:00:00+00:00',
      emailConfirmadoEm: null,
      ultimoLoginEm: '2026-10-01T10:00:00+00:00',
      situacao: 'nutricionista',
      crnRegiao: 6,
      crnStatus: 'conferido',
      pedidoStatus: null,
      assinatura: { plano: 'pro', status: 'ativa', ciclo: 'anual', valorCentavos: 59900, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00+00:00' },
    })
  })

  it('foco 4: a conta do dono, sem situação nem assinatura', () => {
    const lida = daLinhaContaNoPainel({ id: 'dono', nome: '', email: 'dono@exemplo.com', criada_em: '2026-10-02T12:00:00+00:00', situacao: null, plano: null, status: null })
    expect(lida?.nome).toBe('')
    expect(lida?.situacao).toBeNull()
    expect(lida?.crnStatus).toBeNull()
    expect(lida?.assinatura).toBeNull()
  })

  it('foco 3: valor fora da lista vira nulo, e linha sem id ou sem data é descartada', () => {
    const lida = daLinhaContaNoPainel({ id: 'u', criada_em: '2026-09-01T00:00:00Z', situacao: 'outra', crn_status: 'talvez', pedido_status: 'x', plano: 'ouro', status: 'ativa' })
    expect(lida?.situacao).toBeNull()
    expect(lida?.crnStatus).toBeNull()
    expect(lida?.pedidoStatus).toBeNull()
    expect(lida?.assinatura).toBeNull()
    expect(daLinhaContaNoPainel({ email: 'x@exemplo.com', criada_em: '2026-09-01T00:00:00Z' })).toBeNull()
    expect(daLinhaContaNoPainel({ id: 'u' })).toBeNull()
    expect(daLinhaContaNoPainel(null)).toBeNull()
  })

  it('lê uma mudança do histórico e o uso', () => {
    expect(
      daLinhaMudanca({ nutricionista_id: 'u1', plano: 'free', status: 'cancelada', ciclo: null, valor_centavos: 3490, preco_travado: false, quando: '2026-09-30T12:00:00+00:00' }),
    ).toEqual({ conta: 'u1', plano: 'free', status: 'cancelada', ciclo: null, valorCentavos: 3490, quando: '2026-09-30T12:00:00+00:00' })
    expect(daLinhaMudanca({ plano: 'solo', status: 'ativa' })).toBeNull()
    expect(daLinhaUso([{ links_30_dias: 58, copias_30_dias: 112 }])).toEqual({ links30Dias: 58, copias30Dias: 112 })
    expect(daLinhaUso(null)).toEqual({ links30Dias: 0, copias30Dias: 0 })
  })
})

describe('ciclo da assinatura (D-59)', () => {
  it('vem do banco quando existe', () => {
    expect(cicloDe('solo', 'anual', 3490)).toBe('anual')
  })

  it('foco 2: sem ciclo no banco, o preço do anual decide', () => {
    expect(cicloDe('solo', null, 29900)).toBe('anual')
    expect(cicloDe('pro', undefined, 59900)).toBe('anual')
    expect(cicloDe('pro', null, 6490)).toBe('mensal')
    expect(cicloDe('clinica', null, 14900)).toBe('mensal')
  })

  it('CB-84: valor que não bate com preço nenhum fica mensal e rende o valor cobrado', () => {
    expect(cicloDe('solo', null, 3990)).toBe('mensal')
    expect(rendaMensal(paga('solo', 'mensal', 3990))).toBe(3990)
  })

  it('plano que não é pago não tem ciclo', () => {
    expect(cicloDe('estudante', 'mensal', 0)).toBeNull()
    expect(cicloDe('free', null, 0)).toBeNull()
  })
})

describe('resumo do negócio (CA-346 a CA-348, D-57)', () => {
  it('soma só plano pago ativo, com o anual dividido por 12', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { assinatura: paga('solo', 'anual', 29900) }),
      conta('c', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
      conta('d', {
        situacao: 'estudante',
        crnRegiao: null,
        crnStatus: null,
        assinatura: { plano: 'estudante', status: 'ativa', ciclo: null, valorCentavos: 0, expiraEm: '2027-07-01T00:00:00Z', atualizadaEm: '2026-09-01T00:00:00Z' },
      }),
      conta('e'),
    ]
    const resumo = resumirNegocio(contas, [], AGORA)
    expect(resumo.receitaCentavos).toBeCloseTo(3490 + 29900 / 12, 6)
    expect(resumo.assinaturasAtivas).toBe(2)
    expect(resumo.parteQuePaga).toBeCloseTo(2 / 5)
    expect(resumo.contas).toBe(5)
  })

  it('CA-346: a diferença compara com a receita de 30 dias antes, pelo histórico', () => {
    const contas = [conta('a', { assinatura: paga('solo', 'mensal', 3490) }), conta('b', { assinatura: paga('pro', 'mensal', 6490) })]
    const historico = [mudanca('a', '2026-08-01T12:00:00Z'), mudanca('b', '2026-09-25T12:00:00Z', { plano: 'pro', valorCentavos: 6490 })]
    expect(resumirNegocio(contas, historico, AGORA).diferenca30DiasCentavos).toBe(6490)
  })

  it('CB-81: histórico com menos de 30 dias conta desde o começo (antes dele, zero)', () => {
    const contas = [conta('a', { assinatura: paga('solo', 'mensal', 3490) })]
    expect(resumirNegocio(contas, [mudanca('a', '2026-09-28T12:00:00Z')], AGORA).diferenca30DiasCentavos).toBe(3490)
  })

  it('CA-348: contas novas são as criadas nos últimos 30 dias', () => {
    const contas = [conta('a', { criadaEm: '2026-09-03T12:00:00Z' }), conta('b', { criadaEm: '2026-09-01T12:00:00Z' })]
    expect(resumirNegocio(contas, [], AGORA).contasNovas30Dias).toBe(1)
  })

  it('CA-388: o resumo não conta vagas de fundador', () => {
    const resumo = resumirNegocio([conta('a', { assinatura: paga('solo', 'mensal', 3490) })], [], AGORA)
    expect(Object.keys(resumo).sort()).toEqual(['assinaturasAtivas', 'contas', 'contasNovas30Dias', 'diferenca30DiasCentavos', 'parteQuePaga', 'receitaCentavos'])
  })

  it('sem conta nenhuma, a parte que paga é nula, não NaN', () => {
    expect(resumirNegocio([], [], AGORA).parteQuePaga).toBeNull()
  })

  it('cancelamento derruba a receita a partir dele', () => {
    const historico = [mudanca('a', '2026-08-10T12:00:00Z'), mudanca('a', '2026-09-15T12:00:00Z', { plano: 'free', status: 'cancelada', ciclo: null })]
    expect(receitaNoHistorico(historico, Date.parse('2026-08-31T12:00:00Z'))).toBe(3490)
    expect(receitaNoHistorico(historico, Date.parse('2026-09-30T12:00:00Z'))).toBe(0)
  })
})

describe('receita por mês (CA-350)', () => {
  const historico = [
    mudanca('a', '2026-07-10T12:00:00Z'),
    mudanca('b', '2026-08-20T12:00:00Z', { plano: 'pro', valorCentavos: 6490 }),
    mudanca('a', '2026-09-15T12:00:00Z', { plano: 'free', status: 'cancelada', ciclo: null }),
  ]

  it('começa no primeiro mês do histórico e termina no mês atual, que usa a receita de agora', () => {
    expect(receitaPorMes(historico, 6490, AGORA).map((b) => [b.chave, b.mes, b.centavos, b.atual])).toEqual([
      ['2026-07', 'jul', 3490, false],
      ['2026-08', 'ago', 3490 + 6490, false],
      ['2026-09', 'set', 6490, false],
      ['2026-10', 'out', 6490, true],
    ])
  })

  it('mostra no máximo 6 meses', () => {
    const barras = receitaPorMes([mudanca('a', '2025-01-10T12:00:00Z')], 3490, AGORA)
    expect(barras).toHaveLength(6)
    expect(barras[0]?.chave).toBe('2026-05')
    expect(barras.at(-1)?.chave).toBe('2026-10')
  })

  it('CB-80: sem histórico, só o mês atual', () => {
    expect(receitaPorMes([], 0, AGORA)).toEqual([{ chave: '2026-10', mes: 'out', centavos: 0, atual: true }])
  })

  it('CB-85 e foco 1: a virada do mês é meia-noite de Brasília, não de UTC', () => {
    // 01/10 às 02h50 em UTC ainda é 30/09 às 23h50 em Brasília: conta para setembro.
    const barras = receitaPorMes([mudanca('a', '2026-10-01T02:50:00Z')], 3490, AGORA)
    expect(barras.map((b) => [b.chave, b.centavos])).toEqual([
      ['2026-09', 3490],
      ['2026-10', 3490],
    ])
  })

  it('CB-85: mudança à 00h de 01/10 em Brasília (03h UTC) já é de outubro e não conta para setembro', () => {
    const barras = receitaPorMes([mudanca('a', '2026-08-10T12:00:00Z'), mudanca('b', '2026-10-01T03:00:00Z')], 6980, AGORA)
    expect(barras.map((b) => [b.chave, b.centavos])).toEqual([
      ['2026-08', 3490],
      ['2026-09', 3490],
      ['2026-10', 6980],
    ])
  })

  it('CB-85: a virada de dezembro para janeiro também é no horário de Brasília', () => {
    // 2027-01-01 02h UTC é 31/12/2026 23h em Brasília: conta para dezembro.
    const barras = receitaPorMes([mudanca('a', '2027-01-01T02:00:00Z')], 3490, new Date('2027-01-15T15:00:00Z'))
    expect(barras.map((b) => [b.chave, b.mes, b.centavos])).toEqual([
      ['2026-12', 'dez', 3490],
      ['2027-01', 'jan', 3490],
    ])
  })
})

describe('assinaturas por plano (CA-352, CA-353)', () => {
  it('agrupa por plano e ciclo, da que rende mais para a que rende menos, com a parte de cada uma', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('c', { assinatura: paga('pro', 'mensal', 6490) }),
      conta('d', { assinatura: paga('solo', 'anual', 29900) }),
      conta('e', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
    ]
    const linhas = assinaturasPorPlano(contas)
    expect(linhas.map((l) => [l.chave, l.plano, l.ciclo, l.quantidade, l.centavosPorMes])).toEqual([
      ['solo-mensal', 'solo', 'mensal', 2, 6980],
      ['pro-mensal', 'pro', 'mensal', 1, 6490],
      ['solo-anual', 'solo', 'anual', 1, 29900 / 12],
    ])
    expect(linhas[0]?.parte).toBeCloseTo(6980 / (6980 + 6490 + 29900 / 12))
  })

  it('sem assinatura paga, nenhuma linha', () => {
    expect(assinaturasPorPlano([conta('a')])).toEqual([])
  })

  it('conta pendentes, pausadas e canceladas nos últimos 30 dias', () => {
    const contas = [
      conta('a', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
      conta('b', { assinatura: paga('pro', 'mensal', 6490, { status: 'pausada' }) }),
      conta('c', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada', atualizadaEm: '2026-09-25T12:00:00Z' }) }),
      conta('d', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada', atualizadaEm: '2026-08-01T12:00:00Z' }) }),
    ]
    // Sem linha no histórico (assinatura de antes do 007), vale a atualizadaEm.
    expect(situacoesDeAssinatura(contas, [], AGORA)).toEqual({ pendentes: 1, pausadas: 1, canceladas30Dias: 1 })
  })

  it('M1: a cancelada conta pela mudança do histórico, não pela atualizadaEm que o webhook regrava', () => {
    const cancelada = (atualizadaEm: string) => paga('solo', 'mensal', 3490, { status: 'cancelada', atualizadaEm })
    const contas = [
      conta('a', { assinatura: cancelada('2026-09-30T12:00:00Z') }), // webhook avisou ontem, mas cancelou em agosto
      conta('b', { assinatura: cancelada('2026-08-01T12:00:00Z') }), // cancelou há uma semana
      conta('c', { assinatura: cancelada('2026-09-30T12:00:00Z') }), // cancelou, voltou e cancelou de novo há dias
    ]
    const sair = { status: 'cancelada' as const, plano: 'free' as const, ciclo: null }
    const historico = [
      mudanca('a', '2026-07-01T12:00:00Z'),
      mudanca('a', '2026-08-05T12:00:00Z', sair),
      mudanca('b', '2026-08-01T12:00:00Z'),
      mudanca('b', '2026-09-25T12:00:00Z', sair),
      mudanca('c', '2026-07-01T12:00:00Z'),
      mudanca('c', '2026-07-10T12:00:00Z', sair),
      mudanca('c', '2026-08-01T12:00:00Z'),
      mudanca('c', '2026-09-28T12:00:00Z', sair),
    ]
    expect(situacoesDeAssinatura(contas, historico, AGORA).canceladas30Dias).toBe(2)
  })
})

describe('funil dos últimos 30 dias (CA-354, D-62)', () => {
  it('conta cada etapa entre quem criou conta, com a parte sobre elas', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { crnStatus: 'em_conferencia', assinatura: paga('pro', 'mensal', 6490) }),
      conta('c', { situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'aprovado' }),
      conta('d', { emailConfirmadoEm: null, crnStatus: 'em_conferencia' }),
      conta('velha', { criadaEm: '2026-08-01T12:00:00Z', assinatura: paga('solo', 'mensal', 3490) }),
    ]
    expect(funilDe30Dias(contas, AGORA).map((e) => [e.chave, e.rotulo, e.quantidade, e.parte])).toEqual([
      ['criaram', 'criaram conta', 4, null],
      ['confirmaram', 'confirmaram o e-mail', 3, 0.75],
      ['verificadas', 'foram verificadas', 2, 0.5],
      ['assinaram', 'assinaram um plano pago', 2, 0.5],
    ])
  })

  it('CB-82: ninguém novo, zeros e nenhuma porcentagem', () => {
    expect(funilDe30Dias([], AGORA).map((e) => [e.quantidade, e.parte])).toEqual([
      [0, null],
      [0, null],
      [0, null],
      [0, null],
    ])
  })

  it('verificada é nutricionista com CRN conferido ou estudante com matrícula aprovada', () => {
    expect(ehVerificada(conta('x'))).toBe(true)
    expect(ehVerificada(conta('y', { crnStatus: 'nao_encontrado' }))).toBe(false)
    expect(ehVerificada(conta('z', { situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'em_analise' }))).toBe(false)
    expect(ehVerificada(conta('w', { situacao: null, crnRegiao: null, crnStatus: null }))).toBe(false)
  })
})

describe('lista de contas (CA-356, CA-360, CA-361)', () => {
  const contas = [
    conta('1', { nome: 'Júlia Martins', email: 'julia@ufrn.edu.br', situacao: 'estudante', crnRegiao: null, crnStatus: null, criadaEm: '2026-09-10T12:00:00Z' }),
    conta('2', { nome: 'Ana Souza', email: 'ana@gmail.com', criadaEm: '2026-09-30T12:00:00Z', assinatura: paga('pro', 'mensal', 6490) }),
    conta('3', { nome: 'Bruno Lima', email: 'bruno@gmail.com', criadaEm: '2026-09-20T12:00:00Z' }),
  ]

  it('a mais nova vem primeiro', () => {
    expect(filtrarContas(contas, 'todas', '').visiveis.map((c) => c.id)).toEqual(['2', '3', '1'])
  })

  it('cada grupo mostra só as suas, com o total do grupo', () => {
    expect(filtrarContas(contas, 'nutricionistas', '').visiveis.map((c) => c.id)).toEqual(['2', '3'])
    expect(filtrarContas(contas, 'estudantes', '').visiveis.map((c) => c.id)).toEqual(['1'])
    expect(filtrarContas(contas, 'assinantes', '')).toEqual({ visiveis: [contas[1]], totalDoGrupo: 1 })
  })

  it('a busca ignora maiúscula e acento, olha nome e e-mail, dentro do grupo', () => {
    expect(filtrarContas(contas, 'todas', 'JULIA').visiveis.map((c) => c.id)).toEqual(['1'])
    expect(filtrarContas(contas, 'todas', ' gmail ').visiveis.map((c) => c.id)).toEqual(['2', '3'])
    expect(filtrarContas(contas, 'estudantes', 'souza')).toEqual({ visiveis: [], totalDoGrupo: 1 })
  })

  it('M4: a busca não casa pedaços que atravessam o nome e o e-mail', () => {
    const outras = [conta('9', { nome: 'Maria Silva', email: 'ana@exemplo.com' })]
    expect(filtrarContas(outras, 'todas', 'silva ana').visiveis).toEqual([])
    expect(filtrarContas(outras, 'todas', 'silva').visiveis).toHaveLength(1)
    expect(filtrarContas(outras, 'todas', 'ana@').visiveis).toHaveLength(1)
  })
})

describe('eixo do gráfico', () => {
  it('zero e três degraus redondos que cobrem o maior valor, com piso de R$ 150', () => {
    expect(marcasDoEixo(123585)).toEqual([0, 50000, 100000, 150000])
    expect(marcasDoEixo(30000)).toEqual([0, 10000, 20000, 30000])
    expect(marcasDoEixo(0)).toEqual([0, 5000, 10000, 15000])
  })
})

import { canceladaNoPrazo, daLinhaAssinatura, podeAssinar, RECADO_STATUS, respostaDaVolta, SEM_ASSINATURA, temAssinaturaPaga } from './assinatura.ts'

describe('Ler a assinatura do banco', () => {
  it('assinatura ativa dá o plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativa' })).toEqual({ ...SEM_ASSINATURA, plano: 'pro', planoPedido: 'pro', status: 'ativa' })
  })

  it('assinatura pendente NÃO dá plano pago: criar e não pagar não libera nada', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'pendente' }).plano).toBe('free')
  })

  it.each(['pausada', 'cancelada'])('assinatura %s, sem data, volta para o Free', (status) => {
    expect(daLinhaAssinatura({ plano: 'solo', status }).plano).toBe('free')
  })

  it('status inventado não vira plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativíssima' })).toMatchObject({ plano: 'free', status: 'sem-assinatura' })
  })

  it('plano inventado com status ativo cai no Free', () => {
    expect(daLinhaAssinatura({ plano: 'ouro', status: 'ativa' }).plano).toBe('free')
  })

  it('linha vazia ou quebrada é sem assinatura', () => {
    expect(daLinhaAssinatura(null)).toEqual(SEM_ASSINATURA)
    expect(daLinhaAssinatura('nada')).toEqual(SEM_ASSINATURA)
    expect(daLinhaAssinatura({})).toEqual(SEM_ASSINATURA)
  })

  it('CA-388: a coluna antiga de preço travado é ignorada: não existe preço de fundador', () => {
    const lida = daLinhaAssinatura({ plano: 'solo', status: 'ativa', preco_travado: true })
    expect(lida).toEqual({ ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'ativa' })
    expect(Object.keys(lida)).not.toContain('precoTravado')
  })
})

describe('O cartão e a próxima cobrança (D-70)', () => {
  it('lê o ciclo, o valor, a bandeira, o final e a próxima cobrança', () => {
    const a = daLinhaAssinatura({
      plano: 'solo',
      status: 'ativa',
      ciclo: 'mensal',
      valor_centavos: 3490,
      cartao_bandeira: ' Mastercard ',
      cartao_final: '6351',
      proxima_cobranca: '2026-11-02T15:00:00+00:00',
    })
    expect(a).toMatchObject({ ciclo: 'mensal', valorCentavos: 3490, cartaoBandeira: 'Mastercard', cartaoFinal: '6351', proximaCobranca: '2026-11-02T15:00:00+00:00' })
  })

  it('foco 4: linha de antes do 008 (e do 007) lê nulos, sem quebrar', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', valor_centavos: 3490 })).toMatchObject({
      plano: 'solo',
      ciclo: null,
      cartaoBandeira: null,
      cartaoFinal: null,
      proximaCobranca: null,
    })
  })

  it('final que não tem 4 números, ciclo e valor estranhos e data quebrada viram nulo ou zero', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', cartao_final: '635', ciclo: 'semanal', valor_centavos: -1, proxima_cobranca: 'logo' })).toMatchObject({
      cartaoFinal: null,
      ciclo: null,
      valorCentavos: 0,
      proximaCobranca: null,
    })
  })
})

describe('Cancelada vale até o fim do período pago (CA-378, CB-94)', () => {
  const agora = new Date('2026-10-20T15:00:00Z')

  it('CA-378: cancelada com expira_em à frente continua no plano pago, marcada como cancelada', () => {
    const a = daLinhaAssinatura({ plano: 'solo', status: 'cancelada', expira_em: '2026-11-02T02:59:59.000Z' }, agora)
    expect(a).toMatchObject({ plano: 'solo', planoPedido: 'solo', status: 'cancelada' })
    expect(canceladaNoPrazo(a)).toBe(true)
    expect(temAssinaturaPaga(a)).toBe(true)
  })

  it('CA-378 e foco 1: vale até 23h59min59s de 1/11 em Brasília e volta ao Free no primeiro segundo de 2/11', () => {
    const linha = { plano: 'solo', status: 'cancelada', expira_em: '2026-11-02T02:59:59.000Z' }
    expect(daLinhaAssinatura(linha, new Date('2026-11-02T02:59:58Z')).plano).toBe('solo')
    expect(daLinhaAssinatura(linha, new Date('2026-11-02T03:00:00Z')).plano).toBe('free')
  })

  it('CB-94: cancelada sem data (a operadora cancelou sozinha) volta ao Free na hora', () => {
    const a = daLinhaAssinatura({ plano: 'pro', status: 'cancelada', expira_em: null }, agora)
    expect(a.plano).toBe('free')
    expect(canceladaNoPrazo(a)).toBe(false)
    expect(temAssinaturaPaga(a)).toBe(false)
  })

  it('só plano pago tem período a respeitar: Estudante cancelado não volta por engano', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'cancelada', expira_em: '2027-01-01T00:00:00Z' }, agora).plano).toBe('free')
  })

  it('ativa paga é assinatura paga; Estudante e pendente não', () => {
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'pro', status: 'ativa' }, agora))).toBe(true)
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-07-31T23:59:59Z' }, agora))).toBe(false)
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'solo', status: 'pendente' }, agora))).toBe(false)
  })
})

describe('Quais planos têm botão de assinar', () => {
  it('Solo e Pro sim', () => {
    expect(podeAssinar('solo')).toBe(true)
    expect(podeAssinar('pro')).toBe(true)
  })

  it('Clínica não: é conversa, não botão', () => {
    expect(podeAssinar('clinica')).toBe(false)
  })

  it('os grátis não', () => {
    expect(podeAssinar('free')).toBe(false)
    expect(podeAssinar('estudante')).toBe(false)
  })
})

describe('Recado de cada estado', () => {
  it('D-79: só pendente, pausada e vencida têm recado; nos outros, o selo e o cartão do plano já dizem tudo', () => {
    expect(RECADO_STATUS).toEqual({
      ativa: null,
      pendente: 'O banco ainda está confirmando o pagamento. Até lá, vale o Free.',
      pausada: 'A assinatura está pausada. Até ela voltar, vale o Free.',
      cancelada: null,
      vencida: 'Seu plano venceu e a conta voltou ao Free.',
      'sem-assinatura': null,
    })
  })

  it('pendente explica que ainda não vale', () => {
    expect(RECADO_STATUS.pendente).toContain('Free')
  })

  it('CA-381: nenhum recado cita o processador de pagamento', () => {
    for (const frase of Object.values(RECADO_STATUS)) expect(frase ?? '').not.toMatch(/mercado ?pago/i)
  })
})

describe('Estudante vence em 12 meses (CA-175)', () => {
  const agora = new Date('2027-10-01T00:00:00Z')

  it('dentro do prazo, vale o Estudante', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-12-01T00:00:00Z' }, agora).plano).toBe('estudante')
  })

  it('passou do prazo, volta ao Free e fica marcada como vencida', () => {
    const a = daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-09-01T00:00:00Z' }, agora)
    expect(a).toMatchObject({ plano: 'free', planoPedido: 'estudante', status: 'vencida', expiraEm: '2027-09-01T00:00:00Z' })
  })

  it('data quebrada não vence nem estoura', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: 'amanhã' }, agora).plano).toBe('estudante')
  })
})

describe('Resposta da volta do pagamento (CA-166 a CA-169)', () => {
  it.each([
    ['ativa', 'ativa'],
    ['pendente', 'analise'],
    ['cancelada', 'nao-concluido'],
    ['pausada', 'nao-concluido'],
    ['vencida', 'nao-concluido'],
    ['sem-assinatura', 'nao-concluido'],
  ] as const)('%s vira %s', (status, resposta) => {
    expect(respostaDaVolta({ ...SEM_ASSINATURA, status })).toBe(resposta)
  })
})

describe('A recusa e a última mensalidade (D-80, D-83)', () => {
  it('D-83 e D-80: lê a última mensalidade paga, quem encerrou e quando', () => {
    const a = daLinhaAssinatura({
      plano: 'solo',
      status: 'cancelada',
      ultima_cobranca_paga: '2026-10-02T13:00:00.000Z',
      encerrada_por: 'recusa',
      encerrada_em: '2026-11-02T13:00:00.000Z',
    })
    expect(a).toMatchObject({ ultimaCobrancaPaga: '2026-10-02T13:00:00.000Z', encerradaPor: 'recusa', encerradaEm: '2026-11-02T13:00:00.000Z' })
  })

  it('quem encerrou desconhecido e data quebrada viram nulo', () => {
    const a = daLinhaAssinatura({ plano: 'solo', status: 'cancelada', encerrada_por: 'banco', encerrada_em: 'ontem' })
    expect(a.encerradaPor).toBeNull()
    expect(a.encerradaEm).toBeNull()
  })

  it('linha de antes do 009 lê nulos, sem quebrar', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa' })).toMatchObject({ ultimaCobrancaPaga: null, encerradaPor: null, encerradaEm: null })
  })

  it('CA-392: cancelada por recusa, sem data, vale o Free na hora', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'cancelada', expira_em: null, encerrada_por: 'recusa' }).plano).toBe('free')
  })

  it('R12: a marca da recusa que sobrou numa linha ativa não tira o plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', encerrada_por: 'recusa' }).plano).toBe('solo')
  })
})

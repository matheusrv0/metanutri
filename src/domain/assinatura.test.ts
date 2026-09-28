import { daLinhaAssinatura, podeAssinar, RECADO_STATUS, respostaDaVolta, SEM_ASSINATURA } from './assinatura.ts'

describe('Ler a assinatura do banco', () => {
  it('assinatura ativa dá o plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativa' })).toEqual({ plano: 'pro', planoPedido: 'pro', status: 'ativa', precoTravado: false, expiraEm: null })
  })

  it('assinatura pendente NÃO dá plano pago: criar e não pagar não libera nada', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'pendente' }).plano).toBe('free')
  })

  it.each(['pausada', 'cancelada'])('assinatura %s volta para o Free', (status) => {
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

  it('guarda o preço travado de fundador', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', preco_travado: true }).precoTravado).toBe(true)
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', preco_travado: 'sim' }).precoTravado).toBe(false)
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
  it('todo estado tem uma frase, e nenhuma some', () => {
    for (const frase of Object.values(RECADO_STATUS)) expect(frase.length).toBeGreaterThan(10)
  })

  it('pendente explica que ainda não vale', () => {
    expect(RECADO_STATUS.pendente).toContain('Free')
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

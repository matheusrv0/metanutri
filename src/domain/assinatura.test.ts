import { daLinhaAssinatura, podeAssinar, RECADO_STATUS, SEM_ASSINATURA } from './assinatura.ts'

describe('Ler a assinatura do banco', () => {
  it('assinatura ativa dá o plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativa' })).toEqual({ plano: 'pro', status: 'ativa', precoTravado: false })
  })

  it('assinatura pendente NÃO dá plano pago: criar e não pagar não libera nada', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'pendente' }).plano).toBe('free')
  })

  it.each(['pausada', 'cancelada'])('assinatura %s volta para o Free', (status) => {
    expect(daLinhaAssinatura({ plano: 'solo', status }).plano).toBe('free')
  })

  it('status inventado não vira plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativíssima' })).toEqual(SEM_ASSINATURA)
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

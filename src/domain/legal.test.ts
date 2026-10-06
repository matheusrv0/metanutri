import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-391: os termos mudaram sem o preço de fundador, e a versão passa a ser a do dia da mudança', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-05')
    expect(DATA_TERMOS).toBe('5 de outubro de 2026')
  })
})

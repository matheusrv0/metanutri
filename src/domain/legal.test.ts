import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('D-118: a política ganhou a verificação contra robôs, e a versão passa a ser a do dia da publicação', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-07')
    expect(DATA_TERMOS).toBe('7 de outubro de 2026')
  })
})

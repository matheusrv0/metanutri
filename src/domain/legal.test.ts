import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-381 e CA-382: os termos e a política mudaram com o checkout próprio, e a data acompanha', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-02')
    expect(DATA_TERMOS).toBe('2 de outubro de 2026')
  })
})

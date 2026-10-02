import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-365: os termos e a política têm a data de 2 de outubro de 2026', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-02')
    expect(DATA_TERMOS).toBe('2 de outubro de 2026')
  })
})

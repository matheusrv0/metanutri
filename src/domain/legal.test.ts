import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('D-124 (spec dados-por-conta): a política ganhou os textos de apagar por conta, e a versão passa a ser a do dia da publicação', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-08')
    expect(DATA_TERMOS).toBe('8 de outubro de 2026')
  })
})

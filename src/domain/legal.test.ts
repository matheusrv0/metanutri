import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-994 (spec site-publico-profissional), depois do CA-827, CA-828 e CA-980: os Termos mudaram em 21/10/2026, e a data mostrada é a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-21')
    expect(DATA_TERMOS).toBe('21 de outubro de 2026')
  })
})

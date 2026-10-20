import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-827 e CA-828 (spec exclusao-de-conta) e CA-980 (spec integracao-rodada-1910): uma versão só, a de 20/10/2026, e a data mostrada é a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-20')
    expect(DATA_TERMOS).toBe('20 de outubro de 2026')
  })
})

import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-827 e CA-828 (spec exclusao-de-conta): a Política e os Termos mudaram com a exclusão da conta pelo site; a versão é a de 19/10/2026, e a data mostrada é a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-19')
    expect(DATA_TERMOS).toBe('19 de outubro de 2026')
  })
})
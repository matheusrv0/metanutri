import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-552 (spec dieta-no-link): a Política mudou com a dieta no link; a versão é a de 14/10/2026, e a data mostrada é a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-14')
    expect(DATA_TERMOS).toBe('14 de outubro de 2026')
  })
})

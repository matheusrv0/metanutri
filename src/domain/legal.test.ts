import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-552 (spec dieta-no-link) e CA-597 (spec anamnese-e-prescricoes): a Política mudou com a dieta no link e a ficha; a versão é a de 15/10/2026, e a data mostrada é a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-15')
    expect(DATA_TERMOS).toBe('15 de outubro de 2026')
  })
})
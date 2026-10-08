import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('DP-26 (spec dados-na-nuvem): o texto mudou de novo no mesmo dia; a versão é outra, e a data mostrada continua a do dia', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-08.2')
    expect(VERSAO_TERMOS).not.toBe('2026-10-08')
    expect(DATA_TERMOS).toBe('8 de outubro de 2026')
  })
})

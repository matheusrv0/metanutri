import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  // Spec separacao-site-app, DP-SA-34: o site da P2 foi ao ar em 27/10/2026 (previsto: 28/10). Publicando em outro dia, troca as duas
  // constantes de src/domain/legal.ts e este teste, e nada mais.
  it('CA-1462 (spec separacao-site-app): a Política mudou com o app em endereço próprio; a versão e a data mostrada são as do dia da P2', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-27')
    expect(DATA_TERMOS).toBe('27 de outubro de 2026')
  })
})

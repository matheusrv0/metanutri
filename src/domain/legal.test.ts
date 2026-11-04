import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  // Spec separacao-site-app, DP-SA-34: o site da P2 foi ao ar em 27/10/2026 (previsto: 28/10). Publicando em outro dia, troca as duas
  // constantes de src/domain/legal.ts e este teste, e nada mais.
  it('CA-2286 (spec lado-do-paciente): a Política mudou com o e-mail do paciente; a versão e a data mostrada sobem', () => {
    expect(VERSAO_TERMOS).toBe('2026-11-03')
    expect(DATA_TERMOS).toBe('3 de novembro de 2026')
  })
})

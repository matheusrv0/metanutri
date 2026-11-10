import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  // Spec assistente-ia, D-1323 e D-1353: os textos da IA foram aprovados pelo dono em 10/11/2026. Publicando em outro dia,
  // troca as duas constantes de src/domain/legal.ts e este teste, e nada mais.
  it('CA-2378 (spec assistente-ia): a Política e os Termos ganharam os textos da IA; a versão e a data mostrada são as da aprovação', () => {
    expect(VERSAO_TERMOS).toBe('2026-11-10')
    expect(DATA_TERMOS).toBe('10 de novembro de 2026')
  })
})

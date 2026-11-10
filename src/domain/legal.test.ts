import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  // Spec assistente-ia, D-1323 e D-1353, e spec lado-do-paciente, CA-2286: os textos da IA e os do paciente foram
  // aprovados pelo dono em 10/11/2026. Publicando em outro dia, troca as duas constantes de src/domain/legal.ts e este
  // teste, e nada mais.
  it('CA-2378 (spec assistente-ia) e CA-2286 (spec lado-do-paciente): a Política e os Termos ganharam os textos da IA e os do paciente; a versão e a data mostrada são as da aprovação', () => {
    expect(VERSAO_TERMOS).toBe('2026-11-10')
    expect(DATA_TERMOS).toBe('10 de novembro de 2026')
  })
})

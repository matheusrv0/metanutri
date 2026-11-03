import { LIMITE_DE_SUGESTOES_IA } from '../../supabase/functions/_shared/iaContrato.ts'
import { PLANOS } from './conta.ts'
import { limiteDoPlano, mesDe, textoDoContador, textoDoLimite, textoDaRenovacao } from './iaLimites.ts'

describe('spec assistente-ia, D-1318 e D-1321: os limites e os textos do uso', () => {
  it('CA-2307: toda assinatura de PLANOS tem limite, e o navegador usa a tabela da função', () => {
    for (const plano of PLANOS) expect(limiteDoPlano(plano.id)).toBe(LIMITE_DE_SUGESTOES_IA[plano.id])
    expect(PLANOS.map((p) => limiteDoPlano(p.id))).toEqual([3, 5, 20, 40, 40])
  })

  it('o mês de Brasília pelo nome', () => {
    expect(mesDe(new Date('2026-11-03T12:00:00Z'))).toBe('novembro')
    expect(mesDe(new Date('2026-12-01T02:00:00Z'))).toBe('novembro')
    expect(mesDe(new Date('2026-12-01T03:00:00Z'))).toBe('dezembro')
  })

  it('D-1321: o contador do rodapé', () => {
    expect(textoDoContador({ usados: 7, limite: 20, renovaEm: '2026-12-01' }, new Date('2026-11-03T12:00:00Z'))).toBe('7 de 20 sugestões em novembro')
    expect(textoDoContador({ usados: 0, limite: 3, renovaEm: '2026-12-01' }, new Date('2026-11-03T12:00:00Z'))).toBe('0 de 3 sugestões em novembro')
  })

  it('CA-2374: o limite atingido e a renovação', () => {
    expect(textoDoLimite({ usados: 20, limite: 20, renovaEm: '2026-12-01' }, new Date('2026-11-30T12:00:00Z'))).toBe(
      'As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro.',
    )
    expect(textoDaRenovacao('2027-01-01')).toBe('Renovam em 1º de janeiro')
  })
})

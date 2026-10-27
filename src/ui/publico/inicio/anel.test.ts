// CA-1662 e CA-1664 (spec landing-v3, D-656 e D-658): o anel da Adequação e o centro dele.
import { arcosDoAnel, centroDoAnel, resumoParaOLeitor } from './anel.ts'
import { META_DA_ADEQUACAO, NUTRIENTES_DO_EXEMPLO } from './exemploDaLanding.ts'

describe('arcosDoAnel', () => {
  it('CA-1664: a base é o percentual mostrado; a soma é (meta − base) × cobertura e começa onde a base termina', () => {
    expect(arcosDoAnel({ base: 64, meta: 90, cobre: 91 })).toEqual({ base: 64, soma: 23.7, giroDaSoma: 230.4, bolinha: { x: 214.1, y: 68.9 } })
  })

  it('CA-1664: com a cobertura toda, a soma chega exatamente na meta', () => {
    for (const nutriente of NUTRIENTES_DO_EXEMPLO) {
      const arcos = arcosDoAnel({ base: nutriente.pct, meta: META_DA_ADEQUACAO, cobre: 100 })
      expect(arcos.base + arcos.soma).toBeCloseTo(META_DA_ADEQUACAO, 5)
    }
  })

  it('CA-1664: a bolinha da meta fica a 90% da volta, no círculo de raio 104 em volta de (130, 130)', () => {
    const { bolinha } = arcosDoAnel({ base: 14, meta: 90, cobre: 19 })
    expect(Math.hypot(bolinha.x - 130, bolinha.y - 130)).toBeCloseTo(104, 0)
    // Antes de girar o desenho -90°, 90% da volta é 324°: à direita e acima do centro.
    expect(bolinha.x).toBeGreaterThan(130)
    expect(bolinha.y).toBeLessThan(130)
  })

  it('a soma nunca é negativa (a base já passou da meta)', () => {
    expect(arcosDoAnel({ base: 95, meta: 90, cobre: 50 }).soma).toBe(0)
  })
})

describe('centroDoAnel', () => {
  const [calcio] = NUTRIENTES_DO_EXEMPLO
  if (!calcio) throw new Error('sem o cálcio')

  it('CA-1662: com o iogurte, "ainda faltam 24,3 mg de 260 mg"', () => {
    const iogurte = calcio.sugestoes[calcio.escolhida]
    if (!iogurte) throw new Error('sem o iogurte')
    expect(centroDoAnel(calcio, iogurte)).toEqual({ rotulo: 'ainda faltam', valor: '24,3 mg', nota: 'de 260 mg' })
  })

  it('CA-1662: com a sardinha, que cobre 100%, "com 60 g, Meta atingida"', () => {
    const sardinha = calcio.sugestoes.find((s) => s.nome === 'Sardinha assada')
    if (!sardinha) throw new Error('sem a sardinha')
    expect(centroDoAnel(calcio, sardinha)).toEqual({ rotulo: 'com 60 g', valor: 'Meta', nota: 'atingida' })
  })
})

describe('resumoParaOLeitor', () => {
  const [calcio, , vitaminaD] = NUTRIENTES_DO_EXEMPLO
  if (!calcio || !vitaminaD) throw new Error('sem os nutrientes')

  it('CA-1665: o nutriente, a sugestão com os gramas e o que ainda falta, numa frase', () => {
    const iogurte = calcio.sugestoes[calcio.escolhida]
    if (!iogurte) throw new Error('sem o iogurte')
    expect(resumoParaOLeitor(calcio, iogurte)).toBe('Cálcio. Iogurte natural desnatado, 150 g: ainda faltam 24,3 mg de 260 mg.')
  })

  it('CA-1665: com a sugestão que cobre 100%, "meta atingida"', () => {
    const salmao = vitaminaD.sugestoes[vitaminaD.escolhida]
    if (!salmao) throw new Error('sem o salmão')
    expect(resumoParaOLeitor(vitaminaD, salmao)).toBe('Vitamina D. Filé de salmão fresco grelhado com pele, 90 g: meta atingida.')
  })
})

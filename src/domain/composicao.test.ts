import { calcularComposicao, completarBioimpedancia, DOBRAS_VAZIAS, siri, type EntradaComposicao } from './composicao.ts'

const base: EntradaComposicao = {
  protocolo: 'jackson-pollock-3',
  sexo: 'M',
  idadeAnos: 30,
  pesoKg: 80,
  dobras: { ...DOBRAS_VAZIAS, peitoral: 10, abdominal: 20, coxa: 12 },
}

describe('composição corporal', () => {
  it('Siri converte densidade em percentual de gordura', () => {
    expect(siri(1.07)).toBeCloseTo(12.62, 1)
    expect(siri(1.05)).toBeCloseTo(21.43, 1)
  })

  it('Jackson e Pollock de 3 dobras, homem: soma 42 mm aos 30 anos', () => {
    const r = calcularComposicao(base)
    // densidade 1,06976 → 12,7% de gordura
    expect(r.gorduraPct).toBeCloseTo(12.7, 1)
    expect(r.massaGordaKg).toBeCloseTo(10.2, 1)
    expect(r.massaMagraKg).toBeCloseTo(69.8, 1)
    expect(r.protocolo).toContain('Jackson')
    expect(r.fonte).toContain('Br J Nutr 1978')
  })

  it('Jackson e Pollock usa outras dobras na mulher', () => {
    const r = calcularComposicao({
      ...base,
      sexo: 'F',
      dobras: { ...DOBRAS_VAZIAS, tricipital: 18, suprailiaca: 20, coxa: 25 },
    })
    expect(r.gorduraPct).toBeGreaterThan(20)
    expect(r.gorduraPct).toBeLessThan(35)
    expect(r.motivoSemCalculo).toBeNull()
  })

  it('Faulkner soma quatro dobras e dispensa a idade', () => {
    const r = calcularComposicao({
      ...base,
      protocolo: 'faulkner-4',
      idadeAnos: null,
      dobras: { ...DOBRAS_VAZIAS, tricipital: 10, subescapular: 12, suprailiaca: 14, abdominal: 16 },
    })
    // (52 × 0,153) + 5,783 = 13,74
    expect(r.gorduraPct).toBeCloseTo(13.7, 1)
    expect(r.fonte).toContain('Faulkner')
  })

  it('diz exatamente qual dobra falta', () => {
    const r = calcularComposicao({ ...base, dobras: { ...DOBRAS_VAZIAS, peitoral: 10 } })
    expect(r.gorduraPct).toBeNull()
    expect(r.motivoSemCalculo).toContain('abdominal')
    expect(r.motivoSemCalculo).toContain('coxa')
  })

  it('recusa resultado fora do plausível em vez de mostrar número estranho', () => {
    const r = calcularComposicao({ ...base, dobras: { ...DOBRAS_VAZIAS, peitoral: 200, abdominal: 200, coxa: 200 } })
    expect(r.gorduraPct).toBeNull()
    expect(r.motivoSemCalculo).toContain('fora do plausível')
  })

  it('bioimpedância completa massa gorda e massa magra a partir do peso', () => {
    const r = completarBioimpedancia({ gorduraPct: 25, massaMagraKg: null, aguaPct: 55, aparelho: 'InBody' }, 80)
    expect(r.massaGordaKg).toBe(20)
    expect(r.massaMagraKg).toBe(60)
  })

  it('sem peso, a bioimpedância não inventa massa', () => {
    const r = completarBioimpedancia({ gorduraPct: 25, massaMagraKg: null, aguaPct: null, aparelho: '' }, null)
    expect(r.massaGordaKg).toBeNull()
  })
})

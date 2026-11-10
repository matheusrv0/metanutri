import { calcularComposicao, completarBioimpedancia, DOBRAS_VAZIAS, siri, type EntradaComposicao } from './composicao.ts'
import { calcularProtocolo } from './protocolosDeDobras.ts'

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

  // Revisão r1 (spec antropometria-telas, D-1520): a etapa 1 lê as dobras pela regra do motor (D-1039).
  it('CB-1480: JP 3 na mulher lê a suprailíaca da axilar anterior, a que a tela nova grava, e dá o número do motor', () => {
    const dobras = { ...DOBRAS_VAZIAS, tricipital: 20, suprailiacaAnt: 18, coxa: 25 }
    const r = calcularComposicao({ protocolo: 'jackson-pollock-3', sexo: 'F', idadeAnos: 34, pesoKg: 70, dobras })
    const motor = calcularProtocolo('jackson-pollock-3', { sexo: 'F', idadeAnos: 34, pesoKg: 70, estaturaCm: null, gestante: false }, dobras)
    // Σ 63 mm aos 34 anos: D = 1,0994921 − 0,0009929·63 + 0,0000023·63² − 0,0001392·34 = 1,041335; Siri 25,35%.
    expect(r.motivoSemCalculo).toBeNull()
    expect(r.gorduraPct).toBe(25.4)
    expect(motor.calculou && Math.round(motor.gorduraPct * 10) / 10).toBe(25.4)
  })

  it('CB-1481: o plano de antes, só com a suprailíaca de linha não informada, dá o mesmo número (CB-1400)', () => {
    const antes = calcularComposicao({ protocolo: 'jackson-pollock-3', sexo: 'F', idadeAnos: 34, pesoKg: 70, dobras: { ...DOBRAS_VAZIAS, tricipital: 20, suprailiaca: 18, coxa: 25 } })
    expect(antes.gorduraPct).toBe(25.4)
  })

  it('CB-1482: Faulkner com a suprailíaca da axilar média calcula com ela', () => {
    const r = calcularComposicao({ ...base, protocolo: 'faulkner-4', idadeAnos: null, dobras: { ...DOBRAS_VAZIAS, tricipital: 10, subescapular: 12, suprailiacaMed: 14, abdominal: 16 } })
    expect(r.gorduraPct).toBeCloseTo(13.7, 1)
  })

  it('CB-1480: a falta diz o nome da dobra, com a linha', () => {
    const r = calcularComposicao({ protocolo: 'jackson-pollock-3', sexo: 'F', idadeAnos: 34, pesoKg: 70, dobras: { ...DOBRAS_VAZIAS, tricipital: 20, coxa: 25 } })
    expect(r.motivoSemCalculo).toBe('Faltam dobras: suprailíaca (linha axilar anterior).')
  })
})

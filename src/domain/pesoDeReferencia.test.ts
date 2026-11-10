import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { compleicaoDoCaso, linhaCompleicao, pesoAjustado, pesoDeReferencia, pesoIdeal } from './pesoDeReferencia.ts'
import type { Caso, MedidasCorporais } from './tipos.ts'

const caso = (p: Partial<Caso> = {}, medidas: Partial<MedidasCorporais> = {}): Caso => {
  const vazio = criarCasoVazio('c')
  return { ...vazio, sexo: 'M', idadeAnos: 35, pesoKg: 70, estaturaCm: 170, ...p, medidasCorporais: { ...vazio.medidasCorporais, ...medidas } }
}
/** O punho que dá a razão estatura ÷ punho pedida, em 170 cm. */
const punhoPara = (r: number) => ({ punhoCm: 170 / r })

describe('compleição (spec antropometria-completa, CA-2047)', () => {
  it('CA-2047: homem, Grant versão A, r com 1 casa', () => {
    const r = (razao: number) => linhaCompleicao(caso({}, punhoPara(razao)))?.situacao?.rotulo
    expect(r(10.4)).toBe('Média')
    expect(r(10.5)).toBe('Pequena')
    expect(r(9.6)).toBe('Média')
    expect(r(9.5)).toBe('Grande')
    const l = linhaCompleicao(caso({}, punhoPara(10)))
    expect(l?.valor).toBeCloseTo(10, 10)
    expect(l?.situacao?.nivel).toBe('informativo')
    expect(l?.fonte?.curta).toBe(FONTES.grant1981.curta)
  })

  it('CA-2047: mulher, 11,0 / 10,1', () => {
    const r = (razao: number) => linhaCompleicao(caso({ sexo: 'F' }, punhoPara(razao)))?.situacao?.rotulo
    expect(r(11)).toBe('Média')
    expect(r(11.1)).toBe('Pequena')
    expect(r(10.1)).toBe('Média')
    expect(r(10)).toBe('Grande')
  })

  it('CB-1005: sem punho, diz que falta; abaixo de 20 anos, não vem', () => {
    expect(linhaCompleicao(caso())?.falta).toEqual([{ campo: 'medidasCorporais.punhoCm', nome: 'o punho' }])
    expect(linhaCompleicao(caso({ idadeAnos: 19 }, punhoPara(10)))).toBeNull()
    expect(compleicaoDoCaso(caso({}, punhoPara(9.5)))).toBe('grande')
  })
})

describe('peso ideal (spec antropometria-completa, CA-2048)', () => {
  it('CA-2048: adulto de 170 cm, compleição média ou sem compleição → 21,75 × 1,70² = 62,86 kg, com a faixa 53,47–72,22', () => {
    for (const medidas of [{}, punhoPara(10)]) {
      const pi = pesoIdeal(caso({}, medidas))
      if (!pi?.calculou) throw new Error('sem peso ideal')
      expect.soft(pi.imcAlvo).toBe(21.75)
      expect.soft(pi.pesoKg).toBeCloseTo(62.8575, 6)
      expect.soft(pi.faixaKg.min).toBeCloseTo(53.465, 6)
      expect.soft(pi.faixaKg.max).toBeCloseTo(72.2211, 6)
    }
    const semCompleicao = pesoIdeal(caso())
    expect(semCompleicao?.calculou && semCompleicao.origemDoImcAlvo).toBe('padrao-do-adulto')
    const comMedia = pesoIdeal(caso({}, punhoPara(10)))
    expect(comMedia?.calculou && comMedia.origemDoImcAlvo).toBe('compleicao')
  })

  it('CA-2048: compleição pequena 18,50 e grande 24,99; o IMC-alvo digitado manda', () => {
    const imc = (medidas: Partial<MedidasCorporais>, digitado: number | null = null) => {
      const pi = pesoIdeal(caso({}, medidas), digitado)
      return pi?.calculou ? pi.imcAlvo : null
    }
    expect(imc(punhoPara(10.5))).toBe(18.5)
    expect(imc(punhoPara(9.5))).toBe(24.99)
    expect(imc(punhoPara(9.5), 22)).toBe(22)
  })

  it('CA-2048: idoso de 170 cm → IMC 24,5 e a faixa de 22 a 27', () => {
    const pi = pesoIdeal(caso({ idadeAnos: 70 }))
    if (!pi?.calculou) throw new Error('sem peso ideal')
    expect(pi.imcAlvo).toBe(24.5)
    expect(pi.origemDoImcAlvo).toBe('padrao-do-idoso')
    expect(pi.pesoKg).toBeCloseTo(70.805, 6)
    expect(pi.faixaKg.min).toBeCloseTo(22 * 2.89, 10)
    expect(pi.faixaKg.max).toBeCloseTo(27 * 2.89, 10)
    expect([pi.faixaKg.minInclusivo, pi.faixaKg.maxInclusivo]).toEqual([false, false])
  })

  it('sem estatura, diz que falta; abaixo de 20 anos e na gestação, não vem', () => {
    expect(pesoIdeal(caso({ estaturaCm: null }))).toEqual({ calculou: false, falta: [{ campo: 'estaturaCm', nome: 'a estatura' }] })
    expect(pesoIdeal(caso({ idadeAnos: 18 }))).toBeNull()
    expect(pesoIdeal(caso({ sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 12, pesoPreGestacionalKg: 60 } }))).toBeNull()
  })
})

describe('peso ajustado e peso de referência (spec antropometria-completa, CA-2049 e CA-2050)', () => {
  it('CA-2049: 170 cm e 100 kg (IMC 34,6) → (100 − 72,25) × 0,25 + 72,25 = 79,19 kg', () => {
    const pa = pesoAjustado(caso({ pesoKg: 100 }))
    if (!pa?.calculou) throw new Error('sem peso ajustado')
    expect(pa.pesoNoImc25Kg).toBeCloseTo(72.25, 10)
    expect(pa.pesoKg).toBeCloseTo(79.1875, 10)
    expect(pa.fonte.curta).toBe(FONTES.pesoAjustado.curta)
  })

  it('CA-2049: abaixo de IMC 30 não se aplica; com a opção "acima de 27", IMC 28 já usa', () => {
    const imc28 = { pesoKg: 28 * 2.89 }
    expect(pesoAjustado(caso(imc28))).toBeNull()
    expect(pesoAjustado(caso(imc28), 27)?.calculou).toBe(true)
    expect(pesoAjustado(caso({ pesoKg: 27 * 2.89 }), 27)).toBeNull()
    expect(pesoAjustado(caso({ pesoKg: 30 * 2.89 }))?.calculou).toBe(true)
  })

  it('CA-2050: IMC < 30 → o peso atual; IMC ≥ 30 → peso ideal, ajustado e massa magra, sem escolha', () => {
    expect(pesoDeReferencia(caso())).toEqual({ sugerido: 'peso-atual', opcoes: [{ base: 'peso-atual', pesoKg: 70, motivo: null }], origemDoPercentual: null, avisos: [] })
    const obeso = pesoDeReferencia(caso({ pesoKg: 100 }))
    expect(obeso?.sugerido).toBeNull()
    expect(obeso?.opcoes.map((o) => o.base)).toEqual(['peso-ideal', 'peso-ajustado', 'massa-magra'])
    expect(obeso?.opcoes[0]?.pesoKg).toBeCloseTo(62.8575, 6)
    expect(obeso?.opcoes[1]?.pesoKg).toBeCloseTo(79.1875, 6)
    expect(obeso?.opcoes[2]).toEqual({ base: 'massa-magra', pesoKg: null, motivo: 'Sem % de gordura das dobras ou da bioimpedância.' })
    const comBio = caso({ pesoKg: 100, composicao: { ...criarCasoVazio('x').composicao, bioimpedancia: { gorduraPct: 35, massaMagraKg: null, aguaPct: null, aparelho: '' } } })
    expect(pesoDeReferencia(comBio)?.opcoes[2]?.pesoKg).toBeCloseTo(65, 10)
  })
})

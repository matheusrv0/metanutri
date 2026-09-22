import type { ResultadoMacro } from './macros.ts'
import { medirMacro, PERTO } from './medidorMacro.ts'

const pct = (pctKcal: number, min = 10, max = 35): ResultadoMacro => {
  const estado = pctKcal < min ? 'abaixo' : pctKcal > max ? 'acima' : 'dentro'
  return { gramas: 0, pctKcal, gPorKg: null, meta: { tipo: 'pct', min, max }, origemMeta: 'amdr', estado }
}

const gkg = (gPorKg: number, min = 1.2, max = 2): ResultadoMacro => {
  const estado = gPorKg < min ? 'abaixo' : gPorKg > max ? 'acima' : 'dentro'
  return { gramas: 0, pctKcal: 20, gPorKg, meta: { tipo: 'g_kg', min, max }, origemMeta: 'usuario', estado }
}

describe('Medidor de macro', () => {
  it('dentro da faixa: distância zero e frase curta', () => {
    const m = medirMacro(pct(21.3))
    expect(m?.estado).toBe('dentro')
    expect(m?.distancia).toBe(0)
    expect(m?.frase).toBe('Dentro da faixa')
  })

  it('abaixo e longe: diz quanto falta', () => {
    const m = medirMacro(pct(4))
    expect(m?.estado).toBe('abaixo')
    expect(m?.distancia).toBe(6)
    expect(m?.frase).toBe('Faltam 6 pontos para a faixa')
  })

  it('abaixo e perto: diz "quase lá"', () => {
    const m = medirMacro(pct(10 - PERTO['%'] + 0.5))
    expect(m?.frase).toMatch(/^Quase lá: faltam/)
  })

  it('acima e longe: diz quanto passou', () => {
    const m = medirMacro(pct(45))
    expect(m?.estado).toBe('acima')
    expect(m?.distancia).toBe(10)
    expect(m?.frase).toBe('10 pontos acima da faixa')
  })

  it('acima e perto: diz "passou de leve"', () => {
    const m = medirMacro(pct(36))
    expect(m?.frase).toMatch(/^Passou de leve/)
  })

  it('singular de um ponto', () => {
    expect(medirMacro(pct(9))?.frase).toBe('Quase lá: faltam 1 ponto')
  })

  it('em %, o trilho vai até 100 e a faixa fica onde a meta manda', () => {
    const m = medirMacro(pct(20, 10, 35))
    expect(m?.escala).toBe(100)
    expect(m?.faixaInicio).toBe(10)
    expect(m?.faixaFim).toBe(35)
    expect(m?.posicao).toBe(20)
  })

  it('em g/kg, o trilho vai até 1,6 vezes o máximo', () => {
    const m = medirMacro(gkg(1.5, 1.2, 2))
    expect(m?.unidade).toBe('g/kg')
    expect(m?.escala).toBeCloseTo(3.2, 5)
    expect(m?.faixaFim).toBeCloseTo(62.5, 5)
  })

  it('em g/kg a frase usa a unidade certa', () => {
    expect(medirMacro(gkg(0.9))?.frase).toBe('Faltam 0,3 g/kg para a faixa')
  })

  it('valor além do trilho não sai do trilho', () => {
    expect(medirMacro(pct(140))?.posicao).toBe(100)
  })

  it('sem meta ou sem valor, não há o que medir', () => {
    expect(medirMacro({ ...pct(20), meta: null, estado: null })).toBeNull()
    expect(medirMacro({ ...pct(20), pctKcal: null, estado: null })).toBeNull()
  })
})

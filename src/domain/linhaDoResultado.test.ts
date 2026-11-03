import { FONTES } from './fontesAntropometria.ts'
import { dentroDoIntervalo, medidaValida, naPrecisao, situacaoNaFaixa, type FaixaRotulada } from './linhaDoResultado.ts'

const IMC_ADULTO_TESTE: readonly FaixaRotulada[] = [
  { min: null, minInclusivo: false, max: 18.5, maxInclusivo: false, rotulo: 'Baixo peso', nivel: 'alterado' },
  { min: 18.5, minInclusivo: true, max: 25, maxInclusivo: false, rotulo: 'Eutrofia', nivel: 'adequado' },
  { min: 25, minInclusivo: true, max: null, maxInclusivo: false, rotulo: 'Sobrepeso', nivel: 'atencao' },
]

describe('naPrecisao (spec antropometria-completa, D-1001)', () => {
  it('CB-1004: o valor nas casas da tela é o mesmo que o Intl.NumberFormat mostra (até em 1,005 e 0,285)', () => {
    const tela = (v: number, casas: number) =>
      Number(new Intl.NumberFormat('en-US', { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: false }).format(v))
    for (const v of [24.996, 24.994, 0.8999, 0.885, 10.44, 1.005, 0.285, 13.739, 65.289, 107.6923]) {
      for (const casas of [0, 1, 2]) expect(naPrecisao(v, casas)).toBe(tela(v, casas))
    }
  })

  it('escore-z negativo também', () => {
    expect(naPrecisao(-2.004, 2)).toBe(-2)
    expect(naPrecisao(-1.996, 2)).toBe(-2)
  })
})

describe('situacaoNaFaixa (spec antropometria-completa, CA-2030)', () => {
  it('CA-2030 e CB-1004: a situação é decidida com o valor nas casas da tela', () => {
    expect(situacaoNaFaixa(24.994, 2, IMC_ADULTO_TESTE)?.rotulo).toBe('Eutrofia')
    expect(situacaoNaFaixa(24.996, 2, IMC_ADULTO_TESTE)?.rotulo).toBe('Sobrepeso')
    expect(situacaoNaFaixa(18.5, 2, IMC_ADULTO_TESTE)).toEqual({ rotulo: 'Eutrofia', nivel: 'adequado' })
    expect(situacaoNaFaixa(18.49, 2, IMC_ADULTO_TESTE)).toEqual({ rotulo: 'Baixo peso', nivel: 'alterado' })
  })

  it('limite inclusivo, exclusivo e aberto valem como escritos', () => {
    const idoso: readonly FaixaRotulada[] = [
      { min: null, minInclusivo: false, max: 22, maxInclusivo: true, rotulo: 'Baixo peso', nivel: 'alterado' },
      { min: 22, minInclusivo: false, max: 27, maxInclusivo: false, rotulo: 'Eutrofia', nivel: 'adequado' },
      { min: 27, minInclusivo: true, max: null, maxInclusivo: false, rotulo: 'Sobrepeso', nivel: 'atencao' },
    ]
    expect(situacaoNaFaixa(22, 2, idoso)?.rotulo).toBe('Baixo peso')
    expect(situacaoNaFaixa(22.01, 2, idoso)?.rotulo).toBe('Eutrofia')
    expect(situacaoNaFaixa(27, 2, idoso)?.rotulo).toBe('Sobrepeso')
  })

  it('valor fora de todas as faixas não lança: devolve null', () => {
    const so: readonly FaixaRotulada[] = [{ min: 0, minInclusivo: true, max: 1, maxInclusivo: true, rotulo: 'Dentro', nivel: 'adequado' }]
    expect(situacaoNaFaixa(2, 2, so)).toBeNull()
  })

  it('dentroDoIntervalo respeita os dois lados', () => {
    const fechado = { min: 1, minInclusivo: true, max: 2, maxInclusivo: true }
    const aberto = { min: 1, minInclusivo: false, max: 2, maxInclusivo: false }
    expect([dentroDoIntervalo(1, fechado), dentroDoIntervalo(2, fechado)]).toEqual([true, true])
    expect([dentroDoIntervalo(1, aberto), dentroDoIntervalo(2, aberto), dentroDoIntervalo(1.5, aberto)]).toEqual([false, false, true])
  })
})

describe('medidaValida (spec antropometria-completa, CB-1000)', () => {
  it('CB-1000: vazio, 0, negativo e não finito contam como não medido; nunca vira 0', () => {
    for (const v of [null, undefined, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) expect(medidaValida(v)).toBeNull()
    expect(medidaValida(12.5)).toBe(12.5)
  })
})

describe('fontes (spec antropometria-completa, D-1036)', () => {
  it('cada fonte tem a citação curta e a completa', () => {
    for (const [chave, fonte] of Object.entries(FONTES)) {
      expect.soft(fonte.curta.length, chave).toBeGreaterThan(3)
      expect.soft(fonte.citacao.length, chave).toBeGreaterThan(fonte.curta.length)
    }
  })

  it('as fontes do original lido trazem o DOI', () => {
    expect(FONTES.jacksonPollock1978.citacao).toContain('10.1079/BJN19780152')
    expect(FONTES.durninWomersley1974.citacao).toContain('10.1079/BJN19740060')
    expect(FONTES.frisancho1981.citacao).toContain('10.1093/ajcn/34.11.2540')
  })
})

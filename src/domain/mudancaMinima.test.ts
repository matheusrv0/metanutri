import { FONTES } from './fontesAntropometria.ts'
import { FATOR_DA_MMD, compararAvaliacoes, compararSomasDeDobras, mudancaMinimaDetectavel } from './mudancaMinima.ts'

describe('mudança mínima detectável (spec antropometria-completa, CA-2070)', () => {
  it('CA-2070: 1,96 × √2 ≈ 2,77', () => {
    expect(FATOR_DA_MMD).toBeCloseTo(2.7719, 4)
  })

  it('CA-2070: com o ETM padrão da ISAK nível 1, uma dobra de 100 mm → ETM 7,5 mm e MMD 20,79 mm; cintura de 90 cm → 1,35 e 3,74 cm', () => {
    const dobra = mudancaMinimaDetectavel(100, 'dobra')
    expect(dobra.etm).toBeCloseTo(7.5, 10)
    expect(dobra.mmd).toBeCloseTo(20.789, 3)
    expect(dobra.etmPadrao).toBe(true)
    const cintura = mudancaMinimaDetectavel(90, 'outra')
    expect(cintura.etm).toBeCloseTo(1.35, 10)
    expect(cintura.mmd).toBeCloseTo(3.742, 3)
  })

  it('CA-2070: com o ETM do avaliador de 5 mm → MMD 13,86 mm', () => {
    const r = mudancaMinimaDetectavel(100, 'dobra', 5)
    expect(r.mmd).toBeCloseTo(13.859, 3)
    expect(r.etmPadrao).toBe(false)
  })

  it('CA-2070: dobra anterior 102,5 e atual 97,5 (média 100) → −5 mm fica dentro do erro de medida', () => {
    const r = compararAvaliacoes(102.5, 97.5, 'dobra')
    expect(r?.diferenca).toBeCloseTo(-5, 10)
    expect(r?.mmd).toBeCloseTo(20.789, 3)
    expect(r?.interpretacao).toBe('dentro-do-erro')
    expect(r?.texto).toBe('Dentro do erro de medida: não interpretar como mudança.')
    expect(r?.fonte.curta).toBe(FONTES.mudancaMinima.curta)
  })

  it('CA-2070: variação igual à MMD → mudança provavelmente real; um pouco menor → dentro do erro', () => {
    const mmd = FATOR_DA_MMD * 2
    expect(compararAvaliacoes(10, 10 + mmd, 'outra', { etmDoAvaliador: 2 })?.interpretacao).toBe('provavelmente-real')
    expect(compararAvaliacoes(10, 10 - mmd, 'outra', { etmDoAvaliador: 2 })?.interpretacao).toBe('provavelmente-real')
    expect(compararAvaliacoes(10, 10 + mmd - 0.01, 'outra', { etmDoAvaliador: 2 })?.interpretacao).toBe('dentro-do-erro')
  })

  it('CA-2070: avaliadores diferentes → aviso', () => {
    expect(compararAvaliacoes(90, 88, 'outra', { avaliadoresDiferentes: true })?.avisos.join(' ')).toMatch(/outro avaliador/)
  })

  it('CB-1014: medida vazia ou zero → não calcula', () => {
    expect(compararAvaliacoes(null, 90, 'outra')).toBeNull()
    expect(compararAvaliacoes(0, 0, 'dobra')).toBeNull()
  })
})

describe('soma de dobras (spec antropometria-completa, revisão, CA-2081)', () => {
  const sete = Array.from({ length: 7 }, () => 100 / 7)

  it('CA-2081: o ETM da soma é √Σ ETM² das dobras, com 7,5% da média de cada uma', () => {
    const r = compararSomasDeDobras(sete, sete)
    expect(r?.etm).toBeCloseTo(Math.sqrt(7 * (0.075 * (100 / 7)) ** 2), 10)
    expect(r?.etm).toBeCloseTo(2.835, 3)
    expect(r?.mmd).toBeCloseTo(7.857, 3)
    expect(r?.mmd).toBeLessThan(mudancaMinimaDetectavel(100, 'dobra').mmd)
    expect(r?.diferenca).toBeCloseTo(0, 10)
    expect(r?.etmPadrao).toBe(true)
  })

  it('CA-2081: uma queda de 10 mm na soma de 7 dobras já passa da MMD', () => {
    const depois = sete.map((v) => v - 10 / 7)
    expect(compararSomasDeDobras(sete, depois)?.interpretacao).toBe('provavelmente-real')
    expect(compararSomasDeDobras(sete, sete.map((v) => v - 5 / 7))?.interpretacao).toBe('dentro-do-erro')
  })

  it('CA-2081: com o ETM do avaliador por dobra, ele entra', () => {
    const r = compararSomasDeDobras([10, 20], [12, 18], { etmPorDobra: [0.3, 0.4] })
    expect(r?.etm).toBeCloseTo(0.5, 10)
    expect(r?.etmPadrao).toBe(false)
  })

  it('CA-2081: dobra vazia ou listas de tamanhos diferentes → não calcula', () => {
    expect(compararSomasDeDobras([10, null], [12, 18])).toBeNull()
    expect(compararSomasDeDobras([10, 20], [12])).toBeNull()
    expect(compararSomasDeDobras([], [])).toBeNull()
  })
})

describe('proposta do app (spec antropometria-completa, revisão, CA-2083)', () => {
  it('CA-2083: o ETM padrão sobre a média e o ETM da soma avisam que são proposta do app', () => {
    expect(compararAvaliacoes(90, 88, 'outra')?.avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\)/)
    expect(compararSomasDeDobras([10, 20], [12, 18])?.avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\)/)
  })
})

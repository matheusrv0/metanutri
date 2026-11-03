import { FONTES } from './fontesAntropometria.ts'
import { FATOR_DA_MMD, compararAvaliacoes, mudancaMinimaDetectavel } from './mudancaMinima.ts'

describe('mudança mínima detectável (spec antropometria-completa, CA-2070)', () => {
  it('CA-2070: 1,96 × √2 ≈ 2,77', () => {
    expect(FATOR_DA_MMD).toBeCloseTo(2.7719, 4)
  })

  it('CA-2070: com o ETM padrão da ISAK nível 1, soma de 100 mm → ETM 7,5 mm e MMD 20,79 mm; cintura de 90 cm → 1,35 e 3,74 cm', () => {
    const soma = mudancaMinimaDetectavel(100, 'dobra')
    expect(soma.etm).toBeCloseTo(7.5, 10)
    expect(soma.mmd).toBeCloseTo(20.789, 3)
    expect(soma.etmPadrao).toBe(true)
    const cintura = mudancaMinimaDetectavel(90, 'outra')
    expect(cintura.etm).toBeCloseTo(1.35, 10)
    expect(cintura.mmd).toBeCloseTo(3.742, 3)
  })

  it('CA-2070: com o ETM do avaliador de 5 mm → MMD 13,86 mm', () => {
    const r = mudancaMinimaDetectavel(100, 'dobra', 5)
    expect(r.mmd).toBeCloseTo(13.859, 3)
    expect(r.etmPadrao).toBe(false)
  })

  it('CA-2070: soma anterior 102,5 e atual 97,5 (média 100) → −5 mm fica dentro do erro de medida', () => {
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

// Água pela fase de vida (spec ficha-unica, D-355, seção 4; CA-1082 e CA-1083).
import { FONTE_AGUA, metaDeAgua, textoDaMetaDeAgua } from './agua.ts'
import type { CondicaoFisiologica, Sexo } from './tipos.ts'

const nenhuma: CondicaoFisiologica = { tipo: 'nenhuma' }
const pessoa = (sexo: Sexo | null, idadeAnos: number | null, condicao: CondicaoFisiologica = nenhuma) => ({ sexo, idadeAnos, condicao })

describe('A AI de água da DRI por fase de vida (seção 4)', () => {
  it.each([
    ['1 a 3 anos', pessoa('F', 2), 1.3, 0.9, 'crianças de 1 a 3 anos'],
    ['4 a 8 anos', pessoa('F', 6), 1.7, 1.2, 'crianças de 4 a 8 anos'],
    ['meninos de 9 a 13', pessoa('M', 10), 2.4, 1.8, 'meninos de 9 a 13 anos'],
    ['meninas de 9 a 13', pessoa('F', 13), 2.1, 1.6, 'meninas de 9 a 13 anos'],
    ['rapazes de 14 a 18', pessoa('M', 16), 3.3, 2.6, 'rapazes de 14 a 18 anos'],
    ['moças de 14 a 18', pessoa('F', 18), 2.3, 1.8, 'moças de 14 a 18 anos'],
    ['homens de 19 ou mais', pessoa('M', 35), 3.7, 3.0, 'homens de 19 anos ou mais'],
    ['mulheres de 19 ou mais', pessoa('F', 68), 2.7, 2.2, 'mulheres de 19 anos ou mais'],
    ['gestantes', pessoa('F', 28, { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 }), 3.0, 2.3, 'gestantes'],
    ['lactantes', pessoa('F', 17, { tipo: 'lactante', mesesPosParto: 3 }), 3.8, 3.1, 'lactantes'],
  ])('%s', (_nome, perfil, total, bebidas, fase) => {
    expect(metaDeAgua(perfil)).toEqual({ totalL: total, bebidasL: bebidas, fase })
  })

  it('a criança de até 8 anos não precisa do sexo', () => {
    expect(metaDeAgua(pessoa(null, 6))?.bebidasL).toBe(1.2)
  })

  it('CA-1083: sem sexo (de 9 anos em diante) ou sem idade, não há meta', () => {
    expect(metaDeAgua(pessoa(null, 35))).toBeNull()
    expect(metaDeAgua(pessoa('F', null))).toBeNull()
    expect(metaDeAgua(pessoa('F', 0))).toBeNull()
  })

  it('a dica diz a água total, a parte em bebidas e a fase', () => {
    const meta = metaDeAgua(pessoa('F', 28))
    expect(meta && textoDaMetaDeAgua(meta)).toBe(
      'Referência de água da DRI para mulheres de 19 anos ou mais: 2,7 litros por dia, dos quais cerca de 2,2 litros em bebidas; o resto vem dos alimentos.',
    )
    expect(FONTE_AGUA).toContain('2005')
  })
})

// Spec antropometria-completa, CA-2044 e D-1037: as tabelas de Frisancho saem da pesquisa por script, sem redigitar.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extrair, type LinhaDePercentis, type TabelaDePercentis } from '../../scripts/dados/importar-frisancho.mjs'
import frisancho from './frisancho.json'

const copia = readFileSync(join(process.cwd(), 'dados-brutos', 'antropometria', 'frisancho-percentis.md'), 'utf8')

const TABELAS: readonly [string, TabelaDePercentis][] = [
  ['1990 CB', frisancho.frisancho1990.cb],
  ['1990 DCT', frisancho.frisancho1990.dct],
  ['1990 AMB corrigida', frisancho.frisancho1990.ambCorrigida],
  ['1990 AGB', frisancho.frisancho1990.agb],
  ['1981 CMB', frisancho.frisancho1981.cmb],
  ['1981 AMB', frisancho.frisancho1981.amb],
]

const linha = (tabela: TabelaDePercentis, sexo: 'M' | 'F', de: number): LinhaDePercentis => {
  const achada = tabela[sexo].find((l) => l.de === de)
  if (!achada) throw new Error(`sem a linha de ${de} anos`)
  return achada
}
const p1990 = (tabela: TabelaDePercentis, sexo: 'M' | 'F', de: number, percentil: number) =>
  linha(tabela, sexo, de).valores[frisancho.frisancho1990.percentis.indexOf(percentil)]
const p1981 = (tabela: TabelaDePercentis, sexo: 'M' | 'F', de: number, percentil: number) =>
  linha(tabela, sexo, de).valores[frisancho.frisancho1981.percentis.indexOf(percentil)]

describe('tabelas de Frisancho (spec antropometria-completa, CA-2044)', () => {
  it('D-1037: o JSON é exatamente o que o script extrai da cópia da pesquisa', () => {
    expect(extrair(copia)).toEqual({ frisancho1990: frisancho.frisancho1990, frisancho1981: frisancho.frisancho1981 })
  })

  it('CA-2044: cada linha é crescente, do P5 ao P95', () => {
    for (const [nome, tabela] of TABELAS) {
      for (const sexo of ['M', 'F'] as const) {
        for (const l of tabela[sexo]) {
          const crescente = l.valores.every((v, i) => i === 0 || v >= (l.valores[i - 1] ?? Number.NEGATIVE_INFINITY))
          expect.soft(crescente, `${nome} ${sexo} ${l.de}–${l.ate}`).toBe(true)
        }
      }
    }
  })

  it('CA-2044: as faixas vão de 1 a 74,9 anos, sem buraco nem sobreposição', () => {
    for (const [nome, tabela] of TABELAS) {
      for (const sexo of ['M', 'F'] as const) {
        const linhas = tabela[sexo]
        expect.soft(linhas[0]?.de, `${nome} ${sexo}`).toBe(1)
        expect.soft(linhas[linhas.length - 1]?.ate, `${nome} ${sexo}`).toBe(74.9)
        linhas.forEach((l, i) => {
          const anterior = linhas[i - 1]
          if (anterior) expect.soft(l.de - anterior.ate, `${nome} ${sexo} ${l.de}`).toBeCloseTo(0.1, 9)
        })
      }
    }
  })

  it('CA-2044: as células de Frisancho 1990 que a pesquisa resolveu (3.18.4) têm o valor adotado', () => {
    const { cb, dct, ambCorrigida, agb } = frisancho.frisancho1990
    expect(linha(cb, 'M', 2).valores).toEqual([14.3, 14.8, 15.1, 15.5, 16.3, 17.1, 17.6, 17.9, 18.6])
    expect(p1990(cb, 'M', 15, 85)).toBe(30.3)
    expect(p1990(cb, 'M', 15, 90)).toBe(31.2)
    expect(p1990(cb, 'M', 50, 25)).toBe(30.2)
    expect(p1990(cb, 'M', 65, 75)).toBe(33.2)
    expect(p1990(cb, 'F', 1, 90)).toBe(17.2)
    expect(p1990(cb, 'F', 13, 25)).toBe(22.5)
    expect(p1990(dct, 'M', 3, 50)).toBe(9.5)
    expect([18, 25, 30, 35].map((de) => p1990(dct, 'M', de, 95))).toEqual([23.5, 25, 25, 24.5])
    expect(p1990(dct, 'F', 18, 95)).toBe(36)
    expect(linha(dct, 'F', 70).valores).toEqual([11, 13.5, 15.5, 18, 24, 29.5, 32, 35, 38.5])
    expect(p1990(ambCorrigida, 'F', 45, 95)).toBe(56.1)
    expect(linha(agb, 'M', 12).valores).toEqual([4.7, 5.6, 6.3, 7.6, 11.3, 15.8, 21.1, 27.3, 35])
    expect(p1990(agb, 'M', 30, 85)).toBe(31.6)
    expect(p1990(agb, 'F', 14, 85)).toBe(29.5)
    expect(p1990(agb, 'F', 70, 15)).toBe(18.8)
  })

  it('CA-2044: a linha do homem de 30 a 34,9 anos que a spec usa (CA-2042 e CA-2043)', () => {
    expect(linha(frisancho.frisancho1990.ambCorrigida, 'M', 30).valores).toEqual([37.9, 40.9, 43.4, 47.3, 54.4, 63.2, 67.6, 70.8, 76.1])
    expect(p1990(frisancho.frisancho1990.agb, 'M', 30, 50)).toBe(18.4)
    expect(p1990(frisancho.frisancho1990.agb, 'M', 30, 75)).toBe(25.6)
    expect(p1990(frisancho.frisancho1990.cb, 'M', 30, 50)).toBe(32.5)
  })

  it('CA-2044: a CMB de 1981 tem o valor do original onde as reproduções erraram (3.17), em mm', () => {
    const { cmb } = frisancho.frisancho1981
    expect(cmb.unidade).toBe('mm')
    expect(p1981(cmb, 'M', 7, 95)).toBe(190)
    expect(p1981(cmb, 'F', 18, 25)).toBe(191)
    expect(p1981(cmb, 'M', 13, 75)).toBe(226)
    expect(p1981(cmb, 'M', 19, 5)).toBe(238)
    expect(p1981(cmb, 'F', 8, 90)).toBe(183)
    expect(p1981(cmb, 'F', 15, 50)).toBe(202)
    expect(p1981(cmb, 'F', 16, 50)).toBe(202)
    expect(p1981(cmb, 'M', 18, 25)).toBe(252)
    expect(p1981(cmb, 'M', 45, 90)).toBe(315)
    expect(p1981(cmb, 'M', 55, 5)).toBe(236)
    expect(p1981(cmb, 'M', 5, 50)).toBe(147)
    expect(p1981(cmb, 'F', 35, 90)).toBe(257)
  })

  it('a AMB corrigida cai aos 18 anos (a correção de Heymsfield só existe dali em diante, pesquisa 3.10)', () => {
    const { ambCorrigida } = frisancho.frisancho1990
    expect(p1990(ambCorrigida, 'M', 17, 50)).toBe(53.4)
    expect(p1990(ambCorrigida, 'M', 18, 50)).toBe(49.4)
    expect(p1990(ambCorrigida, 'F', 17, 50)).toBe(34.3)
    expect(p1990(ambCorrigida, 'F', 18, 50)).toBe(28.3)
  })
})

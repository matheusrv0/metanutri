import notasS2 from '../../dados-brutos/energia/ncbi-NBK591034-tabS2.html?raw'
import notasS4 from '../../dados-brutos/energia/ncbi-NBK591034-tabS4.html?raw'
import notasS5 from '../../dados-brutos/energia/ncbi-NBK591034-tabS5.html?raw'
import notasS6 from '../../dados-brutos/energia/ncbi-NBK591034-tabS6.html?raw'
import energia from './energia.json'

type Coef = { constante: number; idade: number; estatura: number; peso: number; gestacaoSemanas: number }
const eq = energia.equacoes as unknown as Record<string, Record<string, Coef> | Coef>

// Coeficientes digitados à mão a partir das tabelas S-2 a S-4 (NASEM 2023) em 15/09/2026.
const CONFERIDOS: ReadonlyArray<[grupo: string, categoria: string | null, esperado: Coef]> = [
  ['adulto-M', 'inativo', { constante: 753.07, idade: -10.83, estatura: 6.5, peso: 14.1, gestacaoSemanas: 0 }],
  ['adulto-M', 'ativo', { constante: 1004.82, idade: -10.83, estatura: 6.52, peso: 15.91, gestacaoSemanas: 0 }],
  ['adulto-M', 'muito-ativo', { constante: -517.88, idade: -10.83, estatura: 15.61, peso: 19.11, gestacaoSemanas: 0 }],
  ['adulto-F', 'pouco-ativo', { constante: 575.77, idade: -7.01, estatura: 6.6, peso: 12.14, gestacaoSemanas: 0 }],
  ['adulto-F', 'muito-ativo', { constante: 511.83, idade: -7.01, estatura: 9.07, peso: 12.56, gestacaoSemanas: 0 }],
  ['3-18-M', 'inativo', { constante: -447.51, idade: 3.68, estatura: 13.01, peso: 13.15, gestacaoSemanas: 0 }],
  ['3-18-M', 'pouco-ativo', { constante: 19.12, idade: 3.68, estatura: 8.62, peso: 20.28, gestacaoSemanas: 0 }],
  ['3-18-F', 'inativo', { constante: 55.59, idade: -22.25, estatura: 8.43, peso: 17.07, gestacaoSemanas: 0 }],
  ['3-18-F', 'muito-ativo', { constante: -709.59, idade: -22.25, estatura: 18.22, peso: 14.25, gestacaoSemanas: 0 }],
  ['crianca-1-2-M', null, { constante: -716.45, idade: -1, estatura: 17.82, peso: 15.06, gestacaoSemanas: 0 }],
  ['crianca-1-2-F', null, { constante: -69.15, idade: 80, estatura: 2.65, peso: 54.15, gestacaoSemanas: 0 }],
  ['gestacao', 'inativo', { constante: 1131.2, idade: -2.04, estatura: 0.34, peso: 12.15, gestacaoSemanas: 9.16 }],
  ['gestacao', 'ativo', { constante: -223.84, idade: -2.04, estatura: 13.23, peso: 8.15, gestacaoSemanas: 9.16 }],
]

const semTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, ' ')

describe('energia.json (NASEM 2023)', () => {
  it.each(CONFERIDOS)('%s · %s', (grupo, categoria, esperado) => {
    const g = eq[grupo]
    const coef = categoria === null ? g : (g as Record<string, Coef>)[categoria]
    expect(coef).toEqual(esperado)
  })

  it('todas as quatro categorias de atividade existem nos grupos com categoria', () => {
    for (const grupo of ['3-18-M', '3-18-F', 'adulto-M', 'adulto-F', 'gestacao']) {
      expect(Object.keys(eq[grupo] as Record<string, Coef>).sort()).toEqual(['ativo', 'inativo', 'muito-ativo', 'pouco-ativo'])
    }
  })

  it('custo de crescimento bate com as notas da tabela S-2', () => {
    const notas = semTags(notasS2)
    expect(notas).toContain('Energy cost of growth for boys: 3 y: 20 kcal/d; 4 to 8 y: 15 kcal/d; 9 to 13 y: 25 kcal/d.')
    expect(notas).toContain('Energy cost of growth for girls: 3 y: 15 kcal/d; 4 to 8 y: 15 kcal/d; 9 to 13 y: 30 kcal/d.')
    expect(notas).toContain('6 to 11.99 months: 20 kcal/d; 12 to 35.99 months: 15 kcal/d.')
    const kcal = (sexo: string, idade: number) =>
      energia.custoCrescimento.find((c) => c.sexo === sexo && idade >= c.idadeMin && idade <= c.idadeMax)?.kcal
    expect([kcal('M', 3), kcal('M', 6), kcal('M', 10), kcal('M', 16)]).toEqual([20, 15, 25, 20])
    expect([kcal('F', 2), kcal('F', 3), kcal('F', 6), kcal('F', 10), kcal('F', 16)]).toEqual([15, 15, 15, 30, 20])
  })

  it('depósito de energia na gestação bate com a nota da tabela S-4', () => {
    const notas = semTags(notasS4)
    expect(notas).toContain('+ 300 kcal/d for UW; + 200 kcal/d for NW; + 150 kcal/d for OW; –50 kcal/d for OB')
    expect(energia.gestacao.depositoPorImcPreGestacional).toEqual({ 'baixo-peso': 300, eutrofia: 200, sobrepeso: 150, obesidade: -50 })
  })

  it('custo de produção de leite bate com as notas das tabelas S-5 e S-6', () => {
    expect(semTags(notasS5)).toContain('exclusively breastfeeding 0 to 6 months postpartum: 540 kcal/d')
    expect(semTags(notasS5)).toContain('Energy mobilization estimated for women and girls exclusively breastfeeding 0 to 6 months postpartum: 140 kcal/d')
    expect(semTags(notasS6)).toContain('partially breastfeeding 7 to 12 months postpartum: 380 kcal/d')
    expect(energia.lactacao.exclusiva).toMatchObject({ producaoLeite: 540, mobilizacao: 140 })
    expect(energia.lactacao.parcial).toMatchObject({ producaoLeite: 380, mobilizacao: 0 })
  })

  it('declara a fonte', () => {
    expect(energia.fonte.url).toBe('https://www.ncbi.nlm.nih.gov/books/NBK591034/')
  })
})

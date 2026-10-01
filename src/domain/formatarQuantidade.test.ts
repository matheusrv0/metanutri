import { quantidadeNoPlano, valorDeReferencia } from './formatarQuantidade.ts'

describe('números da adequação (CA-339)', () => {
  it.each([
    [8.67, '8,7'],
    [0.78, '0,8'],
    [28.58, '28,6'],
    [99.96, '100'],
    [656.4, '656'],
    [2747.65, '2.748'],
    [0, '0,0'],
  ])('no plano: %f vira %s', (valor, texto) => {
    expect(quantidadeNoPlano(valor)).toBe(texto)
  })

  it('Foco de revisão 1: valor positivo que arredondaria para 0,0 não parece zero', () => {
    expect(quantidadeNoPlano(0.03)).toBe('< 0,1')
    expect(quantidadeNoPlano(0.05)).toBe('0,1')
  })

  it.each([
    [0.9, '0,9'],
    [1.1, '1,1'],
    [18, '18'],
    [1000, '1.000'],
    [2.4, '2,4'],
  ])('referência como publicada: %f vira %s', (valor, texto) => {
    expect(valorDeReferencia(valor)).toBe(texto)
  })
})

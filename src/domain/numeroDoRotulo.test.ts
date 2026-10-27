// Spec alimentos-e-gramaturas, D-497: o número como o rótulo brasileiro escreve, no formulário de Meus alimentos.
import { lerNumero } from './caso.ts'
import { lerNumeroDoRotulo } from './numeroDoRotulo.ts'

describe('lerNumeroDoRotulo (D-497)', () => {
  it('CA-1361: o ponto seguido de grupos de três algarismos é milhar; o outro ponto e a vírgula são decimais', () => {
    expect(lerNumeroDoRotulo('1.200')).toBe(1200)
    expect(lerNumeroDoRotulo('12.345,6')).toBe(12345.6)
    expect(lerNumeroDoRotulo('1.200,5')).toBe(1200.5)
    expect(lerNumeroDoRotulo('1.234.567')).toBe(1234567)
    expect(lerNumeroDoRotulo('2.2')).toBe(2.2)
    expect(lerNumeroDoRotulo('2,2')).toBe(2.2)
    expect(lerNumeroDoRotulo('0.500')).toBe(0.5)
    expect(lerNumeroDoRotulo('1.20')).toBe(1.2)
    expect(lerNumeroDoRotulo(' 15 ')).toBe(15)
    expect(lerNumeroDoRotulo('-1')).toBe(-1)
    expect(lerNumeroDoRotulo('0')).toBe(0)
  })

  it('CA-1362: o que não é número fica nulo (o formulário marca o campo); vazio é "não informado"', () => {
    for (const texto of ['Tr', 'tr', '3 g', 'abc', '1,234.5', '1.2.3', '12,', '-', '1.200.5']) expect(lerNumeroDoRotulo(texto), texto).toBeNull()
    expect(lerNumeroDoRotulo('')).toBeNull()
    expect(lerNumeroDoRotulo('   ')).toBeNull()
  })

  it('CB-463: a leitura do resto do app não muda ("70.500" continua decimal)', () => {
    expect(lerNumero('70.500')).toBe(70.5)
    expect(lerNumero('1.200')).toBe(1.2)
  })
})

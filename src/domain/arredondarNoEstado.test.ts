import { arredondarNoEstado } from './arredondarNoEstado.ts'

describe('arredondarNoEstado (spec painel-lateral-enxuto, D-209)', () => {
  it('CA-695: abaixo arredonda para baixo, acima para cima, dentro para o mais perto', () => {
    expect(arredondarNoEstado(89.6, 'abaixo')).toBe(89)
    expect(arredondarNoEstado(110.4, 'acima')).toBe(111)
    expect(arredondarNoEstado(89.6, 'dentro')).toBe(90)
    expect(arredondarNoEstado(110.4, 'dentro')).toBe(110)
  })

  it('sem estado, arredonda para o mais perto', () => {
    expect(arredondarNoEstado(47.5, null)).toBe(48)
    expect(arredondarNoEstado(47.4, null)).toBe(47)
  })

  it('número inteiro fica como está, em qualquer estado', () => {
    expect(arredondarNoEstado(90, 'abaixo')).toBe(90)
    expect(arredondarNoEstado(110, 'acima')).toBe(110)
  })
})

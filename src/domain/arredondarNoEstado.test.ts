import { arredondarNoEstado } from './arredondarNoEstado.ts'

const GASTO = { min: 90, max: 110 }

describe('arredondarNoEstado (spec painel-lateral-enxuto, D-211)', () => {
  it('CA-711: o sentido do estado só entra quando o arredondamento comum cruzaria o limite', () => {
    expect(arredondarNoEstado(89.6, 'abaixo', GASTO)).toBe(89)
    expect(arredondarNoEstado(110.4, 'acima', GASTO)).toBe(111)
    expect(arredondarNoEstado(125.2, 'acima', GASTO)).toBe(125)
    expect(arredondarNoEstado(70.6, 'abaixo', GASTO)).toBe(71)
  })

  it('CA-712: a adequação usa só o limite de baixo (a meta), e o macro a faixa da meta', () => {
    expect(arredondarNoEstado(89.6, 'abaixo', { min: 90 })).toBe(89)
    expect(arredondarNoEstado(72.7, 'abaixo', { min: 90 })).toBe(73)
    const gordura = { min: 20, max: 35 }
    expect(arredondarNoEstado(35.4, 'acima', gordura)).toBe(36)
    expect(arredondarNoEstado(40.2, 'acima', gordura)).toBe(40)
    expect(arredondarNoEstado(19.6, 'abaixo', gordura)).toBe(19)
    expect(arredondarNoEstado(15.6, 'abaixo', gordura)).toBe(16)
  })

  it('dentro da faixa, ou sem estado, arredonda para o mais perto', () => {
    expect(arredondarNoEstado(109.6, 'dentro', GASTO)).toBe(110)
    expect(arredondarNoEstado(90.4, 'dentro', GASTO)).toBe(90)
    expect(arredondarNoEstado(47.5, null, null)).toBe(48)
    expect(arredondarNoEstado(47.4, null, null)).toBe(47)
  })

  it('sem o limite do estado, fica o sentido do estado, que nunca desmente a cor', () => {
    expect(arredondarNoEstado(70.6, 'abaixo', null)).toBe(70)
    expect(arredondarNoEstado(125.2, 'acima', { min: 90 })).toBe(126)
  })

  it('número inteiro fica como está, em qualquer estado', () => {
    expect(arredondarNoEstado(89, 'abaixo', GASTO)).toBe(89)
    expect(arredondarNoEstado(111, 'acima', GASTO)).toBe(111)
  })
})

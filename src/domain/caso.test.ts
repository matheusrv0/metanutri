import { criarCasoVazio, lerNumero, validarCaso } from './caso.ts'
import type { Caso } from './tipos.ts'

const adulta = (parcial: Partial<Caso> = {}): Caso => ({
  ...criarCasoVazio('c1'),
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 68,
  estaturaCm: 165,
  ...parcial,
})

describe('lerNumero (CB-12)', () => {
  it.each([
    ['68,5', 68.5],
    ['68.5', 68.5],
    [' 70 ', 70],
    ['1.234,5', 1234.5],
    ['0', 0],
  ])('"%s" vira %s', (texto, esperado) => {
    expect(lerNumero(texto)).toBe(esperado)
  })

  it.each(['', '   ', 'abc', '12a', '1,2,3'])('"%s" não é número', (texto) => {
    expect(lerNumero(texto)).toBeNull()
  })
})

describe('validarCaso', () => {
  it('caso completo e plausível pode calcular energia', () => {
    const r = validarCaso(adulta())
    expect(r.erros).toEqual({})
    expect(r.faltando).toEqual([])
    expect(r.podeCalcular).toBe(true)
  })

  it('CB-01: campos vazios aparecem em `faltando` e bloqueiam o cálculo', () => {
    const r = validarCaso(adulta({ pesoKg: null, estaturaCm: null, sexo: null, idadeAnos: null }))
    expect(r.faltando).toEqual(['sexo', 'idadeAnos', 'pesoKg', 'estaturaCm'])
    expect(r.podeCalcular).toBe(false)
  })

  it('CB-02: idade menor que 1 ano é recusada', () => {
    const r = validarCaso(adulta({ idadeAnos: 0, idadeMesesAdicionais: 8, pesoKg: 8, estaturaCm: 70 }))
    expect(r.erros.idadeAnos).toMatch(/a partir de 1 ano/)
    expect(r.podeCalcular).toBe(false)
  })

  it('aceita criança de 1 ano', () => {
    const r = validarCaso(adulta({ idadeAnos: 1, pesoKg: 10, estaturaCm: 76 }))
    expect(r.erros).toEqual({})
    expect(r.podeCalcular).toBe(true)
  })

  it.each([
    [{ pesoKg: 4.9 }, 'pesoKg'],
    [{ pesoKg: 351 }, 'pesoKg'],
    [{ estaturaCm: 44 }, 'estaturaCm'],
    [{ estaturaCm: 251 }, 'estaturaCm'],
    [{ idadeAnos: 121 }, 'idadeAnos'],
    [{ idadeAnos: 30.5 }, 'idadeAnos'],
    [{ idadeMesesAdicionais: 12 }, 'idadeMesesAdicionais'],
    [{ circunferenciaCinturaCm: 10 }, 'circunferenciaCinturaCm'],
    [{ circunferenciaPanturrilhaCm: 100 }, 'circunferenciaPanturrilhaCm'],
  ] as const)('CB-03: %o é inválido em %s', (parcial, campo) => {
    const r = validarCaso(adulta(parcial))
    expect(r.erros[campo]).toBeDefined()
    expect(r.podeCalcular).toBe(false)
  })

  it('CB-02a: gestante do sexo masculino é recusada com motivo', () => {
    const r = validarCaso(adulta({ sexo: 'M', condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/sexo feminino/)
    expect(r.podeCalcular).toBe(false)
  })

  it.each([13, 51])('CB-02a: gestante com %i anos está fora das referências (14 a 50)', (idade) => {
    const r = validarCaso(adulta({ idadeAnos: idade, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/14 a 50 anos/)
  })

  it('CB-02a: lactante do sexo masculino é recusada', () => {
    const r = validarCaso(adulta({ sexo: 'M', condicao: { tipo: 'lactante', mesesPosParto: 3 } }))
    expect(r.erros.condicao).toMatch(/sexo feminino/)
  })

  it('CB-02b: gestante sem idade gestacional gera aviso, sem bloquear o cálculo básico', () => {
    const r = validarCaso(adulta({ condicao: { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: 60 } }))
    expect(r.avisos).toContain('Informe a idade gestacional para calcular o adicional de energia e o ganho de peso.')
    expect(r.erros).toEqual({})
    expect(r.podeCalcular).toBe(true)
  })

  it.each([0, 43])('semanas de gestação %i são inválidas', (semanas) => {
    const r = validarCaso(adulta({ condicao: { tipo: 'gestante', semanasGestacao: semanas, pesoPreGestacionalKg: 60 } }))
    expect(r.erros.condicao).toMatch(/1 a 42 semanas/)
  })

  it('lactante sem tempo pós-parto gera aviso', () => {
    const r = validarCaso(adulta({ condicao: { tipo: 'lactante', mesesPosParto: null } }))
    expect(r.avisos).toContain('Informe o tempo pós-parto para calcular o adicional de energia da lactação.')
  })
})

describe('criarCasoVazio', () => {
  it('começa sem dados numéricos e sem condição fisiológica', () => {
    const c = criarCasoVazio('abc')
    expect(c.id).toBe('abc')
    expect(c.pesoKg).toBeNull()
    expect(c.condicao).toEqual({ tipo: 'nenhuma' })
    expect(c.idadeMesesAdicionais).toBe(0)
  })
})

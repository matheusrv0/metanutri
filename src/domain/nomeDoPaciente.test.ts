import { nomeDoPacienteDoPlano, PACIENTE_SEM_NOME } from './nomeDoPaciente.ts'

describe('CA-1193 (spec textos-e-promessas, D-409): o nome que vai ao paciente', () => {
  it('com paciente vinculado, o nome do paciente, não o do plano', () => {
    expect(nomeDoPacienteDoPlano({ nome: 'Maria, 28 anos, gestante' }, { nome: 'Maria Silva' })).toBe('Maria Silva')
    expect(nomeDoPacienteDoPlano({ nome: 'Cópia do plano (cópia 2)' }, { nome: '  Maria Silva ' })).toBe('Maria Silva')
  })

  it('CB-380: sem paciente, ou com o nome dele vazio, o nome do plano', () => {
    expect(nomeDoPacienteDoPlano({ nome: 'Maria, 28 anos' }, null)).toBe('Maria, 28 anos')
    expect(nomeDoPacienteDoPlano({ nome: 'Maria, 28 anos' }, undefined)).toBe('Maria, 28 anos')
    expect(nomeDoPacienteDoPlano({ nome: 'Maria, 28 anos' }, { nome: '   ' })).toBe('Maria, 28 anos')
  })

  it('CB-380: sem os dois, nulo, e quem mostra usa "Paciente sem nome"', () => {
    expect(nomeDoPacienteDoPlano({ nome: ' ' }, { nome: '' })).toBeNull()
    expect(PACIENTE_SEM_NOME).toBe('Paciente sem nome')
  })
})

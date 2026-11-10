// Os endereços da antropometria (spec antropometria-telas, D-1401).
import { escreverRota, lerRota } from '../navegacao.ts'

describe('os endereços da antropometria (spec antropometria-telas, CA-2400 e CA-2401)', () => {
  it('CA-2400: a avaliação e o histórico de um plano têm endereço, de ida e volta', () => {
    expect(lerRota('#/antropometria/c1')).toEqual({ tela: 'antropometria', casoId: 'c1', vista: 'avaliacao' })
    expect(lerRota('#/antropometria/c1/historico')).toEqual({ tela: 'antropometria', casoId: 'c1', vista: 'historico' })
    expect(lerRota('#/antropometria/c1/qualquer')).toEqual({ tela: 'antropometria', casoId: 'c1', vista: 'avaliacao' })
    for (const rota of [
      { tela: 'antropometria', casoId: 'plano 1', vista: 'avaliacao' },
      { tela: 'antropometria', casoId: 'plano 1', vista: 'historico' },
    ] as const) {
      expect(lerRota(escreverRota(rota))).toEqual(rota)
    }
    expect(escreverRota({ tela: 'antropometria', casoId: 'c1', vista: 'avaliacao' })).toBe('#/antropometria/c1')
    expect(escreverRota({ tela: 'antropometria', casoId: 'c1', vista: 'historico' })).toBe('#/antropometria/c1/historico')
    expect(lerRota('#/antropometria')).toEqual({ tela: 'painel' })
  })

  it('CA-2401: a aba da ficha tem endereço próprio, e os outros campos da ficha continuam', () => {
    expect(lerRota('#/paciente/p1/antropometria')).toEqual({ tela: 'antropometria-do-paciente', pacienteId: 'p1' })
    expect(escreverRota({ tela: 'antropometria-do-paciente', pacienteId: 'p 1' })).toBe('#/paciente/p%201/antropometria')
    expect(lerRota('#/paciente/p1/telefone')).toEqual({ tela: 'paciente', pacienteId: 'p1', campo: 'telefone' })
    expect(lerRota('#/paciente/p1')).toEqual({ tela: 'paciente', pacienteId: 'p1' })
  })
})

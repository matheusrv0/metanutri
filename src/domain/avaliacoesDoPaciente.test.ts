// As avaliações de um paciente são os planos completos dele (spec antropometria-telas, D-1400, D-1401 e D-1404).
import { avaliacoesDoPaciente, avaliacaoMaisRecente, tipoDaAvaliacao } from './avaliacoesDoPaciente.ts'
import { criarCasoVazio } from './caso.ts'
import type { CasoSalvo } from './persistencia.ts'
import type { Caso } from './tipos.ts'

const salvo = (id: string, caso: Partial<Caso>, atualizadoEm = '2026-11-03T10:00:00.000Z'): CasoSalvo => ({
  caso: { ...criarCasoVazio(id), pacienteId: 'p1', ...caso },
  plano: { refeicoes: [] },
  versao: 1,
  atualizadoEm,
})

const REGISTROS: readonly CasoSalvo[] = [
  salvo('set', { dataConsulta: '2026-09-08' }),
  salvo('mai', { dataConsulta: '2026-05-12' }),
  salvo('rapido', { dataConsulta: '2026-10-01', modo: 'rapido' }),
  salvo('nov', { dataConsulta: '2026-11-03' }),
  salvo('outro', { dataConsulta: '2026-11-04', pacienteId: 'p2' }),
  // Sem data da consulta: vale a da última alteração.
  salvo('semData', { dataConsulta: null }, '2026-07-07T09:00:00.000Z'),
]

describe('as avaliações do paciente (spec antropometria-telas, CA-2401)', () => {
  it('CA-2401: só os planos completos do paciente, da avaliação mais nova à mais velha', () => {
    expect(avaliacoesDoPaciente('p1', REGISTROS).map((a) => [a.casoId, a.data])).toEqual([
      ['nov', '2026-11-03'],
      ['set', '2026-09-08'],
      ['semData', '2026-07-07'],
      ['mai', '2026-05-12'],
    ])
    expect(avaliacaoMaisRecente('p1', REGISTROS)?.casoId).toBe('nov')
    expect(avaliacaoMaisRecente('ninguem', REGISTROS)).toBeNull()
  })

  it('CA-2401: na mesma data, a alterada por último vem primeiro', () => {
    const mesmoDia = [salvo('a', { dataConsulta: '2026-11-03' }, '2026-11-03T08:00:00.000Z'), salvo('b', { dataConsulta: '2026-11-03' }, '2026-11-03T09:00:00.000Z')]
    expect(avaliacoesDoPaciente('p1', mesmoDia).map((a) => a.casoId)).toEqual(['b', 'a'])
  })

  it('CA-2459: a primeira é "Primeira avaliação"; as outras, "Retorno · Nª avaliação"', () => {
    const lista = avaliacoesDoPaciente('p1', REGISTROS)
    expect(tipoDaAvaliacao('mai', lista)).toBe('Primeira avaliação')
    expect(tipoDaAvaliacao('semData', lista)).toBe('Retorno · 2ª avaliação')
    expect(tipoDaAvaliacao('nov', lista)).toBe('Retorno · 4ª avaliação')
    expect(tipoDaAvaliacao('rapido', lista)).toBeNull()
  })
})

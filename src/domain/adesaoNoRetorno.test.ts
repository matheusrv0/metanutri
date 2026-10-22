// O resumo do link no Retorno (spec ficha-unica, D-358 e CA-1064).
import type { Acompanhamento } from './acompanhamento.ts'
import { resumoDaAdesao } from './adesaoNoRetorno.ts'

const link = (marcacoes: Acompanhamento['marcacoes']): Acompanhamento => ({
  id: 'a1',
  token: 't',
  casoId: 'c1',
  pacienteId: 'p1',
  nome: 'Maria',
  criadoEm: '2026-09-22T10:00:00.000Z',
  missoes: [],
  marcacoes,
  usoNaoComercial: false,
  dieta: null,
})

describe('O resumo do último link no Retorno (CA-1064)', () => {
  it('diz em quantos dias o paciente marcou e a última marcação', () => {
    const marcacoes = [
      { dia: '2026-09-22', feitas: ['agua'] },
      { dia: '2026-09-23', feitas: [] },
      { dia: '2026-10-18', feitas: ['frutas', 'agua'] },
    ]
    expect(resumoDaAdesao(link(marcacoes), '2026-10-21')).toBe('Link de 22/09/2026: missão marcada em 2 de 30 dias. Última marcação em 18/10/2026.')
  })

  it('sem marcação, diz que ainda não marcou', () => {
    expect(resumoDaAdesao(link([]), '2026-10-21')).toBe('Link de 22/09/2026: nenhuma missão marcada ainda.')
  })
})

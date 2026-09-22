import { atividadePorDia, resumirAtividade } from './atividade.ts'
import type { ResumoCaso } from './persistencia.ts'

const caso = (atualizadoEm: string): ResumoCaso => ({
  id: atualizadoEm,
  nome: 'Plano',
  atualizadoEm,
  pacienteId: null,
  modo: 'completo',
  pesoKg: null,
})

const hoje = new Date('2026-09-16T10:00:00.000Z')

describe('Atividade por dia', () => {
  it('devolve um ponto por dia da janela, do mais antigo para o mais novo', () => {
    const dias = atividadePorDia([], 7, hoje)
    expect(dias).toHaveLength(7)
    expect(dias[0]?.data).toBe('2026-09-10')
    expect(dias[6]?.data).toBe('2026-09-16')
    expect(dias[6]?.rotulo).toBe('16/09')
  })

  it('conta quantos planos foram mexidos em cada dia', () => {
    const dias = atividadePorDia([caso('2026-09-16T08:00:00.000Z'), caso('2026-09-16T09:00:00.000Z'), caso('2026-09-14T12:00:00.000Z')], 7, hoje)
    expect(dias.find((d) => d.data === '2026-09-16')?.planos).toBe(2)
    expect(dias.find((d) => d.data === '2026-09-14')?.planos).toBe(1)
  })

  it('dia sem nada entra com zero, para o gráfico não mentir sobre o ritmo', () => {
    const dias = atividadePorDia([caso('2026-09-16T08:00:00.000Z')], 7, hoje)
    expect(dias.filter((d) => d.planos === 0)).toHaveLength(6)
  })

  it('plano mais antigo que a janela fica de fora', () => {
    const dias = atividadePorDia([caso('2026-01-01T08:00:00.000Z')], 7, hoje)
    expect(dias.every((d) => d.planos === 0)).toBe(true)
  })

  it('janela vazia ou negativa não estoura', () => {
    expect(atividadePorDia([], 0, hoje)).toEqual([])
    expect(atividadePorDia([], -3, hoje)).toEqual([])
  })

  it('resume total, pico e dias trabalhados', () => {
    const dias = atividadePorDia([caso('2026-09-16T08:00:00.000Z'), caso('2026-09-16T09:00:00.000Z'), caso('2026-09-14T12:00:00.000Z')], 7, hoje)
    expect(resumirAtividade(dias)).toEqual({ total: 3, maior: 2, diasAtivos: 2 })
  })
})

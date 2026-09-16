import { ALIMENTOS, DRI, buscarAlimento } from './tabelas.ts'

describe('tabelas', () => {
  it('busca alimento por id', () => {
    expect(buscarAlimento(410)?.descricao).toBe('Frango, peito, sem pele, grelhado')
    expect(buscarAlimento(99999)).toBeUndefined()
    expect(ALIMENTOS).toHaveLength(597)
  })

  it('expõe estágios e valores das DRI', () => {
    expect(DRI.estagios.map((e) => e.id)).toContain('gestante-19-30')
    expect(DRI.valores['feminino-19-30']?.['ferro_mg']?.rda).toBe(18)
  })
})

import { formatarAlteracao } from './formatarAlteracao.ts'

describe('formatarAlteracao', () => {
  const agora = new Date(2026, 8, 15, 18, 0)

  it('mostra hoje e ontem com a hora', () => {
    expect(formatarAlteracao(new Date(2026, 8, 15, 14, 5).toISOString(), agora)).toBe('Alterado hoje às 14:05')
    expect(formatarAlteracao(new Date(2026, 8, 14, 9, 30).toISOString(), agora)).toBe('Alterado ontem às 09:30')
  })

  it('mostra a data para dias anteriores', () => {
    expect(formatarAlteracao(new Date(2026, 8, 3, 10, 0).toISOString(), agora)).toBe('Alterado em 03/09/2026')
  })

  it('não quebra com data inválida', () => {
    expect(formatarAlteracao('lixo', agora)).toBe('Data de alteração desconhecida')
  })
})

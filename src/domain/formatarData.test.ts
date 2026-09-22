import { dataCompleta, dataCurta } from './formatarData.ts'

describe('Formatação de data em pt-BR', () => {
  it('data de calendário vira dia/mês e dia/mês/ano', () => {
    expect(dataCurta('2026-09-12')).toBe('12/09')
    expect(dataCompleta('2026-09-12')).toBe('12/09/2026')
  })

  it('ISO completo com hora usa só a data', () => {
    expect(dataCurta('2026-09-12T23:59:00.000Z')).toBe('12/09')
    expect(dataCompleta('2026-01-05T03:00:00.000Z')).toBe('05/01/2026')
  })

  it('não escorrega um dia por causa do fuso horário', () => {
    // Meia-noite UTC do dia 1 é noite do dia anterior no Brasil; o rótulo é do dia 1 mesmo assim.
    expect(dataCurta('2026-03-01')).toBe('01/03')
    expect(dataCompleta('2026-03-01')).toBe('01/03/2026')
  })

  it('vazio, nulo e texto que não é data devolvem vazio, sem estourar', () => {
    for (const entrada of ['', null, undefined, 'ontem', '12/09/2026', '2026-13-45x']) {
      expect(dataCurta(entrada)).toBe('')
      expect(dataCompleta(entrada)).toBe('')
    }
  })

  it('mês inválido não vira data de outro mês', () => {
    // 2026-13-01 não existe; o Date do JavaScript "corrigiria" para janeiro do ano seguinte.
    expect(dataCompleta('2026-13-01')).toBe('')
  })
})

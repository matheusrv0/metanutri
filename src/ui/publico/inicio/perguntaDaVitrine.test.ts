// CA-1463, CA-1465 e CB-536 a CB-539 (spec landing-escura): o texto do campo vivo escolhe o cartão.
import { chaveDaPergunta } from './perguntaDaVitrine.ts'

describe('chaveDaPergunta', () => {
  it.each([
    ['falta cálcio', 'calcio'],
    ['CALCIO', 'calcio'],
    ['Cálcio', 'calcio'],
    ['   falta    calcio  ', 'calcio'],
    ['falta vitamina E', 'vitamina-e'],
    ['vitamina e', 'vitamina-e'],
    ['vit e', 'vitamina-e'],
    ['vit. E', 'vitamina-e'],
    ['falta vitamina D', 'vitamina-d'],
    ['Vitamina D', 'vitamina-d'],
    ['vit d', 'vitamina-d'],
  ] as const)('"%s" é %s', (texto, chave) => {
    expect(chaveDaPergunta(texto)).toBe(chave)
  })

  it.each(['', '   ', 'ferro', 'vitamina a', 'vitamina', 'vitamina d3', 'arroz e feijão', 'falta e'])('"%s" não é nenhum dos três (cartão "Neste exemplo")', (texto) => {
    expect(chaveDaPergunta(texto)).toBeNull()
  })

  it('texto longo não quebra (CB-537)', () => {
    expect(chaveDaPergunta(`${'a'.repeat(500)} cálcio`)).toBe('calcio')
  })
})

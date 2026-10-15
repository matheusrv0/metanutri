import { EXAMES, linhasDoPedido, marcarExame, normalizarPedido, PEDIDO_VAZIO, pedidoVazio } from './exames.ts'

describe('pedido de exames (D-169)', () => {
  it('CA-579: os 10 exames da lista, nesta ordem, com ids únicos', () => {
    expect(EXAMES.map((e) => e.nome)).toEqual([
      'Hemograma completo',
      'Ferritina',
      'Vitamina D (25-OH)',
      'Vitamina B12',
      'Glicemia de jejum',
      'Hemoglobina glicada (HbA1c)',
      'Perfil lipídico',
      'TSH',
      'Creatinina',
      'TGO e TGP',
    ])
    expect(new Set(EXAMES.map((e) => e.id)).size).toBe(EXAMES.length)
  })

  it('CA-585: o pedido começa sem nada marcado', () => {
    expect(PEDIDO_VAZIO).toEqual({ marcados: [], outros: '' })
    expect(pedidoVazio(PEDIDO_VAZIO)).toBe(true)
  })

  it('marcar e desmarcar não repete o exame', () => {
    let pedido = marcarExame(PEDIDO_VAZIO, 'tsh', true)
    pedido = marcarExame(pedido, 'tsh', true)
    expect(pedido.marcados).toEqual(['tsh'])
    expect(marcarExame(pedido, 'tsh', false).marcados).toEqual([])
  })

  it('CA-580 e CB-169: os marcados na ordem da lista, depois cada linha de Outros, sem as em branco', () => {
    const pedido = { marcados: ['tsh', 'hemograma', 'ferritina'], outros: 'Ácido fólico\n\n  \n Zinco sérico \r\n' }
    expect(linhasDoPedido(pedido)).toEqual(['Hemograma completo', 'Ferritina', 'TSH', 'Ácido fólico', 'Zinco sérico'])
    expect(pedidoVazio(pedido)).toBe(false)
  })

  it('CA-581: só linhas em branco em Outros conta como vazio', () => {
    expect(pedidoVazio({ marcados: [], outros: ' \n \n' })).toBe(true)
    expect(pedidoVazio({ marcados: [], outros: 'Insulina' })).toBe(false)
  })

  it('CA-588: dado estragado vira vazio; id repetido sai', () => {
    expect(normalizarPedido(undefined)).toEqual(PEDIDO_VAZIO)
    expect(normalizarPedido([1])).toEqual(PEDIDO_VAZIO)
    expect(normalizarPedido({ marcados: ['tsh', 'tsh', 3], outros: 9 })).toEqual({ marcados: ['tsh'], outros: '' })
    expect(normalizarPedido({ marcados: 'tsh', outros: 'B12' })).toEqual({ marcados: [], outros: 'B12' })
  })

  it('CA-589: exame que esta versão não conhece fica guardado, mesmo marcando outro, mas não sai na folha', () => {
    const lido = normalizarPedido({ marcados: ['tsh', 'exame-novo'], outros: '', data: '2026-10-01' })
    expect(lido).toEqual({ marcados: ['tsh', 'exame-novo'], outros: '', data: '2026-10-01' })
    expect(marcarExame(lido, 'ferritina', true).marcados).toEqual(['tsh', 'exame-novo', 'ferritina'])
    expect(linhasDoPedido(lido)).toEqual(['TSH'])
    expect(pedidoVazio({ marcados: ['exame-novo'], outros: '' })).toBe(true)
  })
})

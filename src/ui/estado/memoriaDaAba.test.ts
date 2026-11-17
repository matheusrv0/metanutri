import { renderHook } from '@testing-library/react'
import { criarMemoriaDaAba, useEsquecerAoTrocarDeConta } from './memoriaDaAba.ts'

describe('a lembrança da aba (spec assistente-ia, D-1366)', () => {
  it('guarda pelo dono e esquece com undefined', () => {
    const m = criarMemoriaDaAba<number>()
    m.gravar('a', 1)
    expect(m.ler('a')).toBe(1)
    expect(m.ler('b')).toBeUndefined()
    m.gravar('a', undefined)
    expect(m.ler('a')).toBeUndefined()
  })

  it('CA-2429: a conta trocada na mesma aba, sem recarregar, apaga a lembrança; a mesma conta, não', () => {
    const m = criarMemoriaDaAba<string>()
    const { rerender } = renderHook(({ conta }: { conta: string | null }) => useEsquecerAoTrocarDeConta(conta), { initialProps: { conta: 'conta-a' } })
    m.gravar('plano-de-a', 'pedido de A')
    rerender({ conta: 'conta-a' })
    expect(m.ler('plano-de-a')).toBe('pedido de A')
    rerender({ conta: 'conta-b' })
    expect(m.ler('plano-de-a')).toBeUndefined()
  })
})

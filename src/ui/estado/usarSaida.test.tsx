import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { ContextoNuvem, type ValorNuvem } from './contextoNuvem.ts'
import { useSaida } from './usarSaida.ts'

const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0 }

function nuvemFalsa(estado: Partial<EstadoDaNuvem>, salvou = true) {
  const ordem: string[] = []
  const valor: ValorNuvem = {
    estado: { ...PRONTA, ...estado },
    salvarAgora: vi.fn(async () => {
      ordem.push('salvar')
      return salvou
    }),
    reduzir: vi.fn(),
    parar: vi.fn(() => {
      ordem.push('parar')
    }),
  }
  return { valor, ordem }
}

function montar(nuvem: ValorNuvem | null) {
  const ordem: string[] = []
  const sair = vi.fn(async () => {
    ordem.push('sair')
  })
  const aoSaiu = vi.fn(() => {
    ordem.push('saiu')
  })
  const envolver = ({ children }: { children: ReactNode }) => <ContextoNuvem.Provider value={nuvem}>{children}</ContextoNuvem.Provider>
  const { result } = renderHook(() => useSaida({ sair }, aoSaiu), { wrapper: envolver })
  return { result, sair, aoSaiu, ordem }
}

describe('useSaida (spec dados-na-nuvem, D-131)', () => {
  it('CA-478: tudo na nuvem: sai sem perguntar; a nuvem para antes de a cópia de trabalho ser apagada', async () => {
    const nuvem = nuvemFalsa({})
    const { result, sair, aoSaiu, ordem } = montar(nuvem.valor)
    await act(() => result.current.pedirSair())
    expect(result.current.perguntando).toBe(false)
    expect(sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
    expect([...nuvem.ordem, ...ordem]).toEqual(['parar', 'sair', 'saiu'])
  })

  it('CA-478: sem nuvem (modo local), sai sem perguntar', async () => {
    const { result, sair, aoSaiu } = montar(null)
    await act(() => result.current.pedirSair())
    expect(sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
  })

  it('DP-11: com mudança pendente e internet, salva na hora e sai sem perguntar', async () => {
    const nuvem = nuvemFalsa({ pendente: true })
    const { result, sair } = montar(nuvem.valor)
    await act(() => result.current.pedirSair())
    expect(nuvem.valor.salvarAgora).toHaveBeenCalledOnce()
    expect(result.current.perguntando).toBe(false)
    expect(sair).toHaveBeenCalledOnce()
  })

  it('CA-479: com mudança que não deu para salvar, pergunta antes; "Ficar" não sai', async () => {
    const nuvem = nuvemFalsa({ pendente: true }, false)
    const { result, sair } = montar(nuvem.valor)
    await act(() => result.current.pedirSair())
    expect(result.current.perguntando).toBe(true)
    expect(sair).not.toHaveBeenCalled()
    act(() => result.current.ficar())
    expect(result.current.perguntando).toBe(false)
    expect(sair).not.toHaveBeenCalled()
    expect(nuvem.valor.parar).not.toHaveBeenCalled()
  })

  it('CA-479: sem internet (área travada), pergunta sem tentar salvar; "Sair mesmo assim" sai', async () => {
    const nuvem = nuvemFalsa({ pendente: true, trava: 'sem-internet' })
    const { result, sair, aoSaiu } = montar(nuvem.valor)
    await act(() => result.current.pedirSair())
    expect(nuvem.valor.salvarAgora).not.toHaveBeenCalled()
    expect(result.current.perguntando).toBe(true)
    await act(() => result.current.sairMesmoAssim())
    expect(nuvem.valor.parar).toHaveBeenCalledOnce()
    expect(sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
  })
})

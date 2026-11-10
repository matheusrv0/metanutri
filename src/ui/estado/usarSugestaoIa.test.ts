import { act, renderHook, waitFor } from '@testing-library/react'
import type { CorpoDoPedidoIa } from '../../../supabase/functions/_shared/iaContrato.ts'
import { useSugestaoIa, type DependenciasDaSugestao } from './usarSugestaoIa.ts'

const USO = { usados: 7, limite: 20, renovaEm: '2026-12-01' }
const RESPOSTA = { refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [] }], mudancas: [], pontosAConfirmar: [] }
const CONTEXTO = { modo: 'gerar' as const, refeicoes: 1, idsPermitidos: new Set([53]), plano: null }
const corpo = { modo: 'gerar', pacienteId: 'p1' } as unknown as CorpoDoPedidoIa

type Resultado = Awaited<ReturnType<DependenciasDaSugestao['chamar']>>

function prometida() {
  let resolver: (r: Resultado) => void = () => {}
  const promessa = new Promise<Resultado>((r) => {
    resolver = r
  })
  return { promessa, resolver }
}

function dependencias(mudar: Partial<DependenciasDaSugestao> = {}): DependenciasDaSugestao {
  return {
    chamar: vi.fn(async (_nome: string, c: Record<string, unknown>) =>
      c['modo'] === 'uso' ? { dados: { uso: USO }, falha: null } : { dados: { resposta: RESPOSTA, uso: { ...USO, usados: 8 }, foraDaBase: 0, modelo: 'claude-opus-5-5' }, falha: null },
    ),
    salvarAgora: vi.fn(async () => true),
    online: () => true,
    ...mudar,
  }
}

describe('useSugestaoIa (spec assistente-ia, T30)', () => {
  it('CA-2361: lê o contador pelo modo uso', async () => {
    const d = dependencias()
    const { result } = renderHook(() => useSugestaoIa(d))
    act(() => result.current.lerUso())
    await waitFor(() => expect(result.current.uso).toEqual(USO))
    expect(d.chamar).toHaveBeenCalledWith('sugerir-plano', { modo: 'uso' })
  })

  it('CA-2403: manda a cópia à nuvem antes de pedir; a resposta chega lida, e o contador sobe com ela', async () => {
    const ordem: string[] = []
    const base = dependencias()
    const d = dependencias({
      salvarAgora: vi.fn(async () => {
        ordem.push('salvar')
        return true
      }),
      chamar: vi.fn(async (nome: string, c: Record<string, unknown>) => {
        ordem.push(String(c['modo']))
        return base.chamar(nome, c)
      }),
    })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(ordem).toEqual(['salvar', 'gerar'])
    expect(result.current.estado.fase).toBe('resposta')
    if (result.current.estado.fase !== 'resposta') throw new Error('sem resposta')
    expect(result.current.estado.resposta.modelo).toBe('claude-opus-5-5')
    expect(result.current.uso?.usados).toBe(8)
  })

  it('CA-2403: sem conseguir mandar a cópia, a frase de sem conexão, e nada é pedido', async () => {
    const d = dependencias({ salvarAgora: vi.fn(async () => false) })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(d.chamar).not.toHaveBeenCalled()
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'tentar' } })
    if (result.current.estado.fase === 'erro') expect(result.current.estado.erro.frase).toMatch(/Confira a internet/)
  })

  it('CB-1315: sem internet, nada sai', async () => {
    const d = dependencias({ online: () => false })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(d.chamar).not.toHaveBeenCalled()
    expect(d.salvarAgora).not.toHaveBeenCalled()
    expect(result.current.estado.fase).toBe('erro')
  })

  it('CB-1301: dois cliques, um pedido só; a espera tem a hora de início', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const { result } = renderHook(() => useSugestaoIa(d))
    act(() => {
      void result.current.pedir(corpo, CONTEXTO)
      void result.current.pedir(corpo, CONTEXTO)
    })
    await waitFor(() => expect(d.chamar).toHaveBeenCalledTimes(1))
    expect(result.current.estado.fase).toBe('esperando')
    expect(result.current.ocupado).toBe(true)
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: USO, foraDaBase: 0, modelo: 'm' }, falha: null }))
    expect(result.current.ocupado).toBe(false)
  })

  it('CB-1300 e CA-2366: cancelar volta ao pedido e descarta a resposta que chegar depois', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const { result } = renderHook(() => useSugestaoIa(d))
    act(() => void result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(result.current.estado.fase).toBe('esperando'))
    act(() => result.current.cancelar())
    expect(result.current.estado.fase).toBe('pedido')
    expect(result.current.ocupado).toBe(false)
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: USO, foraDaBase: 0, modelo: 'm' }, falha: null }))
    expect(result.current.estado.fase).toBe('pedido')
  })

  it('CA-2374: o erro da função vira a frase; o limite do mês relê o contador', async () => {
    const d = dependencias({
      chamar: vi.fn(async (_n: string, c: Record<string, unknown>) =>
        c['modo'] === 'uso' ? { dados: { uso: { ...USO, usados: 20 } }, falha: null } : { dados: null, falha: { status: 429, codigo: 'limite-mes', erro: 'x' } },
      ),
    })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'ver-planos' } })
    await waitFor(() => expect(result.current.uso?.usados).toBe(20))
  })

  it('a resposta fora da forma é indisponível; "voltar" leva ao pedido', async () => {
    const d = dependencias({ chamar: vi.fn(async () => ({ dados: { resposta: 'x' }, falha: null })) })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'fechar' } })
    act(() => result.current.voltar())
    expect(result.current.estado.fase).toBe('pedido')
  })

  it('D-1354 e CB-1321: o contador sem resposta fica nulo, sem erro', async () => {
    const d = dependencias({ chamar: vi.fn(async () => ({ dados: null, falha: { status: 404, codigo: null, erro: null } })) })
    const { result } = renderHook(() => useSugestaoIa(d))
    await act(async () => result.current.lerUso())
    expect(result.current.uso).toBeNull()
    expect(result.current.estado.fase).toBe('pedido')
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import type { CorpoDoPedidoIa } from '../../../supabase/functions/_shared/iaContrato.ts'
import { useSugestaoIa, type DependenciasDaSugestao } from './usarSugestaoIa.ts'

const USO = { usados: 7, limite: 20, renovaEm: '2026-12-01' }
const RESPOSTA = { refeicoes: [{ refeicao: 0, principal: [{ alimentoId: 53, gramas: 50 }], opcao2: [] }], mudancas: [], pontosAConfirmar: [] }
const CONTEXTO = { modo: 'gerar' as const, refeicoes: 1, idsPermitidos: new Set([53]), plano: null }
const DONO = '["caso-1","pac-1"]'
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
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
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
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(ordem).toEqual(['salvar', 'gerar'])
    expect(result.current.estado.fase).toBe('resposta')
    if (result.current.estado.fase !== 'resposta') throw new Error('sem resposta')
    expect(result.current.estado.resposta.modelo).toBe('claude-opus-5-5')
    expect(result.current.uso?.usados).toBe(8)
  })

  it('CA-2405 (D-1355): a resposta sem `uso` vale; o contador fica estimado (o de antes + 1) e é relido pelo modo uso', async () => {
    let lidas = 0
    const d = dependencias({
      chamar: vi.fn(async (_nome: string, c: Record<string, unknown>) => {
        if (c['modo'] !== 'uso') return { dados: { resposta: RESPOSTA, foraDaBase: 0, modelo: 'claude-opus-5-5' }, falha: null }
        lidas += 1
        // A primeira leitura (ao abrir) responde; a releitura depois da sugestão falha, como o banco que caiu.
        return lidas === 1 ? { dados: { uso: USO }, falha: null } : { dados: null, falha: { status: 503, codigo: 'indisponivel', erro: null } }
      }),
    })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    act(() => result.current.lerUso())
    await waitFor(() => expect(result.current.uso).toEqual(USO))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado.fase).toBe('resposta')
    expect(result.current.uso).toEqual({ ...USO, usados: 8 })
    await waitFor(() => expect(lidas).toBe(2))
    expect(result.current.uso).toEqual({ ...USO, usados: 8 })
  })

  it('CA-2405 (D-1355): sem contador antes nem depois, a sugestão vale e o contador fica vazio', async () => {
    const d = dependencias({
      chamar: vi.fn(async (_nome: string, c: Record<string, unknown>) =>
        c['modo'] === 'uso' ? { dados: null, falha: { status: 503, codigo: null, erro: null } } : { dados: { resposta: RESPOSTA, foraDaBase: 0, modelo: 'm' }, falha: null },
      ),
    })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado.fase).toBe('resposta')
    expect(result.current.uso).toBeNull()
  })

  it('CA-2403: sem conseguir mandar a cópia, a frase de sem conexão, e nada é pedido', async () => {
    const d = dependencias({ salvarAgora: vi.fn(async () => false) })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(d.chamar).not.toHaveBeenCalled()
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'tentar' } })
    if (result.current.estado.fase === 'erro') expect(result.current.estado.erro.frase).toMatch(/Confira a internet/)
  })

  it('CB-1315: sem internet, nada sai', async () => {
    const d = dependencias({ online: () => false })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(d.chamar).not.toHaveBeenCalled()
    expect(d.salvarAgora).not.toHaveBeenCalled()
    expect(result.current.estado.fase).toBe('erro')
  })

  it('CB-1301: dois cliques, um pedido só; a espera tem a hora de início', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
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
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
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
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'ver-planos' } })
    await waitFor(() => expect(result.current.uso?.usados).toBe(20))
  })

  it('a resposta fora da forma é indisponível; "voltar" leva ao pedido', async () => {
    const d = dependencias({ chamar: vi.fn(async () => ({ dados: { resposta: 'x' }, falha: null })) })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.pedir(corpo, CONTEXTO))
    expect(result.current.estado).toMatchObject({ fase: 'erro', erro: { acao: 'fechar' } })
    act(() => result.current.voltar())
    expect(result.current.estado.fase).toBe('pedido')
  })

  it('D-1354 e CB-1321: o contador sem resposta fica nulo, sem erro', async () => {
    const d = dependencias({ chamar: vi.fn(async () => ({ dados: null, falha: { status: 404, codigo: null, erro: null } })) })
    const { result } = renderHook(() => useSugestaoIa(DONO, d))
    await act(async () => result.current.lerUso())
    expect(result.current.uso).toBeNull()
    expect(result.current.estado.fase).toBe('pedido')
  })
})

describe('useSugestaoIa: a espera pelo plano de origem (D-1366)', () => {
  it('CA-2416: a resposta que chega com a tela fora do plano fica para o mesmo dono, e só para ele', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const primeira = renderHook(() => useSugestaoIa(DONO, d))
    act(() => void primeira.result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(primeira.result.current.estado.fase).toBe('esperando'))
    const inicio = primeira.result.current.estado.fase === 'esperando' ? primeira.result.current.estado.inicio : 0
    // A tela saiu do plano: o componente desmontou no meio da espera.
    primeira.unmount()
    const outro = renderHook(() => useSugestaoIa('["caso-2","pac-2"]', d))
    expect(outro.result.current.estado.fase).toBe('pedido')
    // De volta ao mesmo plano, ainda esperando, com o relógio desde o início.
    const volta = renderHook(() => useSugestaoIa(DONO, d))
    expect(volta.result.current.estado).toEqual({ fase: 'esperando', inicio })
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: { ...USO, usados: 8 }, foraDaBase: 0, modelo: 'm' }, falha: null }))
    expect(volta.result.current.estado.fase).toBe('resposta')
    expect(outro.result.current.estado.fase).toBe('pedido')
  })

  it('CA-2416: a resposta que chega sem nenhuma tela aberta aparece quando o plano volta', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const primeira = renderHook(() => useSugestaoIa(DONO, d))
    act(() => void primeira.result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(primeira.result.current.estado.fase).toBe('esperando'))
    primeira.unmount()
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: USO, foraDaBase: 0, modelo: 'm' }, falha: null }))
    const volta = renderHook(() => useSugestaoIa(DONO, d))
    expect(volta.result.current.estado.fase).toBe('resposta')
  })

  it('CA-2417: cancelar esquece; a resposta que chega depois não volta', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const primeira = renderHook(() => useSugestaoIa(DONO, d))
    act(() => void primeira.result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(primeira.result.current.estado.fase).toBe('esperando'))
    act(() => primeira.result.current.cancelar())
    primeira.unmount()
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: USO, foraDaBase: 0, modelo: 'm' }, falha: null }))
    expect(renderHook(() => useSugestaoIa(DONO, d)).result.current.estado.fase).toBe('pedido')
  })
})

describe('useSugestaoIa: um pedido por vez na aba (D-1368)', () => {
  it('CA-2419: com o plano A esperando, o plano B sabe e não pede; quando A termina, B pode', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn((_n: string, c: Record<string, unknown>) => (c['modo'] === 'uso' ? Promise.resolve({ dados: { uso: USO }, falha: null }) : espera.promessa)) })
    const a = renderHook(() => useSugestaoIa(DONO, d))
    const b = renderHook(() => useSugestaoIa('["caso-2","pac-2"]', d))
    act(() => void a.result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(b.result.current.outroEsperando).toBe(true))
    expect(a.result.current.outroEsperando).toBe(false)
    await act(async () => b.result.current.pedir(corpo, CONTEXTO))
    expect(vi.mocked(d.chamar).mock.calls.filter(([, c]) => c['modo'] === 'gerar')).toHaveLength(1)
    expect(b.result.current.estado.fase).toBe('pedido')
    await act(async () => espera.resolver({ dados: { resposta: RESPOSTA, uso: USO, foraDaBase: 0, modelo: 'm' }, falha: null }))
    expect(b.result.current.outroEsperando).toBe(false)
  })

  it('CA-2419: cancelar em A libera B na hora', async () => {
    const espera = prometida()
    const d = dependencias({ chamar: vi.fn(() => espera.promessa) })
    const a = renderHook(() => useSugestaoIa(DONO, d))
    const b = renderHook(() => useSugestaoIa('["caso-2","pac-2"]', d))
    act(() => void a.result.current.pedir(corpo, CONTEXTO))
    await waitFor(() => expect(b.result.current.outroEsperando).toBe(true))
    act(() => a.result.current.cancelar())
    expect(b.result.current.outroEsperando).toBe(false)
  })
})

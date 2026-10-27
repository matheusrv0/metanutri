import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { EstadoDaNuvem } from '@/domain/sincronia.ts'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import type { ValorConta } from '../estado/usarConta.ts'
import { CHAVE_MARCA_DA_SESSAO, gravarMarca, lerMarca } from './marcaDeUso.ts'
import { PRAZO_DOS_ENVIOS_MS, useTempoDeSessao } from './usarTempoDeSessao.ts'

const MIN = 60_000
const HORA = 60 * MIN
const INICIO = new Date(2026, 9, 27, 8, 0).getTime()
const PRONTA: EstadoDaNuvem = { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false }

interface Montagem {
  readonly ativo?: boolean
  readonly admin?: boolean
  readonly salvarAgora?: () => Promise<boolean>
  readonly nuvem?: boolean
}

/** O vigia de uma aba, com a nuvem falsa e a conta falsa; a ordem do que aconteceu na saída fica em `ordem`. */
function montar({ ativo = true, admin = false, salvarAgora, nuvem = true }: Montagem = {}) {
  const ordem: string[] = []
  const valorNuvem: ValorNuvem = {
    estado: PRONTA,
    salvarAgora: vi.fn(
      salvarAgora ??
        (async () => {
          ordem.push('salvar')
          return true
        }),
    ),
    reduzir: vi.fn(),
    parar: vi.fn(() => {
      ordem.push('parar')
    }),
  }
  const sairPorTempo = vi.fn<ValorConta['sairPorTempo']>(async (saida) => {
    ordem.push(`sair:${saida.apagar ? 'apagar' : 'guardar'}`)
  })
  const aoSair = vi.fn(() => {
    ordem.push('entrar')
  })
  const envolver = ({ children }: { children: ReactNode }) => <ContextoNuvem.Provider value={nuvem ? valorNuvem : null}>{children}</ContextoNuvem.Provider>
  const hook = renderHook((props: { ativo: boolean; admin: boolean }) => useTempoDeSessao({ ...props, usuarioId: 'u1', sairPorTempo, aoSair }), {
    wrapper: envolver,
    initialProps: { ativo, admin },
  })
  return { ...hook, ordem, sairPorTempo, aoSair, nuvem: valorNuvem }
}

const passar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const usar = (tipo: 'keydown' | 'pointerdown' | 'touchstart' | 'wheel' | 'scroll' = 'keydown') =>
  act(() => {
    window.dispatchEvent(new Event(tipo))
  })

/** A cópia de trabalho de u1 em dia com a nuvem. */
function espacoEmDia() {
  localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 1, salvas: 1, itens: 1 }))
  localStorage.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
}

describe('o vigia da sessão (spec separacao-site-app, D-514 a D-517)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: INICIO })
    localStorage.clear()
    espacoEmDia()
    gravarMarca(localStorage, { conta: 'u1', uso: INICIO, entrada: INICIO, admin: false, desvio: 0 })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('CA-1442: aos 28 minutos sem uso, avisa; uma tecla fecha o aviso e a contagem recomeça', async () => {
    const { result } = montar()
    await passar(28 * MIN - 1)
    expect(result.current.aviso).toBe(false)
    await passar(1)
    expect(result.current.aviso).toBe(true)
    usar('keydown')
    expect(result.current.aviso).toBe(false)
    await passar(27 * MIN)
    expect(result.current.aviso).toBe(false)
    await passar(MIN)
    expect(result.current.aviso).toBe(true)
  })

  it('CA-1442: "Continuar" fecha o aviso e conta como uso', async () => {
    const { result } = montar()
    await passar(28 * MIN)
    expect(result.current.aviso).toBe(true)
    act(() => result.current.continuar())
    expect(result.current.aviso).toBe(false)
    await passar(5 * MIN)
    expect(result.current.capa).toBe(false)
    expect(lerMarca(localStorage, 'u1')?.uso).toBe(INICIO + 28 * MIN)
  })

  it('CA-1440, CA-1447 e D-517: aos 30 minutos sai na ordem: a capa, o envio do que falta, o motor para, o espaço em dia é apagado, Entrar', async () => {
    const { result, ordem, sairPorTempo, aoSair } = montar()
    await passar(30 * MIN - 1)
    expect(result.current.capa).toBe(false)
    expect(sairPorTempo).not.toHaveBeenCalled()
    await passar(1)
    expect(result.current.capa).toBe(true)
    expect(result.current.aviso).toBe(false)
    expect(ordem).toEqual(['salvar', 'parar', 'sair:apagar', 'entrar'])
    expect(sairPorTempo).toHaveBeenCalledWith({ apagar: true, ate: INICIO })
    expect(aoSair).toHaveBeenCalledOnce()
  })

  it('CA-1441: o administrador é avisado aos 13 minutos e sai aos 15', async () => {
    const { result, sairPorTempo } = montar({ admin: true })
    await passar(13 * MIN)
    expect(result.current.aviso).toBe(true)
    await passar(2 * MIN)
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('CB-526: o perfil chega depois dizendo que é administrador: vale na hora, e a marca guarda para a próxima abertura', async () => {
    const { rerender, sairPorTempo } = montar()
    await passar(16 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
    rerender({ ativo: true, admin: true })
    await passar(0)
    expect(sairPorTempo).toHaveBeenCalledOnce()
    expect(lerMarca(localStorage, 'u1')?.admin).toBe(true)
  })

  it('CB-526: a marca de administrador vale ao abrir, antes de o perfil chegar', async () => {
    gravarMarca(localStorage, { conta: 'u1', uso: INICIO, entrada: INICIO, admin: true, desvio: 0 })
    const { result } = montar()
    await passar(13 * MIN)
    expect(result.current.aviso).toBe(true)
  })

  it('CA-1443 e CA-1444: em uso sem parar, a faixa aparece 10 minutos antes das 12 horas, sem estender; às 12 horas sai mesmo assim', async () => {
    const { result, sairPorTempo } = montar()
    for (let passados = 0; passados < 12 * HORA - 10 * MIN; passados += 5 * MIN) {
      await passar(5 * MIN)
      usar('pointerdown')
    }
    expect(result.current.faixa).toBe(INICIO + 12 * HORA)
    expect(result.current.aviso).toBe(false)
    expect(sairPorTempo).not.toHaveBeenCalled()
    usar('keydown')
    await passar(5 * MIN)
    usar('keydown')
    expect(result.current.faixa).toBe(INICIO + 12 * HORA)
    await passar(5 * MIN)
    expect(sairPorTempo).toHaveBeenCalledOnce()
    expect(sairPorTempo.mock.calls[0]?.[0].ate).toBe(INICIO + 12 * HORA - 5 * MIN)
  })

  it('CA-1454: a faixa mostra a hora do fim no relógio deste computador, corrigida pelo desvio', async () => {
    const desvio = 3 * HORA
    gravarMarca(localStorage, { conta: 'u1', uso: INICIO + desvio, entrada: INICIO + desvio, admin: false, desvio })
    const { result } = montar()
    for (let passados = 0; passados < 12 * HORA - 10 * MIN; passados += 10 * MIN) {
      await passar(10 * MIN)
      usar()
    }
    expect(result.current.faixa).toBe(INICIO + 12 * HORA)
  })

  it.each(['keydown', 'pointerdown', 'touchstart', 'wheel', 'scroll'] as const)('CA-1446: %s conta como uso', async (tipo) => {
    const { sairPorTempo } = montar()
    await passar(20 * MIN)
    usar(tipo)
    await passar(15 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
  })

  it('CA-1446: só mexer o mouse não conta como uso', async () => {
    const { sairPorTempo } = montar()
    await passar(20 * MIN)
    act(() => {
      window.dispatchEvent(new Event('pointermove'))
      window.dispatchEvent(new Event('mousemove'))
    })
    await passar(10 * MIN)
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('DP-SA-5: o uso vai para o navegador no máximo a cada 60 s', async () => {
    montar()
    await passar(MIN)
    usar()
    expect(lerMarca(localStorage, 'u1')?.uso).toBe(INICIO + MIN)
    await passar(30_000)
    usar()
    expect(lerMarca(localStorage, 'u1')?.uso).toBe(INICIO + MIN)
    await passar(30_000)
    usar()
    expect(lerMarca(localStorage, 'u1')?.uso).toBe(INICIO + 2 * MIN)
  })

  it('CA-1445 e CB-508: o uso em outra aba (a marca muda no navegador) fecha o aviso aqui e adia a saída', async () => {
    const { result, sairPorTempo } = montar()
    await passar(28 * MIN)
    expect(result.current.aviso).toBe(true)
    act(() => {
      gravarMarca(localStorage, { conta: 'u1', uso: INICIO + 28 * MIN, entrada: INICIO, admin: false, desvio: 0 })
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_MARCA_DA_SESSAO }))
    })
    expect(result.current.aviso).toBe(false)
    await passar(10 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
  })

  it('CA-1445: duas abas chegam à saída juntas e só uma sai; a outra fica com a capa', async () => {
    const abaA = montar()
    const abaB = montar()
    await passar(30 * MIN)
    expect(abaA.sairPorTempo.mock.calls.length + abaB.sairPorTempo.mock.calls.length).toBe(1)
    expect(abaA.result.current.capa).toBe(true)
    expect(abaB.result.current.capa).toBe(true)
  })

  it('DP-SA-6: com navigator.locks, a aba que não pega a trava não sai', async () => {
    let ocupada = false
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: async (_nome: string, _opcoes: unknown, fazer: (trava: object | null) => Promise<unknown>) => {
          if (ocupada) return fazer(null)
          ocupada = true
          try {
            return await fazer({})
          } finally {
            ocupada = false
          }
        },
      },
    })
    let soltar = (): void => undefined
    const abaA = montar({
      salvarAgora: () =>
        new Promise<boolean>((resolver) => {
          soltar = () => resolver(true)
        }),
    })
    const abaB = montar()
    await passar(30 * MIN)
    expect(abaB.result.current.capa).toBe(true)
    await act(async () => {
      soltar()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(abaA.sairPorTempo).toHaveBeenCalledOnce()
    expect(abaB.sairPorTempo).not.toHaveBeenCalled()
  })

  it('DP-SA-26: a aba que não fez a saída tenta de novo em 20 s, se a outra sumiu no meio', async () => {
    gravarMarca(localStorage, { conta: 'u1', uso: INICIO, entrada: INICIO, admin: false, desvio: 0, saindo: INICIO + 30 * MIN + 20_000 })
    const { sairPorTempo } = montar()
    await passar(30 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
    await passar(20_000)
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('CA-1448: sem internet, o envio não termina; em 10 s sai mesmo assim e o espaço com pendência fica', async () => {
    localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 3, salvas: 1, itens: 1 }))
    const { sairPorTempo, nuvem } = montar({ salvarAgora: () => new Promise<boolean>(() => undefined) })
    await passar(30 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
    await passar(PRAZO_DOS_ENVIOS_MS)
    expect(nuvem.parar).toHaveBeenCalled()
    expect(sairPorTempo).toHaveBeenCalledWith({ apagar: false, ate: INICIO })
  })

  it('CB-509: uma gravação a caminho é esperada dentro dos 10 s, e o espaço que ficou em dia é apagado', async () => {
    localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v1', mudancas: 2, salvas: 1, itens: 1 }))
    const { sairPorTempo } = montar({
      salvarAgora: () =>
        new Promise<boolean>((resolver) => {
          setTimeout(() => {
            localStorage.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ versao: 'v2', mudancas: 2, salvas: 2, itens: 1 }))
            resolver(true)
          }, 3_000)
        }),
    })
    await passar(30 * MIN + 3_000)
    expect(sairPorTempo).toHaveBeenCalledWith({ apagar: true, ate: INICIO })
  })

  it('CA-1447 e CB-510: a saída espera os envios registrados (os links pendentes)', async () => {
    const { result, ordem } = montar()
    act(() => {
      result.current.envios.registrar(async () => {
        ordem.push('links')
      })
    })
    await passar(30 * MIN)
    expect(ordem.slice(0, 2).sort()).toEqual(['links', 'salvar'])
    expect(ordem.slice(2)).toEqual(['parar', 'sair:apagar', 'entrar'])
  })

  it('CA-1458 e CB-522: o computador dormiu; ao voltar para a aba, sai antes de deixar editar', async () => {
    const { result, sairPorTempo } = montar()
    act(() => vi.setSystemTime(INICIO + 2 * HORA))
    expect(sairPorTempo).not.toHaveBeenCalled()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.capa).toBe(true)
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('CA-1458: também quando a janela ganha o foco', async () => {
    const { sairPorTempo } = montar()
    act(() => vi.setSystemTime(INICIO + 13 * HORA))
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('D-518: já vencida ao montar, a capa aparece no primeiro desenho', () => {
    gravarMarca(localStorage, { conta: 'u1', uso: INICIO - HORA, entrada: INICIO - HORA, admin: false, desvio: 0 })
    const { result } = montar()
    expect(result.current.capa).toBe(true)
  })

  it('CB-527: com o aviso aberto, quem volta depois dos 30 minutos sai sem passar pelo "Continuar"', async () => {
    const { result, sairPorTempo } = montar()
    await passar(28 * MIN)
    expect(result.current.aviso).toBe(true)
    await passar(5 * MIN)
    expect(sairPorTempo).toHaveBeenCalledOnce()
    expect(result.current.aviso).toBe(false)
  })

  it('CB-517: sem marca de uso, vale a hora da entrada que a conta gravou; sem nada, a hora em que o vigia começou', async () => {
    localStorage.removeItem(CHAVE_MARCA_DA_SESSAO)
    const { sairPorTempo } = montar()
    await passar(29 * MIN)
    expect(sairPorTempo).not.toHaveBeenCalled()
    await passar(MIN)
    expect(sairPorTempo).toHaveBeenCalledOnce()
  })

  it('CA-1455 e CA-1456: desligado (link do paciente, modo local, sem sessão), não avisa, não cobre e não sai', async () => {
    const { result, sairPorTempo } = montar({ ativo: false })
    await passar(13 * HORA)
    usar()
    expect(result.current).toMatchObject({ aviso: false, faixa: null, capa: false })
    expect(sairPorTempo).not.toHaveBeenCalled()
  })

  it('sem nuvem (o motor não abriu), a saída segue sem esperar nada', async () => {
    const { sairPorTempo } = montar({ nuvem: false })
    await passar(30 * MIN)
    expect(sairPorTempo).toHaveBeenCalledWith({ apagar: true, ate: INICIO })
  })
})

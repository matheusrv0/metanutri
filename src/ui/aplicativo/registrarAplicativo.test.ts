// Spec receitas-com-calculo, D-274c e CA-888b: a versão nova é conferida ao voltar para a aba e a cada 60 minutos.
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { CONFERIR_VERSAO_A_CADA_MS, registrarAplicativo } from './registrarAplicativo.ts'

const registro = vi.hoisted(() => ({ chamadas: [] as RegisterSWOptions[] }))

vi.mock('virtual:pwa-register', () => ({
  registerSW: (opcoes: RegisterSWOptions = {}) => {
    registro.chamadas.push(opcoes)
    return () => Promise.resolve()
  },
}))

const mudarVisibilidade = (estado: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** Liga o registro e entrega ao plugin um registro de service worker de mentira. */
function ligar(update: () => Promise<unknown>) {
  registro.chamadas = []
  registrarAplicativo(vi.fn())
  const opcoes = registro.chamadas[0]
  const sw = { update: vi.fn(update) } as unknown as ServiceWorkerRegistration
  opcoes?.onRegisteredSW?.('/sw.js', sw)
  return sw.update as ReturnType<typeof vi.fn>
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  mudarVisibilidade('visible')
  vi.useRealTimers()
})

describe('conferir a versão nova (CA-888b)', () => {
  it('a cada 60 minutos, pede ao navegador a versão nova', async () => {
    const update = ligar(() => Promise.resolve())
    expect(update).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(CONFERIR_VERSAO_A_CADA_MS - 1)
    expect(update).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(CONFERIR_VERSAO_A_CADA_MS)
    expect(update).toHaveBeenCalledTimes(2)
    expect(CONFERIR_VERSAO_A_CADA_MS).toBe(60 * 60 * 1000)
  })

  it('quando a aba volta para a frente, confere; quando vai para trás, não', () => {
    const update = ligar(() => Promise.resolve())
    mudarVisibilidade('hidden')
    expect(update).not.toHaveBeenCalled()
    mudarVisibilidade('visible')
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('sem internet, a conferência falha em silêncio e tenta de novo na próxima vez', async () => {
    const update = ligar(() => Promise.reject(new Error('offline')))
    mudarVisibilidade('visible')
    await vi.advanceTimersByTimeAsync(CONFERIR_VERSAO_A_CADA_MS)
    expect(update).toHaveBeenCalledTimes(2)
  })

  it('sem registro do service worker (navegador sem suporte), não faz nada', () => {
    registro.chamadas = []
    registrarAplicativo(vi.fn())
    expect(() => registro.chamadas[0]?.onRegisteredSW?.('/sw.js', undefined)).not.toThrow()
  })
})

import { PRAZO_DA_TRAVA_MS, travaEntreAbas, type Travas } from './travaEntreAbas.ts'

/** Um `navigator.locks` de mentira: a trava só é dada quando `soltar()` é chamado, e respeita o sinal de desistir. */
function travasFalsas(): Travas & { pedidos: number; soltar(): void } {
  let liberar: (() => void) | null = null
  const travas = {
    pedidos: 0,
    soltar() {
      liberar?.()
    },
    request<T>(_nome: string, opcoes: { signal?: AbortSignal }, fazer: () => Promise<T>): Promise<T> {
      travas.pedidos += 1
      return new Promise<T>((resolver, rejeitar) => {
        opcoes.signal?.addEventListener('abort', () => rejeitar(new DOMException('desistiu', 'AbortError')))
        liberar = () => void fazer().then(resolver, rejeitar)
      })
    },
  }
  return travas
}

describe('trava entre abas (spec dados-na-nuvem, DP-28)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sem navigator.locks, cada aba segue na própria fila, como com a trava', async () => {
    const { trancar } = travaEntreAbas(undefined, 'conta-a')
    expect(trancar).toBeUndefined()
  })

  it('com a trava dada, roda com a trava', async () => {
    const travas = travasFalsas()
    const { trancar } = travaEntreAbas(travas, 'conta-a')
    if (!trancar) throw new Error('sem trava')
    const feito = trancar(async (comTrava) => comTrava)
    travas.soltar()
    expect(await feito).toBe(true)
  })

  it('uma aba congelada não prende as outras: sem a trava no prazo, segue sem ela (e quem chama confere a versão)', async () => {
    const travas = travasFalsas()
    const { trancar } = travaEntreAbas(travas, 'conta-a')
    if (!trancar) throw new Error('sem trava')
    const feito = trancar(async (comTrava) => comTrava)
    await vi.advanceTimersByTimeAsync(PRAZO_DA_TRAVA_MS)
    expect(await feito).toBe(false)
  })
})

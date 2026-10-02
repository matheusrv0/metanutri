import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { TelaVoltaPagamento } from './TelaVoltaPagamento.tsx'

const assinatura = (sobre: Partial<Assinatura>): Assinatura => ({ ...SEM_ASSINATURA, ...sobre })

function montar(a: Assinatura, carregado = true) {
  const props = { assinatura: a, carregado, recarregar: vi.fn(), aoIrParaPainel: vi.fn(), aoTentarDeNovo: vi.fn() }
  const tela = render(<TelaVoltaPagamento {...props} />)
  return { ...props, ...tela }
}

describe('TelaVoltaPagamento', () => {
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(globalThis.navigator, 'onLine')
  })

  it('enquanto confere, diz isso', () => {
    montar(SEM_ASSINATURA, false)
    expect(screen.getByRole('heading', { level: 1, name: /Conferindo o pagamento/ })).toBeInTheDocument()
  })

  it('CA-166: assinatura ativa, com o nome do plano', async () => {
    const { aoIrParaPainel } = montar(assinatura({ plano: 'solo', planoPedido: 'solo', status: 'ativa' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
    expect(screen.getByText(/Seu plano agora é o Solo/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(aoIrParaPainel).toHaveBeenCalledOnce()
  })

  it('CA-167: em análise confere de 10 em 10 segundos e, passados 10 minutos, oferece conferir de novo', () => {
    vi.useFakeTimers()
    const pendente = assinatura({ planoPedido: 'solo', status: 'pendente' })
    const { recarregar, rerender } = montar(pendente)
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento em análise' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10_000))
    expect(recarregar).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 10 * 60_000)
    rerender(<TelaVoltaPagamento assinatura={{ ...pendente }} carregado recarregar={recarregar} aoIrParaPainel={vi.fn()} aoTentarDeNovo={vi.fn()} />)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('button', { name: 'Conferir de novo' })).toBeInTheDocument()
  })

  it('CA-168: quando confirma, a tela muda sozinha', () => {
    const { rerender, recarregar } = montar(assinatura({ planoPedido: 'pro', status: 'pendente' }))
    rerender(
      <TelaVoltaPagamento assinatura={assinatura({ plano: 'pro', planoPedido: 'pro', status: 'ativa' })} carregado recarregar={recarregar} aoIrParaPainel={vi.fn()} aoTentarDeNovo={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
  })

  it('CA-169: não concluído avisa que nada foi cobrado e reabre o mesmo plano', async () => {
    const { aoTentarDeNovo } = montar(assinatura({ planoPedido: 'pro', status: 'cancelada' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento não concluído' })).toBeInTheDocument()
    expect(screen.getByText(/Nada foi cobrado/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(aoTentarDeNovo).toHaveBeenCalledWith('pro')
  })

  it('CA-170: sem internet, avisa e deixa conferir de novo', async () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    const { recarregar } = montar(assinatura({ planoPedido: 'solo', status: 'pendente' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Não consegui conferir' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferir de novo' }))
    expect(recarregar).toHaveBeenCalled()
  })

  it('CA-381 e CA-383: nenhum estado cita o processador nem usa ícone de biblioteca', () => {
    const estados: [Assinatura, boolean][] = [
      [SEM_ASSINATURA, false],
      [assinatura({ plano: 'solo', planoPedido: 'solo', status: 'ativa' }), true],
      [assinatura({ planoPedido: 'solo', status: 'pendente' }), true],
      [assinatura({ planoPedido: 'pro', status: 'cancelada' }), true],
    ]
    for (const [a, carregado] of estados) {
      const { container, unmount } = montar(a, carregado)
      expect(container.textContent).not.toMatch(/mercado ?pago/i)
      expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
      unmount()
    }
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    const { container } = montar(assinatura({ planoPedido: 'solo', status: 'pendente' }))
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
})

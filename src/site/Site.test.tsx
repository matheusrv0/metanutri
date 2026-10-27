import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EstadoDaMudanca, Remetente } from './remetente.ts'
import { Site } from './Site.tsx'

const APP = 'https://app.metanutri.com.br/'
const TITULO = 'O MetaNutri mudou para app.metanutri.com.br'

/** Um remetente de mentira: "Continuar" só muda o estado. */
function remetenteFalso(): Remetente & { definir(estado: EstadoDaMudanca): void } {
  let estado: EstadoDaMudanca = 'parado'
  const ouvintes = new Set<() => void>()
  const definir = (novo: EstadoDaMudanca) => {
    estado = novo
    for (const ouvir of ouvintes) ouvir()
  }
  return {
    get estado() {
      return estado
    },
    assinar(ouvir) {
      ouvintes.add(ouvir)
      return () => void ouvintes.delete(ouvir)
    },
    continuar: vi.fn(() => definir('esperando')),
    desligar: vi.fn(),
    definir,
  }
}

describe('o site (spec separacao-site-app, D-527 e DP-SA-53)', () => {
  it('D-501: sem dado só aqui, "Entrar" vai direto ao app', async () => {
    const irAoApp = vi.fn()
    render(<Site rota="precos" destaque={null} remetente={null} comecarEmContinuar={false} irAoApp={irAoApp} />)
    await userEvent.setup().click(within(screen.getByRole('banner')).getByRole('link', { name: 'Entrar' }))
    expect(irAoApp).toHaveBeenCalledWith(APP)
    expect(screen.queryByText(TITULO)).not.toBeInTheDocument()
  })

  it.each([
    ['Entrar', 'precos'],
    ['Começar grátis', 'precos'],
    ['Criar conta grátis', 'inicio'],
  ] as const)('CA-1429: com dado só aqui, "%s" abre "Continuar" em vez de ir ao app', async (nome, rota) => {
    const irAoApp = vi.fn()
    render(<Site rota={rota} destaque={null} remetente={remetenteFalso()} comecarEmContinuar={false} irAoApp={irAoApp} />)
    const [alvo] = [...screen.queryAllByRole('link', { name: nome }), ...screen.queryAllByRole('button', { name: nome })]
    if (!alvo) throw new Error(`sem ${nome}`)
    await userEvent.setup().click(alvo)
    expect(irAoApp).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITULO)
  })

  it('CA-1429: com dado só aqui, um plano também abre "Continuar"', async () => {
    const irAoApp = vi.fn()
    render(<Site rota="precos" destaque={null} remetente={remetenteFalso()} comecarEmContinuar={false} irAoApp={irAoApp} />)
    const [solo] = screen.getAllByRole('button', { name: 'Assinar Solo' })
    if (!solo) throw new Error('sem o plano')
    await userEvent.setup().click(solo)
    expect(irAoApp).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITULO)
  })

  it('CA-1429: tela do app, volta ou ícone com dado só aqui começam em "Continuar"', () => {
    render(<Site rota="inicio" destaque={null} remetente={remetenteFalso()} comecarEmContinuar irAoApp={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITULO)
    expect(screen.getByRole('status')).toHaveTextContent('Clique em Continuar e entre na sua conta. Os dados deste navegador vão junto.')
  })

  it('CA-1430 e CA-1436: "Continuar" chama o remetente, e a tela acompanha o estado dele até o fim', async () => {
    const remetente = remetenteFalso()
    render(<Site rota="inicio" destaque={null} remetente={remetente} comecarEmContinuar irAoApp={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar' }))
    expect(remetente.continuar).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent('Entre na sua conta na aba que abriu. Deixe esta aba aberta.')
    act(() => remetente.definir('pronto'))
    expect(screen.getByRole('status')).toHaveTextContent('Pronto. Pode fechar esta aba.')
  })
})

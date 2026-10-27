import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EstadoDaMudanca } from './remetente.ts'
import { TelaContinuar } from './TelaContinuar.tsx'

const TITULO = 'O MetaNutri mudou para app.metanutri.com.br'

describe('a tela "Continuar" do site (spec separacao-site-app, D-526 e D-527)', () => {
  it.each([
    ['parado', 'Clique em Continuar e entre na sua conta. Os dados deste navegador vão junto.'],
    ['esperando', 'Entre na sua conta na aba que abriu. Deixe esta aba aberta.'],
    ['bloqueada', 'O navegador bloqueou a aba nova. Permita janelas deste site e clique em Continuar.'],
  ] as const)('CA-1429, CA-1430 e CB-519: em "%s", o título, o texto exato e só o botão "Continuar"', async (estado, texto) => {
    const aoContinuar = vi.fn()
    render(<TelaContinuar estado={estado} aoContinuar={aoContinuar} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITULO)
    expect(screen.getByRole('status')).toHaveTextContent(texto)
    // D-527: nenhuma outra saída.
    expect(screen.getAllByRole('button').map((botao) => botao.textContent)).toEqual(['Continuar'])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar' }))
    expect(aoContinuar).toHaveBeenCalledOnce()
  })

  it('CA-1436: no fim, "Pronto. Pode fechar esta aba.", sem botão', () => {
    render(<TelaContinuar estado="pronto" aoContinuar={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Pronto. Pode fechar esta aba.')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('D-526: texto mínimo, sem explicar o motivo nem falar em segurança', () => {
    for (const estado of ['parado', 'esperando', 'bloqueada', 'pronto'] as readonly EstadoDaMudanca[]) {
      const { unmount } = render(<TelaContinuar estado={estado} aoContinuar={vi.fn()} />)
      expect(document.body.textContent).not.toMatch(/segurança|nuvem|motivo/i)
      unmount()
    }
  })
})

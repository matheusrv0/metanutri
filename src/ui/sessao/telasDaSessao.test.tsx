import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvisoDeInatividade } from './AvisoDeInatividade.tsx'
import { CapaEncerrando } from './CapaEncerrando.tsx'
import { ContextoFimDaSessao } from './contextoSessao.ts'
import { FaixaDoLimite } from './FaixaDoLimite.tsx'

describe('as telas da sessão (spec separacao-site-app, D-526)', () => {
  it('CA-1442: o aviso diz "Você ainda está aí?" e "A sessão termina em 2 minutos.", com "Continuar" em foco', async () => {
    const aoContinuar = vi.fn()
    render(<AvisoDeInatividade aberto aoContinuar={aoContinuar} />)
    const janela = screen.getByRole('dialog', { name: 'Você ainda está aí?' })
    expect(janela).toHaveAccessibleDescription('A sessão termina em 2 minutos.')
    const continuar = screen.getByRole('button', { name: 'Continuar' })
    expect(continuar).toHaveFocus()
    await userEvent.setup().click(continuar)
    expect(aoContinuar).toHaveBeenCalled()
  })

  it('CA-1442: Esc fecha o aviso como "Continuar"', async () => {
    const aoContinuar = vi.fn()
    render(<AvisoDeInatividade aberto aoContinuar={aoContinuar} />)
    await userEvent.setup().keyboard('{Escape}')
    expect(aoContinuar).toHaveBeenCalled()
  })

  it('fechado, o aviso não aparece', () => {
    render(<AvisoDeInatividade aberto={false} aoContinuar={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-1444: a faixa diz "A sessão termina às 21:42.", sem botão de estender', () => {
    render(
      <ContextoFimDaSessao.Provider value={new Date(2026, 9, 27, 21, 42).getTime()}>
        <FaixaDoLimite />
      </ContextoFimDaSessao.Provider>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('A sessão termina às 21:42.')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('CA-1444: a faixa fica no fluxo da página, sem cobrir nada (não é janela nem fixa)', () => {
    const { container } = render(
      <ContextoFimDaSessao.Provider value={new Date(2026, 9, 27, 21, 42).getTime()}>
        <FaixaDoLimite />
      </ContextoFimDaSessao.Provider>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.innerHTML).not.toMatch(/\bfixed\b|\babsolute\b/)
  })

  it('sem a hora do fim (longe do limite, ou fora do vigia), a faixa não aparece', () => {
    const { container } = render(<FaixaDoLimite />)
    expect(container).toBeEmptyDOMElement()
  })

  it('CA-1447: a capa diz "Encerrando a sessão…" e não fecha', async () => {
    render(<CapaEncerrando />)
    expect(screen.getByRole('dialog', { name: 'Encerrando a sessão…' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    await userEvent.setup().keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Encerrando a sessão…' })).toBeInTheDocument()
  })

  it('D-526: nenhum texto fala em segurança', () => {
    render(
      <ContextoFimDaSessao.Provider value={Date.now()}>
        <AvisoDeInatividade aberto aoContinuar={vi.fn()} />
        <FaixaDoLimite />
        <CapaEncerrando />
      </ContextoFimDaSessao.Provider>,
    )
    expect(document.body.textContent).not.toMatch(/segurança/i)
  })
})

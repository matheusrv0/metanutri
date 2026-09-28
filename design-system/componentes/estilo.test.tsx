import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { RotuloSecao } from '@ds/componentes/display/RotuloSecao.tsx'

describe('CartaoNumero (CA-106, CA-107)', () => {
  it('sem destino não é botão e não tem seta', () => {
    const { container } = render(<CartaoNumero valor="9" rotulo="Dias trabalhados" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('com destino, o cartão inteiro é um botão com a seta', async () => {
    const aoClicar = vi.fn()
    const { container } = render(<CartaoNumero valor="12" rotulo="Planos" apoio="7 mexidos em 14 dias" aoClicar={aoClicar} />)
    expect(container.querySelector('svg')).not.toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: /12\s*Planos/ }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  it('o tom teal usa a superfície da marca', () => {
    const { container } = render(<CartaoNumero valor="2" rotulo="Precisa de atenção" tom="teal" />)
    expect(container.firstElementChild?.className).toContain('bg-surfacebrand')
  })
})

describe('RotuloSecao', () => {
  it('mostra o texto, com o ponto laranja escondido do leitor de tela', () => {
    const { container } = render(<RotuloSecao>Como funciona</RotuloSecao>)
    expect(screen.getByText('Como funciona')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain('bg-laranja')
  })
})

describe('LinhaLista', () => {
  it('parada, é só uma linha', () => {
    render(<LinhaLista titulo="1 plano sem nome" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clicável, a linha inteira é o botão', async () => {
    const aoClicar = vi.fn()
    render(<LinhaLista titulo="Ana · reeducação" detalhe="há 2 horas" aoClicar={aoClicar} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Ana · reeducação/ }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })
})

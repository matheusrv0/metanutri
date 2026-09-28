import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnelProgresso } from '@ds/componentes/display/AnelProgresso.tsx'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { RotuloSecao } from '@ds/componentes/display/RotuloSecao.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'

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

describe('SeletorSegmentado', () => {
  it('marca a opção atual e avisa a escolha', async () => {
    const aoEscolher = vi.fn()
    render(
      <SeletorSegmentado
        rotulo="Período de cobrança"
        opcoes={[
          { valor: 'mensal', rotulo: 'Mensal' },
          { valor: 'anual', rotulo: 'Anual' },
        ]}
        valor="mensal"
        aoEscolher={aoEscolher}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Anual' }))
    expect(aoEscolher).toHaveBeenCalledWith('anual')
  })
})

describe('AnelProgresso', () => {
  it('é uma barra de progresso com o valor escrito no meio', () => {
    render(
      <AnelProgresso valor={2} maximo={5} rotulo="Missões feitas hoje">
        <span>2/5</span>
      </AnelProgresso>,
    )
    const anel = screen.getByRole('progressbar', { name: 'Missões feitas hoje' })
    expect(anel).toHaveAttribute('aria-valuenow', '2')
    expect(anel).toHaveAttribute('aria-valuemax', '5')
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })

  it('não passa de 100% nem quebra com máximo zero', () => {
    const { rerender } = render(<AnelProgresso valor={9} maximo={5} rotulo="x" />)
    expect(screen.getByRole('progressbar').style.getPropertyValue('--anel-pct')).toBe('100%')
    rerender(<AnelProgresso valor={1} maximo={0} rotulo="x" />)
    expect(screen.getByRole('progressbar').style.getPropertyValue('--anel-pct')).toBe('0%')
  })
})

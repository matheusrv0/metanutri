import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AnelProgresso } from '@ds/componentes/display/AnelProgresso.tsx'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'

describe('CartaoNumero (CA-106, CA-107)', () => {
  it('o encaixe extra aparece entre o valor e o rótulo', () => {
    render(<CartaoNumero valor="18 de 25" rotulo="Pacientes ativos" extra={<span>barra</span>} />)
    const valor = screen.getByText('18 de 25')
    const extra = screen.getByText('barra')
    const rotulo = screen.getByText('Pacientes ativos')
    expect(valor.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(extra.compareDocumentPosition(rotulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

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

  // Spec antropometria-telas, D-1533 e CB-1470 (revisão r1 da F2, B2): o padrão Radio Group do WAI-ARIA APG.
  function Controlado({ inicial }: { readonly inicial: 'frente' | 'lado' | 'costas' | 'nenhum' }) {
    const [valor, setValor] = useState(inicial)
    return (
      <>
        <button type="button">Antes</button>
        <SeletorSegmentado
          rotulo="Ângulo"
          opcoes={[
            { valor: 'frente', rotulo: 'Frente' },
            { valor: 'lado', rotulo: 'Lado' },
            { valor: 'costas', rotulo: 'Costas' },
          ]}
          valor={valor}
          aoEscolher={setValor}
        />
        <button type="button">Depois</button>
      </>
    )
  }

  it('CB-1470: o Tab para uma vez só, na opção marcada, e o próximo Tab sai do grupo', async () => {
    const usuario = userEvent.setup()
    render(<Controlado inicial="lado" />)
    await usuario.click(screen.getByRole('button', { name: 'Antes' }))
    await usuario.tab()
    expect(screen.getByRole('radio', { name: 'Lado' })).toHaveFocus()
    await usuario.tab()
    expect(screen.getByRole('button', { name: 'Depois' })).toHaveFocus()
    await usuario.tab({ shift: true })
    expect(screen.getByRole('radio', { name: 'Lado' })).toHaveFocus()
    expect(screen.getByRole('radio', { name: 'Frente' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('radio', { name: 'Costas' })).toHaveAttribute('tabindex', '-1')
  })

  it('CB-1470: as setas passam à vizinha, dando a volta, e já escolhem; Home e End vão às pontas', async () => {
    const usuario = userEvent.setup()
    render(<Controlado inicial="frente" />)
    await usuario.click(screen.getByRole('radio', { name: 'Frente' }))
    const marcada = () => screen.getAllByRole('radio').find((r) => r.getAttribute('aria-checked') === 'true')?.textContent
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Lado' })).toHaveFocus()
    expect(marcada()).toBe('Lado')
    await usuario.keyboard('{ArrowDown}')
    expect(marcada()).toBe('Costas')
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Frente' })).toHaveFocus()
    expect(marcada()).toBe('Frente')
    await usuario.keyboard('{ArrowLeft}')
    expect(marcada()).toBe('Costas')
    await usuario.keyboard('{ArrowUp}')
    expect(marcada()).toBe('Lado')
    await usuario.keyboard('{Home}')
    expect(screen.getByRole('radio', { name: 'Frente' })).toHaveFocus()
    expect(marcada()).toBe('Frente')
    await usuario.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Costas' })).toHaveFocus()
    expect(marcada()).toBe('Costas')
    expect(screen.getByRole('radio', { name: 'Costas' })).toHaveAttribute('tabindex', '0')
  })

  it('CB-1470: sem nenhuma opção marcada, o Tab para na primeira', async () => {
    const usuario = userEvent.setup()
    render(<Controlado inicial="nenhum" />)
    await usuario.click(screen.getByRole('button', { name: 'Antes' }))
    await usuario.tab()
    expect(screen.getByRole('radio', { name: 'Frente' })).toHaveFocus()
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

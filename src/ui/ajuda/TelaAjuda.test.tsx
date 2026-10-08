import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import { TelaAjuda } from './TelaAjuda.tsx'

const NUVEM_PRONTA: ValorNuvem = {
  estado: { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0 },
  salvarAgora: async () => true,
  reduzir: () => undefined,
  parar: () => undefined,
}

describe('Ajuda', () => {
  it('mostra os cinco primeiros passos em ordem', () => {
    render(<TelaAjuda aoIrPara={vi.fn()} />)
    const passos = screen.getAllByRole('listitem')
    expect(screen.getByText('Cadastre o paciente')).toBeInTheDocument()
    expect(screen.getByText('Entregue')).toBeInTheDocument()
    expect(passos.length).toBeGreaterThanOrEqual(5)
  })

  it('lista as fontes com link, e a base de alimentos leva para Fontes da base', async () => {
    const aoIrPara = vi.fn()
    render(<TelaAjuda aoIrPara={aoIrPara} />)
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
    expect(screen.getByText('Base MetaNutri')).toBeInTheDocument()
    expect(screen.getByText(/Open Food Facts/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Abrir/ }).length).toBeGreaterThan(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fontes da base' }))
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
  })

  it('diz o que a base não tem e o limite legal', () => {
    render(<TelaAjuda aoIrPara={vi.fn()} />)
    expect(screen.getByText(/não traz vitamina D, vitamina B12 nem folato/)).toBeInTheDocument()
    expect(screen.getByText(/privativa de nutricionista com registro no CRN/)).toBeInTheDocument()
  })

  it('leva para a tela do passo', async () => {
    const aoIrPara = vi.fn()
    render(<TelaAjuda aoIrPara={aoIrPara} />)
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Ir' })[0] as HTMLElement)
    expect(aoIrPara).toHaveBeenCalledWith('pacientes')
  })

  it('D-128 (spec dados-na-nuvem): com a conta na nuvem, a Ajuda não diz que tudo fica só neste navegador', () => {
    render(
      <ContextoNuvem.Provider value={NUVEM_PRONTA}>
        <TelaAjuda aoIrPara={vi.fn()} />
      </ContextoNuvem.Provider>,
    )
    expect(screen.getByText('Os dados ficam na nuvem, presos à sua conta. Sem internet, o MetaNutri não deixa editar até a conexão voltar.')).toBeInTheDocument()
    expect(screen.queryByText(/só neste navegador/)).not.toBeInTheDocument()
  })
})

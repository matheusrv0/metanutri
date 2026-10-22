import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextoNuvem, type ValorNuvem } from '../estado/contextoNuvem.ts'
import { TelaAjuda } from './TelaAjuda.tsx'

const NUVEM_PRONTA: ValorNuvem = {
  estado: { fase: 'pronta', pendente: false, salvando: false, trava: null, reduzindo: false, geracao: 0, conferindo: false },
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
    // CA-965 (spec vitaminas-usda): as cinco vêm do USDA, e a falta aparece com †.
    expect(
      screen.getByText(
        'Vitamina D, vitamina E, folato, vitamina B12 e selênio vêm de alimento equivalente do USDA e faltam em boa parte das preparações brasileiras. Quando o dado falta, a linha da adequação recebe †.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/não traz vitamina D/)).not.toBeInTheDocument()
    expect(screen.getByText(/privativa de nutricionista com registro no CRN/)).toBeInTheDocument()
  })

  it('CA-1196 (spec textos-e-promessas, D-413): sem promessa de tempo nem frase de efeito, com os nomes do glossário', () => {
    render(<TelaAjuda aoIrPara={vi.fn()} />)
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/Cinco minutos|Nada aqui é opinião|Dieta para imprimir|use o cobrir|fechar a falta|nascem com/)
    expect(screen.getByText('Veja os nutrientes abaixo da meta e use o botão Cobrir.')).toBeInTheDocument()
    expect(screen.getByText('O plano impresso é salvo em PDF pelo próprio navegador; o aconselhamento e o memorial são gerados em Word.')).toBeInTheDocument()
    // O exemplo da entrada rápida é o da frente alimentos-e-gramaturas (medida digitada, CA da busca); as aspas e o
    // "aparecem" são do glossário.
    expect(screen.getByText('Digite “1 concha de feijão” e tecle Enter. A medida, os gramas e as kcal aparecem juntos.')).toBeInTheDocument()
    expect(screen.getByText('Açúcares e gordura saturada só aparecem nos produtos cadastrados pelo rótulo.')).toBeInTheDocument()
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
    expect(screen.getByText('Seus dados ficam salvos na sua conta, na nuvem. Sem internet, a edição fica travada até a conexão voltar.')).toBeInTheDocument()
    expect(screen.queryByText(/só neste navegador/)).not.toBeInTheDocument()
  })
})

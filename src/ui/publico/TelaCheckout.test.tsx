import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import type { Ciclo } from '@/domain/conta.ts'
import type { PlanoPago } from '../navegacao.ts'
import { TelaCheckout } from './TelaCheckout.tsx'

function montar(sobre: { plano?: PlanoPago; ciclo?: Ciclo; vagas?: number | null; assinatura?: Assinatura; aoPagar?: () => Promise<string | null> } = {}) {
  const props = {
    plano: sobre.plano ?? ('solo' as const),
    ciclo: sobre.ciclo ?? ('mensal' as const),
    email: 'maria@exemplo.com',
    assinaturaAtual: sobre.assinatura ?? SEM_ASSINATURA,
    vagasRestantes: sobre.vagas === undefined ? 186 : sobre.vagas,
    disponivel: true,
    aoTrocar: vi.fn(),
    aoPagar: vi.fn(sobre.aoPagar ?? (async () => null)),
    aoIrParaPainel: vi.fn(),
    aoIrParaInicio: vi.fn(),
  }
  render(<TelaCheckout {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

describe('TelaCheckout', () => {
  it('CA-157: passo 2 de 3, escolha do ciclo e do plano, o que inclui e o resumo', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Revise sua assinatura' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toBeInTheDocument()
    expect(screen.getAllByText('25 pacientes ativos').length).toBeGreaterThan(0)
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    expect(resumo).toHaveTextContent('maria@exemplo.com')
    expect(resumo).toHaveTextContent('R$ 34,90')
  })

  it('CA-158: trocar o ciclo ou o plano avisa quem manda', async () => {
    const { usuario, aoTrocar } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    expect(aoTrocar).toHaveBeenCalledWith('solo', 'anual')
    await usuario.click(screen.getByRole('radio', { name: /Pro/ }))
    expect(aoTrocar).toHaveBeenCalledWith('pro', 'mensal')
  })

  it('CA-159: no anual, mostra o ano, quanto sai por mês e o desconto', () => {
    montar({ ciclo: 'anual' })
    expect(screen.getByRole('region', { name: 'Resumo' })).toHaveTextContent('R$ 299,00')
    expect(screen.getByText(/Sai R\$ 24,92 por mês/)).toBeInTheDocument()
    expect(screen.getByText('−29%')).toBeInTheDocument()
  })

  it('CA-160: vagas de fundador sobrando mostram a contagem', () => {
    montar({ vagas: 186 })
    expect(screen.getByText(/Restam 186 de 200 vagas/)).toBeInTheDocument()
  })

  it('CA-160: sem contagem do servidor, o aviso aparece sem número', () => {
    montar({ vagas: null })
    expect(screen.getByText(/Preço de fundador/)).toBeInTheDocument()
    expect(screen.queryByText(/Restam/)).not.toBeInTheDocument()
  })

  it('CA-160: vagas esgotadas somem com o aviso', () => {
    montar({ vagas: 0 })
    expect(screen.queryByText(/Preço de fundador/)).not.toBeInTheDocument()
  })

  it('CA-161: pagar manda o plano e o ciclo', async () => {
    const { usuario, aoPagar } = montar({ plano: 'pro', ciclo: 'anual' })
    await usuario.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    expect(aoPagar).toHaveBeenCalledWith('pro', 'anual')
  })

  it('CA-162: erro de cobrança aparece e o botão volta', async () => {
    const { usuario } = montar({ aoPagar: async () => 'O Mercado Pago não aceitou agora.' })
    await usuario.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    expect(screen.getByRole('alert')).toHaveTextContent('O Mercado Pago não aceitou agora.')
    expect(screen.getByRole('button', { name: 'Pagar com Mercado Pago' })).toBeEnabled()
  })

  it('CA-163: quem já assina não vê o botão de pagar', () => {
    montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'ativa' } })
    expect(screen.queryByRole('button', { name: 'Pagar com Mercado Pago' })).not.toBeInTheDocument()
    expect(screen.getByText(/Você já tem uma assinatura ativa: Solo/)).toBeInTheDocument()
  })

  it('CA-165: explica que o pagamento termina no Mercado Pago, com cartão', () => {
    montar()
    expect(screen.getByText(/Nenhum dado de cartão passa pelo MetaNutri/)).toBeInTheDocument()
  })

  it('CB-43: clique duplo em pagar vai ao Mercado Pago uma vez só', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const { usuario, aoPagar } = montar({ aoPagar: () => new Promise((resolver) => (terminar = resolver)) })
    await usuario.dblClick(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    terminar(null)
    expect(aoPagar).toHaveBeenCalledTimes(1)
  })

  it('quem tem Estudante ativa vê o aviso de que ele deixa de valer, e o botão de pagar continua', () => {
    montar({ assinatura: { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa' } })
    expect(screen.getByRole('status')).toHaveTextContent('Você está no plano Estudante. Ao assinar, ele deixa de valer, e até o pagamento confirmar vale o Free.')
    expect(screen.getByRole('button', { name: 'Pagar com Mercado Pago' })).toBeInTheDocument()
  })
})

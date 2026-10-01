import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecaoPrecos } from './SecaoPrecos.tsx'

// O NumberFlow de verdade é um custom element com shadow DOM e Web Animations API: no
// jsdom ele monta, mas quebra ao atualizar o valor (troca de ciclo), porque o elemento
// nunca chega a ser "upgraded" de verdade. Troca por um span simples só nos testes.
vi.mock('@number-flow/react', () => ({
  default: ({ value, className }: { readonly value: number; readonly className?: string }) => <span className={className}>{value}</span>,
}))

// jsdom não implementa IntersectionObserver; o TimelineContent (useInView do framer-motion)
// chama o construtor assim que monta. Sem este dublê, todo render desta tela quebra.
class ObservadorFalso implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: readonly number[] = []
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}
vi.stubGlobal('IntersectionObserver', ObservadorFalso)

const primeiro = (nome: string) => {
  const botao = screen.getAllByRole('button', { name: nome })[0]
  if (!botao) throw new Error(`sem botão ${nome}`)
  return botao
}

describe('SecaoPrecos', () => {
  it('CA-121: mantém a chave mensal/anual e a comparação', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /Comparativo dos planos/ })).toBeInTheDocument()
  })

  it('CA-122: o botão do Solo leva o plano e o ciclo escolhidos', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    await usuario.click(primeiro('Assinar Solo'))
    expect(aoEscolher).toHaveBeenCalledWith('solo', 'anual')
  })

  it('CA-125: o Estudante tem o próprio botão, e a nota fala do comprovante', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    expect(screen.getAllByText(/comprovante de matrícula/).length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('uso não comercial: a tela do paciente avisa que não é atendimento profissional.')
    expect(document.body.textContent).not.toContain('PDF sai marcado')
    await userEvent.setup().click(primeiro('Usar o e-mail da faculdade'))
    expect(aoEscolher).toHaveBeenCalledWith('estudante', 'mensal')
  })

  it('CA-126: o Clínica mostra o contato e não tem botão', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.queryByRole('button', { name: /Clínica/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('contato@exemplo.com').length).toBeGreaterThan(0)
  })

  it('D-46: sem contato ainda, o Clínica diz que está chegando', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato={null} />)
    expect(screen.getAllByText('Contato em breve.').length).toBeGreaterThan(0)
  })

  it('CA-177: o destaque vindo do aviso de limite troca o "Mais escolhido"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" destaque="pro" />)
    const cabecalhos = screen.getAllByRole('columnheader')
    const doPro = cabecalhos.find((c) => c.textContent?.includes('Pro'))
    expect(doPro?.textContent).toContain('Mais escolhido')
  })
})

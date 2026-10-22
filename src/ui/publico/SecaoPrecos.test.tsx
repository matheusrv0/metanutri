import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecaoPrecos } from './SecaoPrecos.tsx'

const primeiro = (nome: string) => {
  const botao = screen.getAllByRole('button', { name: nome })[0]
  if (!botao) throw new Error(`sem botão ${nome}`)
  return botao
}

describe('SecaoPrecos', () => {
  it('CA-483 (spec dados-na-nuvem): a página de preços não oferece "Dados em qualquer aparelho"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(document.body.textContent).not.toContain('Dados em qualquer aparelho')
  })

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
    await userEvent.setup().click(primeiro('Criar conta de estudante'))
    expect(aoEscolher).toHaveBeenCalledWith('estudante', 'mensal')
  })

  it('CA-126: o Clínica mostra o contato e não tem botão', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.queryByRole('button', { name: /Clínica/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('contato@exemplo.com').length).toBeGreaterThan(0)
  })

  it('D-46 e CB-385: sem contato ainda, a nota da Clínica diz que está chegando', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato={null} />)
    expect(screen.getAllByRole('note', { name: 'Plano Clínica' })[0]).toHaveTextContent('Clínica com mais de um nutricionista: contato em breve.')
  })

  it('CA-1178 e D-406: a Clínica é uma nota de contato, sem preço nem recurso, com o e-mail como link', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    const nota = screen.getAllByRole('note', { name: 'Plano Clínica' })[0]
    expect(nota).toHaveTextContent('Clínica com mais de um nutricionista: fale com a gente pelo e-mail contato@exemplo.com.')
    expect(within(nota as HTMLElement).getByRole('link', { name: 'contato@exemplo.com' })).toHaveAttribute('href', 'mailto:contato@exemplo.com')
    expect(document.body.textContent).not.toMatch(/149|Até 4|WhatsApp|Painel do gestor|compartilhados/)
  })

  it('CA-1178: a tabela compara Free, Solo e Pro; as linhas são os limites e o que vem em todas, sem suporte', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    const tabela = screen.getByRole('table')
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent?.match(/^(Free|Solo|Pro)/)?.[0] ?? '')).toEqual(['', 'Free', 'Solo', 'Pro'])
    const linhas = within(tabela).getAllByRole('rowheader').map((c) => c.firstChild?.textContent)
    expect(linhas).toEqual([
      'Pacientes ativos',
      'Links do paciente',
      'Adequação de 20 vitaminas e minerais e da fibra, com o botão Cobrir',
      'Missões diárias no link do paciente e tela Adesão',
      'Plano impresso em PDF; aconselhamento e memorial em Word',
      'Seu logotipo nos documentos impressos',
      'Meus alimentos e receitas com cálculo',
    ])
    expect(within(tabela).queryByText('Suporte')).not.toBeInTheDocument()
    expect(within(tabela).queryAllByText('Não incluído')).toHaveLength(0)
  })

  it('CA-177: o destaque vindo do aviso de limite troca o "Recomendado"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" destaque="pro" />)
    const cabecalhos = screen.getAllByRole('columnheader')
    const doPro = cabecalhos.find((c) => c.textContent?.includes('Pro'))
    expect(doPro?.textContent).toContain('Recomendado')
  })

  it('D-79: o selo do destaque não inventa métrica de uso', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(document.body.textContent).not.toContain('Mais escolhido')
    expect(screen.getAllByText('Recomendado').length).toBeGreaterThan(0)
  })

  it('D-79 e D-407: o texto de cima diz que as funções são as mesmas e o que muda, sem repetir a definição da linha da tabela', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.getByText('Todas as assinaturas têm as mesmas funções. O que muda é quantos pacientes ativos você acompanha.')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Quem teve plano alimentar ou missão nos últimos 30 dias.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('—')
  })

  it('D-79: no celular, a lista de cada plano também explica o que é paciente ativo', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(within(screen.getByRole('region', { name: 'Plano Free' })).getByText('Quem teve plano alimentar ou missão nos últimos 30 dias.')).toBeInTheDocument()
  })

  it('D-79: "cancela quando quiser" aparece uma vez, na nota de baixo; o Free não promete "para sempre"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    const texto = document.body.textContent ?? ''
    expect(texto.match(/cancel/gi)).toHaveLength(1)
    expect(texto).not.toMatch(/para sempre/i)
    expect(screen.getAllByText('Sem cartão.').length).toBeGreaterThan(0)
  })

  it('D-79: a nota do Estudante chama o plano grátis pelo nome da coluna, Free', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(document.body.textContent).toContain('Com o comprovante aprovado, o limite do Free sobe para 10 pacientes e 3 links, por 12 meses ou até a formatura, o que vier antes.')
  })

  it('CA-381: a nota de pagamento fala de cartão de crédito no site e não cita o processador', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText('O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura.')).toBeInTheDocument()
  })

  it('CA-743 (spec revisao-geral-publica): o título é o único h1, e os cartões do celular têm h2', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0]).toHaveTextContent('Planos e preços')
    for (const plano of ['Free', 'Solo', 'Pro']) {
      expect(within(screen.getByRole('region', { name: `Plano ${plano}` })).getByRole('heading', { level: 2, name: plano })).toBeInTheDocument()
    }
  })

  it('CA-742 (spec revisao-geral-publica): a tabela só aparece a partir de 1024 px; abaixo, os cartões', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    const tabela = screen.getByRole('table')
    expect(tabela.parentElement?.className).toMatch(/(^|\s)hidden(\s|$)/)
    expect(tabela.parentElement?.className).toContain('lg:block')
    expect(tabela.parentElement?.className).not.toContain('md:block')
    const cartoes = screen.getByRole('region', { name: 'Plano Free' }).parentElement
    expect(cartoes?.className).toContain('lg:hidden')
    expect(cartoes?.className).not.toContain('md:hidden')
  })

  it('CA-743 (spec revisao-geral-publica): no celular, cada opção de Mensal e Anual tem 44 px', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    for (const opcao of within(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).getAllByRole('radio')) {
      expect(opcao.className).toContain('h-11')
      expect(opcao.className).toContain('sm:h-10')
    }
  })

  it('D-234 e A-24 (spec revisao-geral-publica): os cartões da mesma linha têm a mesma altura', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    for (const plano of ['Free', 'Solo', 'Pro']) expect(screen.getByRole('region', { name: `Plano ${plano}` }).className).toContain('h-full')
  })

  it('CA-997 (spec site-publico-profissional): a nota do Estudante empilha no celular, com o botão embaixo do texto', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    for (const nota of screen.getAllByRole('note', { name: 'Plano Estudante' })) {
      expect(nota.className).toContain('flex-col')
      expect(nota.className).toContain('sm:flex-row')
      const texto = within(nota).getByText(/crie a conta com o e-mail da faculdade/).closest('p')
      // Base zero (flex-1) deixava o texto numa coluna de 63 px ao lado do botão.
      expect(texto?.className).not.toMatch(/(^|\s)flex-1(\s|$)/)
      const botao = within(nota).getByRole('button', { name: 'Criar conta de estudante' })
      expect(texto?.compareDocumentPosition(botao) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }
  })

  it('CA-998 (spec site-publico-profissional): nada espera animação para aparecer, e o preço é texto', async () => {
    const { container } = render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(container.querySelectorAll('[style*="opacity"], [style*="blur"]')).toHaveLength(0)
    expect(container.querySelector('number-flow-react')).toBeNull()
    const solo = within(screen.getByRole('region', { name: 'Plano Solo' }))
    expect(solo.getByText('34,90')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('radio', { name: /Anual/ }))
    expect(solo.getByText('24,92')).toBeInTheDocument()
    expect(solo.getByText('R$ 299 cobrados uma vez por ano.')).toBeInTheDocument()
  })

  it('CA-999 (spec site-publico-profissional): os botões dos planos são o Button do design system, sem efeito de onda', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    for (const botao of screen.getAllByRole('button', { name: /Assinar (Solo|Pro)|Começar grátis Free/ })) expect(botao.querySelector('span[style]')).toBeNull()
    expect(document.body.textContent).not.toMatch(/fundador|vagas?\b|preço travado|não sobe/i)
  })
})

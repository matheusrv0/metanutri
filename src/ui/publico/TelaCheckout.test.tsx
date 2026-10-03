import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { CAMPOS_NAO_CARREGARAM, RECUSA_PADRAO, SERVIDOR_FORA } from '@/domain/cartao.ts'
import type { Ciclo } from '@/domain/conta.ts'
import type { ResultadoDaAssinatura } from '../estado/usarAssinatura.ts'
import type { PlanoPago } from '../navegacao.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from '../pagamento/processadorFalso.test-utils.ts'
import { TelaCheckout } from './TelaCheckout.tsx'

/** 02/10/2026, meio-dia em Brasília. */
const AGORA = new Date('2026-10-02T15:00:00Z')
const ATIVA: ResultadoDaAssinatura = { ok: true, ativa: true, proximaCobranca: '2026-11-02T15:00:00.000Z' }

interface Sobre {
  readonly plano?: PlanoPago
  readonly ciclo?: Ciclo
  readonly vagas?: number | null
  readonly assinatura?: Assinatura
  readonly disponivel?: boolean
  readonly semChave?: boolean
  readonly falso?: ProcessadorFalso
  readonly aoAssinar?: () => Promise<ResultadoDaAssinatura>
}

async function montar(sobre: Sobre = {}) {
  const falso = sobre.falso ?? processadorFalso()
  const props = {
    plano: sobre.plano ?? ('solo' as const),
    ciclo: sobre.ciclo ?? ('mensal' as const),
    email: 'maria@exemplo.com',
    assinaturaAtual: sobre.assinatura ?? SEM_ASSINATURA,
    vagasRestantes: sobre.vagas === undefined ? 186 : sobre.vagas,
    disponivel: sobre.disponivel ?? true,
    criarProcessador: sobre.semChave ? null : falso.criar,
    aoTrocar: vi.fn(),
    aoAssinar: vi.fn(sobre.aoAssinar ?? (async () => ATIVA)),
    aoIrParaPainel: vi.fn(),
    aoIrParaConta: vi.fn(),
    aoIrParaInicio: vi.fn(),
    agora: AGORA,
  }
  const tela = render(<TelaCheckout {...props} />)
  // A montagem dos campos seguros termina numa promessa: espera ela antes de olhar.
  await act(async () => {})
  return { ...props, ...tela, falso, usuario: userEvent.setup() }
}

async function preencherTudo(usuario: UserEvent, falso: ProcessadorFalso) {
  falso.preencher()
  await usuario.type(screen.getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
  await usuario.type(screen.getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
  await usuario.click(screen.getByRole('checkbox', { name: /Autorizo a cobrança/ }))
}

const botaoAssinar = () => screen.getByRole('button', { name: /^Assinar por/ })
const semIconeDeBiblioteca = () => expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)

describe('TelaCheckout (spec checkout-proprio)', () => {
  it('CA-366: ciclo, planos, o formulário do cartão, o resumo, a autorização e o botão', async () => {
    await montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toBeInTheDocument()
    expect(screen.getAllByText('25 pacientes ativos').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Cartão de crédito' })).toBeInTheDocument()
    for (const campo of ['Número do cartão', 'Validade', 'Código de segurança']) expect(screen.getByRole('group', { name: campo })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'CPF do titular' })).toBeInTheDocument()
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    for (const texto of ['Você paga hoje', 'R$ 34,90', 'Solo, mensal', 'Depois, R$ 34,90 todo dia 2, a partir de 2 de novembro. Cancele quando quiser.']) {
      expect(resumo).toHaveTextContent(texto)
    }
    for (const texto of ['Recibo para', 'Próxima cobrança', 'maria@exemplo.com']) expect(resumo).not.toHaveTextContent(texto)
    expect(screen.getByRole('checkbox', { name: 'Autorizo a cobrança de R$ 34,90 todo mês neste cartão até eu cancelar, e li os Termos de uso.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '#/termos')
    expect(botaoAssinar()).toHaveAccessibleName('Assinar por R$ 34,90/mês')
  })

  it('CA-366: no anual, o ano inteiro, quanto sai por mês, o desconto e a cobrança de um ano depois', async () => {
    await montar({ ciclo: 'anual' })
    expect(botaoAssinar()).toHaveAccessibleName('Assinar por R$ 299,00/ano')
    expect(screen.getByRole('checkbox', { name: /R\$ 299,00 todo ano neste cartão/ })).toBeInTheDocument()
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    expect(resumo).toHaveTextContent('Solo, anual')
    expect(resumo).toHaveTextContent('Depois, R$ 299,00 todo ano, em 2 de outubro. Cancele quando quiser.')
    expect(screen.getByText(/Sai R\$ 24,92 por mês/)).toBeInTheDocument()
    expect(screen.getByText('−29%')).toBeInTheDocument()
  })

  it('CA-158: trocar o ciclo ou o plano avisa quem manda', async () => {
    const { usuario, aoTrocar } = await montar()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    expect(aoTrocar).toHaveBeenCalledWith('solo', 'anual')
    await usuario.click(screen.getByRole('radio', { name: /Pro/ }))
    expect(aoTrocar).toHaveBeenCalledWith('pro', 'mensal')
  })

  it('CA-160 e D-74: o aviso de fundador sem contagem; sem número também aparece; some quando acabam as vagas', async () => {
    const { unmount } = await montar({ vagas: 186 })
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    expect(resumo).toHaveTextContent('Preço de fundador: esse valor não sobe.')
    expect(resumo).not.toHaveTextContent('Restam')
    unmount()
    const { unmount: desmontar } = await montar({ vagas: null })
    expect(screen.getByRole('region', { name: 'Resumo' })).toHaveTextContent('Preço de fundador: esse valor não sobe.')
    expect(screen.getByRole('region', { name: 'Resumo' })).not.toHaveTextContent(/Restam|\d+ de 200/)
    desmontar()
    await montar({ vagas: 0 })
    expect(screen.queryByText(/Preço de fundador/)).not.toBeInTheDocument()
  })

  it('CA-367: nada cita o processador, e o aviso de segurança é uma linha', async () => {
    await montar()
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText('O MetaNutri não vê nem guarda o número do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Pagamento protegido')).toBeInTheDocument()
  })

  it('CA-369: débito ou pré-pago avisa e deixa o botão parado', async () => {
    const { falso } = await montar()
    falso.preencher()
    await waitFor(() => expect(botaoAssinar()).toBeEnabled())
    falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Elo', tipo: 'debit_card', bin: '50677667' } })
    expect(screen.getByText('Use um cartão de crédito.')).toBeInTheDocument()
    expect(botaoAssinar()).toBeDisabled()
  })

  it('CA-370: sem nada preenchido, os erros aparecem, nada é enviado e o foco vai para o número', async () => {
    const { usuario, falso, aoAssinar } = await montar()
    await usuario.click(botaoAssinar())
    expect(screen.getByText('Digite o número do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Digite o CPF do titular do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Marque a autorização da cobrança para assinar.')).toBeInTheDocument()
    expect(falso.focos).toEqual(['numero'])
    expect(aoAssinar).not.toHaveBeenCalled()
  })

  it('CA-370: com o cartão certo e sem a autorização, o foco vai para a caixa de autorização', async () => {
    const { usuario, falso, aoAssinar } = await montar()
    falso.preencher()
    await usuario.type(screen.getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(screen.getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(botaoAssinar())
    expect(screen.getByRole('checkbox', { name: /Autorizo a cobrança/ })).toHaveFocus()
    expect(screen.getByText('Marque a autorização da cobrança para assinar.')).toBeInTheDocument()
    expect(aoAssinar).not.toHaveBeenCalled()
  })

  it('CA-371, CA-375 e foco 5: confirmando com o banco, campos travados, um pedido só, e só plano, ciclo e cartão', async () => {
    let terminar: (resultado: ResultadoDaAssinatura) => void = () => undefined
    const { usuario, falso, aoAssinar } = await montar({
      plano: 'pro',
      ciclo: 'anual',
      aoAssinar: () =>
        new Promise<ResultadoDaAssinatura>((resolver) => {
          terminar = resolver
        }),
    })
    await preencherTudo(usuario, falso)
    await usuario.dblClick(botaoAssinar())
    await waitFor(() => expect(aoAssinar).toHaveBeenCalledTimes(1))
    expect(aoAssinar).toHaveBeenCalledWith('pro', 'anual', CARTAO_APROVADO)
    expect(screen.getByRole('button', { name: 'Confirmando com o banco…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeDisabled()
    expect(falso.tokens).toHaveLength(1)
    await act(async () => terminar(ATIVA))
  })

  it('CA-372 e D-74: banco autorizou: selo, título, recibo, recursos, painel, Conta e plano e o e-mail', async () => {
    const { usuario, falso, aoIrParaPainel, aoIrParaConta } = await montar()
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })
    expect(titulo).toHaveFocus()
    expect(screen.getByText('Pagamento aprovado')).toBeInTheDocument()
    expect(screen.getByText('O plano Solo já está valendo na sua conta.')).toBeInTheDocument()
    const recibo = screen.getByText('Plano', { selector: 'dt' }).closest('dl')
    if (!recibo) throw new Error('recibo não encontrado')
    for (const rotulo of ['Plano', 'Valor', 'Cartão', 'Próxima cobrança']) expect(within(recibo).getByText(rotulo, { selector: 'dt' })).toBeInTheDocument()
    expect(recibo).toHaveTextContent('Solo, mensal')
    expect(recibo).toHaveTextContent('R$ 34,90 por mês')
    expect(recibo).toHaveTextContent(`${CARTAO_APROVADO.bandeira} final ${CARTAO_APROVADO.final}`)
    expect(recibo).toHaveTextContent('Próxima cobrança')
    expect(recibo).toHaveTextContent('2 de novembro de 2026')
    expect(screen.getByText('Liberado agora')).toBeInTheDocument()
    expect(screen.getByText('25 pacientes ativos')).toBeInTheDocument()
    expect(screen.getByText('O recibo vai para maria@exemplo.com.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Andamento' })).getByText('Pronto').closest('li')).toHaveAttribute('aria-current', 'step')
    await usuario.click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(aoIrParaPainel).toHaveBeenCalledOnce()
    await usuario.click(screen.getByRole('button', { name: 'Ver Conta e plano' }))
    expect(aoIrParaConta).toHaveBeenCalledOnce()
  })

  it('banco ainda confirmando: "Pagamento em análise", e vale o Free até lá', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: true, ativa: false, proximaCobranca: null }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByRole('heading', { level: 1, name: 'Pagamento em análise' })).toBeInTheDocument()
    expect(screen.getByText(/Até lá, vale o Free/)).toBeInTheDocument()
  })

  it('CA-373: banco recusou: a mensagem aparece, o código de segurança é apagado e dá para tentar de novo', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: RECUSA_PADRAO }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByText(RECUSA_PADRAO)).toBeInTheDocument()
    expect(falso.limpezas).toBe(1)
    expect(screen.getByText('Digite o código de novo.')).toBeInTheDocument()
    expect(botaoAssinar()).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
  })

  it('CA-374: servidor fora: a mensagem, e o formulário volta a funcionar', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: SERVIDOR_FORA }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByText(SERVIDOR_FORA)).toBeInTheDocument()
    expect(botaoAssinar()).toBeEnabled()
  })

  it('CB-90: cada envio gera um código novo do cartão', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: RECUSA_PADRAO }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    await screen.findByText(RECUSA_PADRAO)
    falso.emitir({ tipo: 'validade', campo: 'codigo', valido: true })
    await usuario.click(botaoAssinar())
    await waitFor(() => expect(falso.tokens).toHaveLength(2))
  })

  it('CB-88: campos que não abrem avisam e deixam o botão parado', async () => {
    const falso = processadorFalso()
    falso.falharAoMontar = true
    await montar({ falso })
    expect(screen.getByText(CAMPOS_NAO_CARREGARAM)).toBeInTheDocument()
    expect(botaoAssinar()).toBeDisabled()
  })

  it('CB-89: sem a chave pública, "O pagamento não está disponível agora." e nada do formulário', async () => {
    const { falso } = await montar({ semChave: true })
    expect(screen.getByText('O pagamento não está disponível agora.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Número do cartão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar por/ })).not.toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CB-91 e CA-163: quem já assina vê o aviso de hoje e não há formulário', async () => {
    const { falso } = await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'ativa' } })
    expect(screen.getByText(/Você já tem uma assinatura ativa: Solo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar por/ })).not.toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CA-380: quem cancelou e ainda está no prazo pode assinar de novo', async () => {
    await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' } })
    expect(botaoAssinar()).toBeInTheDocument()
  })

  it('CB-95: quem está no Estudante sabe que o pago fica no lugar dele quando o banco autorizar', async () => {
    await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa' } })
    expect(screen.getByRole('status')).toHaveTextContent('Você está no plano Estudante. Quando o banco autorizar o cartão, o plano pago fica no lugar dele.')
    expect(botaoAssinar()).toBeInTheDocument()
  })

  it('sem a conta na nuvem, avisa e não abre o formulário', async () => {
    const { falso } = await montar({ disponivel: false })
    expect(screen.getByText('A conta na nuvem não está configurada neste MetaNutri.')).toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CA-383: nenhum ícone de biblioteca nem símbolo de texto; o andamento é de pontos', async () => {
    const { container, usuario, falso } = await montar()
    semIconeDeBiblioteca()
    expect(container.textContent).not.toMatch(/[✓✔★☆]|\p{Extended_Pictographic}/u)
    const andamento = screen.getByRole('list', { name: 'Andamento' })
    expect(andamento).toHaveTextContent(/Conta.*concluído.*Plano.*concluído.*PagamentoPronto/)
    expect(within(andamento).getByText('Pagamento').closest('li')).toHaveAttribute('aria-current', 'step')
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })
    semIconeDeBiblioteca()
  })

  it('CA-375: durante o envio, plano e ciclo travam e o resultado mostra o que foi enviado, mesmo se as props mudarem', async () => {
    let terminar: (resultado: ResultadoDaAssinatura) => void = () => undefined
    const { usuario, falso, rerender, aoTrocar, aoAssinar, aoIrParaPainel, aoIrParaConta, aoIrParaInicio } = await montar({
      aoAssinar: () =>
        new Promise<ResultadoDaAssinatura>((resolver) => {
          terminar = resolver
        }),
    })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    await screen.findByRole('button', { name: 'Confirmando com o banco…' })
    expect(screen.getByRole('radio', { name: /Anual/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Pro/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'MetaNutri, início' })).toBeDisabled()
    rerender(
      <TelaCheckout
        plano="pro"
        ciclo="anual"
        email="maria@exemplo.com"
        assinaturaAtual={SEM_ASSINATURA}
        vagasRestantes={186}
        disponivel
        criarProcessador={falso.criar}
        aoTrocar={aoTrocar}
        aoAssinar={aoAssinar}
        aoIrParaPainel={aoIrParaPainel}
        aoIrParaConta={aoIrParaConta}
        aoIrParaInicio={aoIrParaInicio}
        agora={AGORA}
      />,
    )
    await act(async () => terminar(ATIVA))
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })
    expect(screen.getByText('O plano Solo já está valendo na sua conta.')).toBeInTheDocument()
    expect(screen.getByText('R$ 34,90 por mês')).toBeInTheDocument()
    expect(titulo).toHaveFocus()
  })

  it('CA-370: a mensagem da autorização fica ligada à caixa', async () => {
    const { usuario } = await montar()
    await usuario.click(botaoAssinar())
    const caixa = screen.getByRole('checkbox', { name: /Autorizo a cobrança/ })
    expect(caixa).toHaveAccessibleDescription('Marque a autorização da cobrança para assinar.')
  })

  it('quem tem o plano Clínica ativo também não vê o formulário', async () => {
    const { falso } = await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'clinica', planoPedido: 'clinica', status: 'ativa' } })
    expect(screen.queryByRole('button', { name: /^Assinar por/ })).not.toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })
})

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { RECUSA_PADRAO, SERVIDOR_FORA } from '@/domain/cartao.ts'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import { CONFERINDO_COBRANCA, MUITAS_TENTATIVAS_SEGUIDAS } from '@/domain/assinaturaTextos.ts'
import type { ResultadoDaMudanca, ResultadoDaPrevia } from '../estado/usarAssinatura.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from '../pagamento/processadorFalso.test-utils.ts'
import { contaFalsa } from '../publico/conta/contaFalsa.test-utils.ts'
import { TelaConta } from './TelaConta.tsx'

const estado = vi.hoisted(() => ({
  assinatura: {
    plano: 'free',
    planoPedido: 'free',
    status: 'sem-assinatura',
    expiraEm: null,
    ciclo: null,
    valorCentavos: 0,
    cartaoBandeira: null,
    cartaoFinal: null,
    proximaCobranca: null,
  } as Assinatura,
  cancelar: vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true })),
  trocarCartao: vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true })),
  previa: vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' })),
}))
vi.mock('../estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: estado.assinatura,
    recarregar: vi.fn(),
    cancelar: estado.cancelar,
    previaDoCancelamento: estado.previa,
    trocarCartao: estado.trocarCartao,
  }),
}))

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2026-11-02T15:00:00.000Z',
}
const CANCELADA_NO_PRAZO: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }

const estudante: PerfilConta = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'em_conferencia',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: null,
}
const aprovado: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'aprovado',
  motivo: null,
  enviadoEm: '2026-09-30T13:42:00Z',
  decididoEm: '2026-10-01T12:00:00Z',
  avisoFechado: false,
}

function montar(
  perfil: PerfilConta | null,
  pedido: PedidoEstudante | null = null,
  meFormei = vi.fn(async () => null as string | null),
  falso: ProcessadorFalso | null = processadorFalso(),
) {
  const conta = contaFalsa({ sessao: { id: 'u1', email: 'julia@ufrn.edu.br', nome: 'Júlia' } })
  const props = {
    conta,
    perfil,
    pedido,
    meFormei,
    aoMudouSituacao: vi.fn(),
    corrigirCrn: vi.fn<(crn: Crn) => Promise<string | null>>(async () => null),
    aoEnviarComprovante: vi.fn(),
    aoEntrar: vi.fn(),
    aoVerPrecos: vi.fn(),
    aoIrParaConfig: vi.fn(),
    aoAssinar: vi.fn(),
    aoMudouAssinatura: vi.fn(),
    criarProcessador: falso ? falso.criar : null,
    aoSaiu: vi.fn(),
  }
  const tela = render(<TelaConta {...props} />)
  return { ...props, ...tela, props, falso, usuario: userEvent.setup() }
}

/** Abre a confirmação de cancelar e espera a prévia chegar (D-81: "Cancelar assinatura" fica parado até lá). */
async function abrirCancelamento(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
  const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
  await waitFor(() => expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeEnabled())
  return janela
}

describe('TelaConta', () => {
  // As datas de PAGA (próxima cobrança em 2/11/2026) só aparecem enquanto estão à frente (M2): o relógio fica um mês antes.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-02T15:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    estado.assinatura = SEM_ASSINATURA
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true }))
    estado.trocarCartao = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true }))
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }))
  })

  it('CA-156 e CA-478: "Sair" sai sem perguntar sobre apagar e leva para fora da área de trabalho', async () => {
    const { usuario, conta, aoSaiu } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(aoSaiu).toHaveBeenCalledOnce())
    expect(conta.sair).toHaveBeenCalledExactlyOnceWith()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Só sair|Sair e apagar/ })).not.toBeInTheDocument()
  })

  it('CA-282: estudante vê instituição, formatura, matrícula, selo e "Me formei"', () => {
    montar(estudante, aprovado)
    expect(screen.getByText('Estudante de Nutrição')).toBeInTheDocument()
    expect(screen.getByText('UFRN')).toBeInTheDocument()
    expect(screen.getByText('julho de 2027')).toBeInTheDocument()
    expect(screen.getByText('Matrícula verificada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Me formei' })).toBeInTheDocument()
  })

  it('CA-282: estudante sem pedido vê "Falta enviar"', () => {
    montar(estudante, null)
    expect(screen.getByText('Falta enviar')).toBeInTheDocument()
  })

  it('CA-283: nutricionista vê o CRN e o selo, sem botão de trocar situação', () => {
    montar(nutri)
    expect(screen.getByText('CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('CRN em conferência')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Me formei' })).not.toBeInTheDocument()
  })

  it('CA-289: CRN não encontrado aparece em Conta e plano, com o prazo e a correção', async () => {
    const { usuario, corrigirCrn } = montar({ ...nutri, statusCrn: 'nao_encontrado', crnDecididoEm: new Date().toISOString() })
    const aviso = screen.getByRole('region', { name: 'CRN' })
    expect(aviso).toHaveTextContent('Não encontramos seu CRN no conselho')
    expect(aviso).toHaveTextContent('7 dias para corrigir')
    const numero = within(aviso).getByRole('textbox', { name: 'Número do CRN' })
    await usuario.clear(numero)
    await usuario.type(numero, '54321')
    await usuario.click(within(aviso).getByRole('button', { name: 'Corrigir CRN' }))
    expect(corrigirCrn).toHaveBeenCalledWith({ regiao: 6, numero: '54321' })
  })

  it('CA-289: CRN em conferência não mostra o aviso de correção', () => {
    montar(nutri)
    expect(screen.queryByText('Não encontramos seu CRN no conselho')).not.toBeInTheDocument()
  })

  it('CA-287: o cartão do nutricionista diz que nome e CRN saem na folha da dieta', () => {
    montar(nutri)
    expect(screen.getByText('Você já pode usar tudo. Seu nome e CRN saem na folha da dieta.')).toBeInTheDocument()
  })

  it('CA-304: estudante sem pedido ou recusada vê "Enviar comprovante", que leva a Comprovar matrícula', async () => {
    const { usuario, aoEnviarComprovante } = montar(estudante, null)
    await usuario.click(screen.getByRole('button', { name: 'Enviar comprovante' }))
    expect(aoEnviarComprovante).toHaveBeenCalledOnce()
  })

  it('CA-304: pedido recusado também mostra "Enviar comprovante"', () => {
    montar(estudante, { ...aprovado, status: 'recusado', motivo: 'Ilegível', decididoEm: '2026-10-01T12:00:00Z' })
    expect(screen.getByRole('button', { name: 'Enviar comprovante' })).toBeInTheDocument()
  })

  it('CA-304: pedido aprovado não mostra "Enviar comprovante"', () => {
    montar(estudante, aprovado)
    expect(screen.queryByRole('button', { name: 'Enviar comprovante' })).not.toBeInTheDocument()
  })

  it('CA-304: pedido em análise não mostra "Enviar comprovante"', () => {
    montar(estudante, { ...aprovado, status: 'em_analise', decididoEm: null })
    expect(screen.queryByRole('button', { name: 'Enviar comprovante' })).not.toBeInTheDocument()
  })

  it('CA-284: no Estudante, mostra até quando vale', () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa', expiraEm: '2027-07-31T23:59:59Z' }
    montar(estudante, aprovado)
    expect(screen.getByText('Vale até 31 de julho de 2027.')).toBeInTheDocument()
  })

  it('CA-286 e CA-287: Me formei pede o CRN e a declaração, e confirma', async () => {
    const { usuario, meFormei, aoMudouSituacao } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    const janela = screen.getByRole('dialog', { name: 'Me formei' })
    expect(janela).toHaveTextContent('Seus planos alimentares e pacientes continuam salvos.')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Marque a declaração')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(meFormei).toHaveBeenCalledWith({ regiao: 6, numero: '23891' })
    expect(aoMudouSituacao).toHaveBeenCalledOnce()
  })

  it('CA-288: cancelar não muda nada', async () => {
    const { usuario, meFormei } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(meFormei).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CRN inválido marca o campo do CRN, não a declaração', async () => {
    const { usuario } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12a45')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('declaração desmarcada marca a declaração, não o CRN válido', async () => {
    const { usuario } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('foco 3: clique duplo em "Mudar para nutricionista" chama uma vez', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const meFormei = vi.fn(() => new Promise<string | null>((r) => (terminar = r)))
    const { usuario } = montar(estudante, aprovado, meFormei)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.dblClick(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    terminar(null)
    expect(meFormei).toHaveBeenCalledTimes(1)
  })

  it('CA-376: assinatura paga ativa mostra plano e ciclo, o selo, o cartão, a próxima cobrança e os dois botões', () => {
    estado.assinatura = PAGA
    montar(nutri)
    expect(screen.getByText('Solo, mensal')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mastercard final 6351' })).toBeInTheDocument()
    expect(screen.getByText('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar cartão' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar/ })).not.toBeInTheDocument()
  })

  it('CA-389: na ativa, plano, selo, cartão e próxima cobrança aparecem uma vez cada; o mini cartão não se repete em texto', () => {
    estado.assinatura = PAGA
    const { container } = montar(nutri)
    const texto = container.textContent ?? ''
    const vezes = (padrao: RegExp) => texto.match(new RegExp(padrao.source, 'g'))?.length ?? 0
    expect(vezes(/Solo, mensal/)).toBe(1)
    expect(vezes(/Ativa/)).toBe(1)
    expect(vezes(/Mastercard/)).toBe(1)
    expect(vezes(/6351/)).toBe(1)
    expect(vezes(/2 de novembro de 2026/)).toBe(1)
    expect(screen.queryByText('Mastercard final 6351')).not.toBeInTheDocument()
    expect(texto).not.toContain('em dia')
  })

  it('D-79: logado, "Sua conta" não repete que está conectado: o nome e o e-mail já mostram', () => {
    montar(nutri)
    expect(screen.getByText('julia@ufrn.edu.br')).toBeInTheDocument()
    expect(screen.queryByText(/Conectado/)).not.toBeInTheDocument()
  })

  it('D-79: pendente, pausada e vencida explicam por que vale o Free; sem assinatura, nenhum recado', () => {
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'solo', status: 'pendente', ciclo: 'mensal' }
    const { unmount } = montar(nutri)
    expect(screen.getByText('O banco ainda está confirmando o pagamento. Até lá, vale o Free.')).toBeInTheDocument()
    unmount()
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'pro', status: 'pausada', ciclo: 'anual' }
    const { unmount: desmontar } = montar(nutri)
    expect(screen.getByText('A assinatura está pausada. Até ela voltar, vale o Free.')).toBeInTheDocument()
    desmontar()
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'estudante', status: 'vencida' }
    const { unmount: fechar } = montar(estudante, aprovado)
    expect(screen.getByText('Seu plano venceu e a conta voltou ao Free.')).toBeInTheDocument()
    fechar()
    estado.assinatura = SEM_ASSINATURA
    montar(nutri)
    expect(screen.queryByText('Você está no plano Free.')).not.toBeInTheDocument()
  })

  it('CA-396 e CA-377: com cobrança, diz até quando vale, pela data do servidor, e "Manter assinatura" é o padrão', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('O plano Solo continua até 1 de novembro de 2026, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.')
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Manter assinatura' })).toHaveFocus())
    await usuario.click(within(janela).getByRole('button', { name: 'Manter assinatura' }))
    expect(estado.cancelar).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-378: confirmar o cancelamento pede ao servidor uma vez e fecha a confirmação', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('CA-378, CA-380 e CA-390: cancelada no prazo diz uma vez até quando vale e oferece assinar de novo, no mesmo plano e ciclo', async () => {
    estado.assinatura = CANCELADA_NO_PRAZO
    const { usuario, aoAssinar, container } = montar(nutri)
    expect(screen.getByText('Vale até 1 de novembro de 2026. Depois, a conta volta ao Free.')).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    const texto = container.textContent ?? ''
    expect(texto.match(/cancelad/gi)).toHaveLength(1)
    expect(texto.match(/1 de novembro de 2026/g)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Assinar de novo' }))
    expect(aoAssinar).toHaveBeenCalledWith('solo', 'mensal')
  })

  it('CA-380: cancelada fora do prazo, já no Free, também oferece assinar de novo', async () => {
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'pro', status: 'cancelada', ciclo: 'anual', expiraEm: '2026-09-01T02:59:59.000Z' }
    const { usuario, aoAssinar } = montar(nutri)
    expect(screen.queryByText(/foi cancelada/)).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Assinar de novo' }))
    expect(aoAssinar).toHaveBeenCalledWith('pro', 'anual')
  })

  it('CB-92 e foco 5: clique duplo em "Cancelar assinatura" da confirmação pede uma vez só', async () => {
    let terminar: (resultado: ResultadoDaMudanca) => void = () => undefined
    estado.cancelar = vi.fn(
      () =>
        new Promise<ResultadoDaMudanca>((resolver) => {
          terminar = resolver
        }),
    )
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.dblClick(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledTimes(1)
    await act(async () => terminar({ ok: true }))
  })

  it('cancelamento que falha mostra a mensagem dentro da confirmação, que continua aberta', async () => {
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.' }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(await within(janela).findByRole('alert')).toHaveTextContent('Nada mudou')
  })

  it('foco 4: assinatura de antes do 008, sem cartão nem próxima cobrança: o plano aparece', () => {
    estado.assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    montar(nutri)
    expect(screen.getByText('Solo, mensal')).toBeInTheDocument()
    expect(screen.queryByText(/final \d{4}/)).not.toBeInTheDocument()
  })

  it('cobrada sem data à frente: diz que a conta volta ao Free na hora', async () => {
    estado.assinatura = PAGA
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: true, cobrada: true, expiraEm: null }))
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.')
    expect(janela).not.toHaveTextContent('período já pago')
  })

  it('CA-393: encerrada por recusa mostra a data da cobrança recusada uma vez e "Assinar de novo", que leva ao checkout no mesmo plano e ciclo', async () => {
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', ciclo: 'mensal', encerradaPor: 'recusa', encerradaEm: '2026-10-02T13:00:00.000Z' }
    const { usuario, aoAssinar, container } = montar(nutri)
    const frase = 'O banco recusou a cobrança de 2 de outubro de 2026. A assinatura foi encerrada e a conta voltou ao Free.'
    expect(screen.getByText(frase)).toBeInTheDocument()
    expect((container.textContent ?? '').split(frase)).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Assinar de novo' }))
    expect(aoAssinar).toHaveBeenCalledWith('solo', 'mensal')
  })

  it('R12: a marca da recusa que sobrou numa ativa não mostra o recado e mantém o plano pago', () => {
    estado.assinatura = { ...PAGA, encerradaPor: 'recusa', encerradaEm: '2026-10-01T13:00:00.000Z' }
    montar(nutri)
    expect(screen.queryByText(/O banco recusou/)).not.toBeInTheDocument()
    expect(screen.getByText('Solo, mensal')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
  })

  it('D-81: a confirmação pergunta ao servidor ao abrir e só deixa confirmar quando ele responde', async () => {
    let responder: (r: ResultadoDaPrevia) => void = () => undefined
    estado.previa = vi.fn(
      () =>
        new Promise<ResultadoDaPrevia>((resolver) => {
          responder = resolver
        }),
    )
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(janela).toHaveTextContent(CONFERINDO_COBRANCA)
    expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeDisabled()
    expect(within(janela).getByRole('button', { name: 'Manter assinatura' })).toBeEnabled()
    await act(async () => responder({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }))
    expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeEnabled()
    expect(estado.previa).toHaveBeenCalledOnce()
  })

  it('CA-395: sem cobrança ainda, diz que nada é cobrado e a conta volta ao Free na hora; confirmar pede ao servidor uma vez', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: true, cobrada: false, expiraEm: null }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora.')
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledOnce()
  })

  it('CA-397: sem resposta, diz que não conseguiu conferir, oferece tentar de novo e não deixa confirmar', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: SERVIDOR_FORA }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(await within(janela).findByText('Não consegui conferir se já houve cobrança.')).toBeInTheDocument()
    expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeDisabled()
    estado.previa.mockResolvedValueOnce({ ok: true, cobrada: false, expiraEm: null })
    await usuario.click(within(janela).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeEnabled())
    expect(estado.previa).toHaveBeenCalledTimes(2)
    expect(estado.cancelar).not.toHaveBeenCalled()
  })

  it('CA-397: ao tentar de novo, o foco fica em "Manter assinatura"', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: SERVIDOR_FORA }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    await usuario.click(await within(janela).findByRole('button', { name: 'Tentar de novo' }))
    expect(within(janela).getByRole('button', { name: 'Manter assinatura' })).toHaveFocus()
  })

  it('CA-449: com pedidos demais na última hora, a janela mostra a frase do servidor no lugar da falha de conferência e continua sem deixar confirmar', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(await within(janela).findByText('Muitas tentativas seguidas. Espere uma hora e tente de novo.')).toBeInTheDocument()
    expect(within(janela).queryByText('Não consegui conferir se já houve cobrança.')).not.toBeInTheDocument()
    expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeDisabled()
    // Tentar de novo agora daria a mesma resposta: o botão não aparece.
    expect(within(janela).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    expect(estado.cancelar).not.toHaveBeenCalled()
  })

  it('Foco: fechar a janela depois do limite e abrir de novo pergunta de novo ao servidor e volta ao normal quando ele responde', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const primeira = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(await within(primeira).findByText(MUITAS_TENTATIVAS_SEGUIDAS)).toBeInTheDocument()
    await usuario.click(within(primeira).getByRole('button', { name: 'Manter assinatura' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    estado.previa.mockResolvedValueOnce({ ok: true, cobrada: false, expiraEm: null })
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('Ainda não houve cobrança.')
    expect(janela).not.toHaveTextContent(MUITAS_TENTATIVAS_SEGUIDAS)
    expect(estado.previa).toHaveBeenCalledTimes(2)
  })

  it('CA-393: a data da recusa é a de Brasília (01h UTC de 7/11 ainda é 6/11)', () => {
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'recusa', encerradaEm: '2026-11-07T01:00:00.000Z' }
    montar(nutri)
    expect(screen.getByText('O banco recusou a cobrança de 6 de novembro de 2026. A assinatura foi encerrada e a conta voltou ao Free.')).toBeInTheDocument()
  })

  it('uma prévia atrasada da abertura anterior não troca o texto da nova', async () => {
    let primeira: (r: ResultadoDaPrevia) => void = () => undefined
    estado.previa = vi
      .fn<() => Promise<ResultadoDaPrevia>>()
      .mockImplementationOnce(
        () =>
          new Promise<ResultadoDaPrevia>((resolver) => {
            primeira = resolver
          }),
      )
      .mockResolvedValue({ ok: true, cobrada: false, expiraEm: null })
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter assinatura' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('Ainda não houve cobrança.')
    await act(async () => primeira({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }))
    expect(janela).toHaveTextContent('Ainda não houve cobrança.')
    expect(janela).not.toHaveTextContent('período já pago')
  })

  it('CA-379: Trocar cartão abre o mesmo formulário do checkout; autorizado, fecha e avisa', async () => {
    estado.assinatura = PAGA
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    expect(within(janela).getByRole('group', { name: 'Número do cartão' })).toBeInTheDocument()
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(estado.trocarCartao).toHaveBeenCalledWith(CARTAO_APROVADO)
    expect(screen.getByText('Cartão trocado.')).toBeInTheDocument()
  })

  it('CA-379: recusado, o cartão antigo continua, a mensagem aparece e o código é apagado', async () => {
    estado.assinatura = PAGA
    estado.trocarCartao = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: `${RECUSA_PADRAO} O cartão antigo continua valendo.` }))
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    expect(await within(janela).findByText(`${RECUSA_PADRAO} O cartão antigo continua valendo.`)).toBeInTheDocument()
    expect(falso?.limpezas).toBe(1)
    expect(screen.getByRole('dialog', { name: 'Trocar cartão' })).toBeInTheDocument()
  })

  it('erro de servidor ao trocar o cartão: a frase vem como está, sem prometer o cartão antigo', async () => {
    estado.assinatura = PAGA
    estado.trocarCartao = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Não consegui falar com o servidor de cobrança.' }))
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    expect(await within(janela).findByText('Não consegui falar com o servidor de cobrança.')).toBeInTheDocument()
    expect(janela).not.toHaveTextContent('cartão antigo')
  })

  it('falha ao gerar o código do cartão: o cartão antigo continua valendo', async () => {
    estado.assinatura = PAGA
    const { usuario, falso } = montar(nutri)
    if (falso) falso.respostaDoToken = () => Promise.reject(new Error('x'))
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    expect(await within(janela).findByText(/O cartão antigo continua valendo\./)).toBeInTheDocument()
    expect(estado.trocarCartao).not.toHaveBeenCalled()
  })

  it('CB-92: clique duplo em "Salvar cartão" troca uma vez só', async () => {
    estado.assinatura = PAGA
    let terminar: (resultado: ResultadoDaMudanca) => void = () => undefined
    estado.trocarCartao = vi.fn(() => new Promise<ResultadoDaMudanca>((resolver) => (terminar = resolver)))
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.dblClick(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    await waitFor(() => expect(estado.trocarCartao).toHaveBeenCalled())
    expect(estado.trocarCartao).toHaveBeenCalledTimes(1)
    await act(async () => terminar({ ok: true }))
  })

  it('CA-380: depois de cancelar, avisa o App para reler a assinatura, mostra o aviso e leva o foco a ele', async () => {
    estado.assinatura = PAGA
    const { usuario, aoMudouAssinatura } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(aoMudouAssinatura).toHaveBeenCalledOnce()
    const aviso = screen.getByText('Pronto. Não haverá novas cobranças.')
    await waitFor(() => expect(aviso.closest('[tabindex="-1"]')).toHaveFocus())
  })

  it('CA-379: depois de trocar o cartão, avisa o App para reler a assinatura', async () => {
    estado.assinatura = PAGA
    const { usuario, falso, aoMudouAssinatura } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    await waitFor(() => expect(aoMudouAssinatura).toHaveBeenCalledOnce())
  })

  it('cancelamento que falha não avisa o App', async () => {
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Nada mudou.' }))
    estado.assinatura = PAGA
    const { usuario, aoMudouAssinatura } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nada mudou')
    expect(aoMudouAssinatura).not.toHaveBeenCalled()
  })

  it('a confirmação não troca de texto: se a assinatura deixa de ser ativa com ela aberta, ela fecha', async () => {
    estado.assinatura = PAGA
    const { usuario, rerender, props } = montar(nutri)
    await abrirCancelamento(usuario)
    expect(screen.getByRole('dialog')).toHaveTextContent('o fim do período já pago')
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'solo', status: 'pendente', ciclo: 'mensal', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' }
    rerender(<TelaConta {...props} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('o erro de um cancelamento não reaparece na próxima confirmação, nem quando ela fechou porque a linha mudou', async () => {
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Nada mudou.' }))
    estado.assinatura = PAGA
    const { usuario, rerender, props } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Nada mudou.')
    // A linha muda com a confirmação aberta: ela fecha sozinha, sem passar por "Manter assinatura".
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'solo', status: 'pendente', ciclo: 'mensal', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' }
    rerender(<TelaConta {...props} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => {})
    const reaberta = await abrirCancelamento(usuario)
    expect(within(reaberta).queryByRole('alert')).not.toBeInTheDocument()
    expect(reaberta).not.toHaveTextContent('Nada mudou.')
  })

  it('o erro de um cancelamento some ao fechar com "Manter assinatura" e abrir de novo', async () => {
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Nada mudou.' }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    const janela = await abrirCancelamento(usuario)
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Nada mudou.')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Manter assinatura' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pendente do fluxo novo não oferece "Assinar Solo/Pro" (o servidor recusaria)', () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'solo', status: 'pendente', ciclo: 'mensal', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' }
    montar(nutri)
    expect(screen.queryByRole('button', { name: /^Assinar/ })).not.toBeInTheDocument()
  })

  it('sem a chave pública do pagamento, não há "Trocar cartão"; cancelar continua', () => {
    estado.assinatura = PAGA
    montar(nutri, null, undefined, null)
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
  })

  it('pendente do fluxo novo (com cartão): oferece "Cancelar assinatura", sem "Trocar cartão"', async () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'solo', status: 'pendente', ciclo: 'mensal', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' }
    const { usuario } = montar(nutri)
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(janela).toHaveTextContent('A assinatura do plano Solo para e nada mais é cobrado. Você continua no plano Free.')
    expect(janela).not.toHaveTextContent('período já pago')
    expect(estado.previa).not.toHaveBeenCalled()
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledOnce()
  })

  it('pausada do fluxo novo também oferece "Cancelar assinatura"', () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'pro', status: 'pausada', ciclo: 'anual', cartaoBandeira: 'Visa', cartaoFinal: '1111' }
    montar(nutri)
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
  })

  it('pendente do fluxo antigo (sem cartão) não mostra "Cancelar assinatura"', () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'free', planoPedido: 'solo', status: 'pendente', ciclo: 'mensal' }
    montar(nutri)
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
  })

  it('CA-381: Conta e plano não cita o processador', () => {
    montar(nutri)
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText('O pagamento é com cartão de crédito, aqui no site.')).toBeInTheDocument()
  })

  it('CA-383: nenhum ícone de biblioteca em Conta e plano, nem na confirmação', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar({ ...nutri, statusCrn: 'nao_encontrado', crnDecididoEm: new Date().toISOString() })
    expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })

  it('CA-383: os pontos da marca no lugar da roda enquanto confere', async () => {
    estado.assinatura = PAGA
    estado.previa = vi.fn(() => new Promise<ResultadoDaPrevia>(() => undefined))
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(janela.querySelector('[data-pontos-da-marca]')).not.toBeNull()
    expect(janela.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
})

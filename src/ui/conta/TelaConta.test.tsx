import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import { contaFalsa } from '../publico/conta/contaFalsa.test-utils.ts'
import { TelaConta } from './TelaConta.tsx'

const estado = vi.hoisted(() => ({
  assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null } as Assinatura,
}))
vi.mock('../estado/usarAssinatura.ts', () => ({ useAssinatura: () => ({ assinatura: estado.assinatura, recarregar: vi.fn() }) }))

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

function montar(perfil: PerfilConta | null, pedido: PedidoEstudante | null = null, meFormei = vi.fn(async () => null as string | null)) {
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
    aoSaiu: vi.fn(),
  }
  render(<TelaConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

describe('TelaConta', () => {
  afterEach(() => {
    estado.assinatura = SEM_ASSINATURA
  })

  it('CA-156: sair leva para fora da área de trabalho', async () => {
    const { usuario, conta, aoSaiu } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    expect(conta.sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
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
})

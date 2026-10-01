import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PerfilConta } from '@/domain/situacao.ts'
import { AvisoCrn } from './AvisoCrn.tsx'
import { AvisoDoEstudante } from './AvisoEstudante.tsx'

const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'nao_encontrado',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: '2026-10-01T12:00:00Z',
}

describe('AvisoDoEstudante (CA-279)', () => {
  it('falta enviar leva ao comprovante', async () => {
    const aoEnviar = vi.fn()
    render(<AvisoDoEstudante aviso={{ tipo: 'enviar' }} aoEnviar={aoEnviar} aoFechar={vi.fn()} />)
    expect(screen.getByText('Envie seu comprovante de matrícula')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar comprovante' }))
    expect(aoEnviar).toHaveBeenCalledOnce()
  })

  it('em análise não tem botão', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'analise' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Comprovante em análise')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('recusado mostra o motivo e "Enviar outro"', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'recusado', motivo: 'Ilegível' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Motivo: Ilegível.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar outro' })).toBeInTheDocument()
  })

  it('CA-280: aprovado mostra a validade e fecha', async () => {
    const aoFechar = vi.fn()
    render(<AvisoDoEstudante aviso={{ tipo: 'aprovado', pedidoId: 'p1', expiraEm: '2027-07-31T23:59:59Z' }} aoEnviar={vi.fn()} aoFechar={aoFechar} />)
    expect(screen.getByText('Vale até 31 de julho de 2027.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(aoFechar).toHaveBeenCalledWith('p1')
  })

  it('CA-285: vencido pede renovação', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'renovar' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Seu plano Estudante venceu')).toBeInTheDocument()
  })
})

describe('AvisoCrn (CA-289 e CA-290)', () => {
  it('mostra o prazo e corrige', async () => {
    const aoCorrigir = vi.fn(async () => null)
    render(<AvisoCrn perfil={nutri} agora={new Date('2026-10-03T12:00:00Z')} aoCorrigir={aoCorrigir} />)
    expect(screen.getByText('Não encontramos seu CRN no conselho')).toBeInTheDocument()
    expect(screen.getByText(/5 dias para corrigir/)).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.clear(screen.getByRole('textbox', { name: 'Número do CRN' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12346')
    await usuario.click(screen.getByRole('button', { name: 'Corrigir CRN' }))
    expect(aoCorrigir).toHaveBeenCalledWith({ regiao: 6, numero: '12346' })
  })

  it('depois do prazo, avisa que exportar está bloqueado', () => {
    render(<AvisoCrn perfil={nutri} agora={new Date('2026-10-09T12:00:00Z')} aoCorrigir={vi.fn()} />)
    expect(screen.getByText('Exportar documentos está bloqueado até você corrigir o CRN.')).toBeInTheDocument()
  })

  it('não aparece para CRN em conferência', () => {
    const { container } = render(<AvisoCrn perfil={{ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null }} agora={new Date()} aoCorrigir={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

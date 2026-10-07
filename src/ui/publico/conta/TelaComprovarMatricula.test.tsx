import { fireEvent, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MENSAGEM_EMAIL_DA_FACULDADE, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { TelaComprovarMatricula } from './TelaComprovarMatricula.tsx'

const hoje = new Date('2026-09-30T15:00:00Z')
const pdf = new File(['%PDF'], 'declaracao.pdf', { type: 'application/pdf' })

function montar(pedido: PedidoEstudante | null = null, enviar = vi.fn(async () => null as string | null)) {
  const props = { email: 'julia@ufrn.edu.br', pedido, enviar, aoEnviado: vi.fn(), aoDepois: vi.fn(), aoIrParaInicio: vi.fn(), hoje }
  render(<TelaComprovarMatricula {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencher(usuario: UserEvent) {
  await usuario.type(screen.getByLabelText('Instituição'), 'UFRN')
  await usuario.type(screen.getByLabelText('Matrícula'), '20230045871')
  await usuario.selectOptions(screen.getByLabelText('Período atual'), '7º')
  fireEvent.change(screen.getByLabelText('Previsão de formatura'), { target: { value: '2027-07' } })
  await usuario.upload(screen.getByLabelText('Comprovante de matrícula'), pdf)
}

const recusado: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'recusado',
  motivo: 'Não mostra o semestre atual',
  enviadoEm: '2026-09-29T10:00:00Z',
  decididoEm: '2026-09-30T10:00:00Z',
  avisoFechado: false,
}

describe('TelaComprovarMatricula', () => {
  it('CA-271: mostra o passo 2 de 2, o e-mail confirmado e o curso fixo', () => {
    montar()
    expect(screen.getByRole('img', { name: 'Passo 2 de 2' })).toBeInTheDocument()
    expect(screen.getByText(/julia@ufrn\.edu\.br/)).toBeInTheDocument()
    expect(screen.getByLabelText('Curso')).toHaveValue('Nutrição')
    expect(screen.getByLabelText('Curso')).toHaveAttribute('readonly')
  })

  it('CA-272: arquivo de outro tipo não é enviado', async () => {
    const { usuario, enviar } = montar()
    await usuario.type(screen.getByLabelText('Instituição'), 'UFRN')
    await usuario.type(screen.getByLabelText('Matrícula'), '20230045871')
    await usuario.selectOptions(screen.getByLabelText('Período atual'), '7º')
    fireEvent.change(screen.getByLabelText('Previsão de formatura'), { target: { value: '2027-07' } })
    fireEvent.change(screen.getByLabelText('Comprovante de matrícula'), { target: { files: [new File(['x'], 'foto.gif', { type: 'image/gif' })] } })
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(screen.getByRole('alert')).toHaveTextContent('O comprovante precisa ser PDF, JPG ou PNG.')
    expect(enviar).not.toHaveBeenCalled()
  })

  it('CA-273: enviado, avisa quem manda', async () => {
    const { usuario, enviar, aoEnviado } = montar()
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(enviar).toHaveBeenCalledWith({ instituicao: 'UFRN', matricula: '20230045871', periodo: 7, formatura: '2027-07' }, pdf)
    expect(aoEnviado).toHaveBeenCalledOnce()
  })

  it('CA-274: "Fazer isso depois" sai sem enviar', async () => {
    const { usuario, aoDepois, enviar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Fazer isso depois' }))
    expect(aoDepois).toHaveBeenCalledOnce()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('CA-275: com pedido em análise, mostra o estado e não o formulário', () => {
    montar({ ...recusado, status: 'em_analise', motivo: null, decididoEm: null })
    expect(screen.getByRole('heading', { level: 1, name: 'Comprovante em análise' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Instituição')).not.toBeInTheDocument()
  })

  it('CA-276: clique duplo envia uma vez só', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const enviar = vi.fn(() => new Promise<string | null>((r) => (terminar = r)))
    const { usuario } = montar(null, enviar)
    await preencher(usuario)
    await usuario.dblClick(screen.getByRole('button', { name: 'Enviar para análise' }))
    terminar(null)
    expect(enviar).toHaveBeenCalledTimes(1)
  })

  it('CA-277: falha do servidor mantém tudo preenchido', async () => {
    const enviar = vi.fn(async () => 'Não deu para falar com o servidor. Confira a internet e tente de novo.')
    const { usuario } = montar(null, enviar)
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet')
    expect(screen.getByLabelText('Instituição')).toHaveValue('UFRN')
    expect(screen.getByRole('button', { name: 'Enviar para análise' })).toBeEnabled()
  })

  it('CA-452: sem e-mail de faculdade confirmado, a tela diz o motivo e não sai da página', async () => {
    const enviar = vi.fn(async () => MENSAGEM_EMAIL_DA_FACULDADE as string | null)
    const { usuario, aoEnviado } = montar(null, enviar)
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(aoEnviado).not.toHaveBeenCalled()
  })

  it('CA-281: depois da recusa, abre com os dados anteriores, menos o arquivo', () => {
    montar(recusado)
    expect(screen.getByLabelText('Instituição')).toHaveValue('UFRN')
    expect(screen.getByLabelText('Matrícula')).toHaveValue('20230045871')
    expect(screen.getByLabelText('Previsão de formatura')).toHaveValue('2027-07')
    expect(screen.getByText(/Não mostra o semestre atual/)).toBeInTheDocument()
  })
})

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CrnParaConferir, PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'
import { TelaAprovacoes } from './TelaAprovacoes.tsx'

const pedido = (id: string, nome: string, enviadoEm: string): PedidoParaAprovar => ({
  id,
  usuario: `u-${id}`,
  nome,
  email: `${id}@ufrn.edu.br`,
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  enviadoEm,
  arquivo: `u-${id}/a.pdf`,
})

const crn: CrnParaConferir = {
  usuario: 'u2',
  nome: 'Ana Souza',
  email: 'ana@gmail.com',
  crn: { regiao: 6, numero: '12345' },
  contaCriadaEm: '2026-09-30T12:00:00Z',
  status: 'em_conferencia',
  decididoEm: null,
}

function aprovacoes(sobre: Partial<ValorAprovacoes> = {}): ValorAprovacoes {
  return {
    pedidos: [pedido('p1', 'Carla Dias', '2026-09-28T10:00:00Z'), pedido('p2', 'Júlia Martins', '2026-09-30T13:42:00Z')],
    crns: [crn],
    pendentes: { estudantes: 2, crn: 1, total: 3 },
    carregado: true,
    erro: null,
    decidirPedido: vi.fn(async () => null),
    decidirCrn: vi.fn(async () => null),
    abrirComprovante: vi.fn(async () => 'https://assinado/x'),
    recarregar: vi.fn(),
    ...sobre,
  }
}

describe('TelaAprovacoes', () => {
  it('CA-291: duas abas com o total pendente', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes()} />)
    expect(screen.getByRole('radio', { name: /Estudantes 2/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /CRN 1/ })).toBeInTheDocument()
  })

  it('CA-293: abre o mais antigo primeiro, com os dados e a lista do que conferir', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Carla Dias' })).toBeInTheDocument()
    expect(screen.getByText('E-mail da faculdade confirmado')).toBeInTheDocument()
    expect(screen.getByText('julho de 2027')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Semestre atual' })).toBeInTheDocument()
  })

  it('CA-294: aprovar chama a decisão do pedido aberto', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', true, null)
  })

  it('CA-295: recusar exige o motivo', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o motivo da recusa.')
    expect(valor.decidirPedido).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('radio', { name: 'Ilegível' }))
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', false, 'Ilegível')
  })

  it('CA-295: "Outro motivo" pede o texto', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: 'Outro motivo' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Documento de outra pessoa')
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', false, 'Documento de outra pessoa')
  })

  it('foco 3: clique duplo em Aprovar decide uma vez', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const valor = aprovacoes({ decidirPedido: vi.fn(() => new Promise<string | null>((r) => (terminar = r))) })
    render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Aprovar' }))
    terminar(null)
    expect(valor.decidirPedido).toHaveBeenCalledTimes(1)
  })

  it('CB-61: decisão recusada pelo banco aparece na tela e continua depois que o pedido sai da fila', async () => {
    const valor = aprovacoes({ decidirPedido: vi.fn(async () => 'Este pedido já foi decidido.') })
    const { rerender } = render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este pedido já foi decidido.')

    // A fila recarregada não tem mais o p1: o aviso continua, agora sobre o p2.
    const [, segundo] = valor.pedidos
    rerender(<TelaAprovacoes aprovacoes={{ ...valor, pedidos: segundo ? [segundo] : [] }} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Júlia Martins' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Este pedido já foi decidido.')

    // Fila vazia: o aviso aparece junto de "Nenhum comprovante esperando você."
    rerender(<TelaAprovacoes aprovacoes={{ ...valor, pedidos: [], pendentes: { estudantes: 0, crn: 1, total: 1 } }} />)
    expect(screen.getByText('Nenhum comprovante esperando você.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Este pedido já foi decidido.')
  })

  it('CB-61: o aviso do pedido decidido some quando outro pedido é aberto', async () => {
    const valor = aprovacoes({ decidirPedido: vi.fn(async () => 'Este pedido já foi decidido.') })
    const { rerender } = render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este pedido já foi decidido.')
    const [, segundo] = valor.pedidos
    rerender(<TelaAprovacoes aprovacoes={{ ...valor, pedidos: segundo ? [segundo] : [] }} />)
    await usuario.click(screen.getByRole('button', { name: /Júlia Martins/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('as caixas do "Confira no comprovante" zeram ao abrir outro pedido', async () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes()} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('checkbox', { name: 'Semestre atual' }))
    expect(screen.getByRole('checkbox', { name: 'Semestre atual' })).toBeChecked()
    await usuario.click(screen.getByRole('button', { name: /Júlia Martins/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Júlia Martins' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Semestre atual' })).not.toBeChecked()
  })

  it('o motivo fica no pedido em que nasceu, mesmo quando a fila muda sozinha', async () => {
    const valor = aprovacoes()
    const { rerender } = render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Ilegível' }))
    expect(screen.getByRole('radio', { name: 'Ilegível' })).toBeChecked()

    // Outro administrador decidiu o pedido p1: a fila recarregada abre o p2.
    const [, segundo] = valor.pedidos
    rerender(<TelaAprovacoes aprovacoes={{ ...valor, pedidos: segundo ? [segundo] : [] }} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Júlia Martins' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ilegível' })).not.toBeChecked()
  })

  it('o erro de um pedido que ainda está na fila não aparece em outro pedido aberto', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const valor = aprovacoes({ decidirPedido: vi.fn(() => new Promise<string | null>((r) => (terminar = r))) })
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Aprovar' }))
    // Enquanto o p1 espera a resposta, o administrador abre o p2.
    await usuario.click(screen.getByRole('button', { name: /Júlia Martins/ }))
    await act(async () => terminar('Não deu para falar com o servidor. Confira a internet e tente de novo.'))
    expect(screen.getByRole('heading', { level: 2, name: 'Júlia Martins' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CA-296: aba CRN com o link do CFN e as duas decisões', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /CRN 1/ }))
    expect(screen.getByRole('link', { name: /Abrir a Consulta Nacional do CFN/ })).toHaveAttribute('href', 'https://cnn.cfn.org.br/application/index/consulta-nacional')
    expect(screen.getByText('CRN-6 12345')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Conferido' }))
    expect(valor.decidirCrn).toHaveBeenCalledWith('u2', 'conferido')
  })

  it('fila vazia diz que não há nada pendente', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes({ pedidos: [], pendentes: { estudantes: 0, crn: 1, total: 1 } })} />)
    expect(screen.getByText('Nenhum comprovante esperando você.')).toBeInTheDocument()
  })
})

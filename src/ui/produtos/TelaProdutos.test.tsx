import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioProdutos, porCem, produtoComoAlimento, validarProduto, type Produto } from '@/domain/produtos.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { TelaProdutos } from './TelaProdutos.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const iogurte: Produto = {
  id: 900001,
  codigoBarras: '7891000100103',
  nome: 'Iogurte natural',
  marca: 'Marca X',
  porcaoG: 170,
  medidaCaseira: '1 pote',
  porPorcao: {
    energia_kcal: 110,
    carboidrato_g: 12,
    acucares_g: 10,
    proteina_g: 8,
    lipideos_g: 3,
    gordura_saturada_g: 2,
    fibra_g: 0,
    sodio_mg: 60,
    calcio_mg: 250,
  },
  criadoEm: '2026-09-15T12:00:00.000Z',
}

describe('Produto pelo rótulo', () => {
  beforeEach(() => localStorage.clear())

  it('converte o valor da porção para 100 g', () => {
    expect(porCem(110, 170)).toBe(64.71)
    const alimento = produtoComoAlimento(iogurte)
    expect(alimento.nutrientes.energia_kcal).toBe(64.71)
    expect(alimento.nutrientes.calcio_mg).toBe(147.06)
    expect(alimento.descricao).toBe('Iogurte natural (Marca X)')
  })

  it('exige os campos obrigatórios do rótulo', () => {
    const semSodio: Produto = { ...iogurte, porPorcao: { ...iogurte.porPorcao, sodio_mg: null } }
    expect(validarProduto(semSodio).map((p) => p.campo)).toContain('sodio_mg')
    expect(validarProduto({ ...iogurte, porcaoG: 0 }).map((p) => p.campo)).toContain('porcaoG')
    expect(validarProduto(iogurte)).toEqual([])
  })

  it('recusa açúcar maior que carboidrato e saturada maior que gordura total', () => {
    const inconsistente: Produto = { ...iogurte, porPorcao: { ...iogurte.porPorcao, acucares_g: 20, gordura_saturada_g: 9 } }
    const campos = validarProduto(inconsistente).map((p) => p.campo)
    expect(campos).toContain('acucares_g')
    expect(campos).toContain('gordura_saturada_g')
  })

  it('guarda e lê do armazenamento, com id acima da tabela', () => {
    const repo = criarRepositorioProdutos(new MemoriaFalsa())
    const salvo = repo.salvar({ ...iogurte })
    expect(salvo.id).toBeGreaterThanOrEqual(900000)
    expect(repo.listar()).toHaveLength(1)
    repo.excluir(salvo.id)
    expect(repo.listar()).toEqual([])
  })

  it('cadastra pela tela e mostra o produto na lista', async () => {
    render(<TelaProdutos />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar pelo rótulo' }))

    const janela = within(screen.getByRole('dialog', { name: 'Cadastrar produto pelo rótulo' }))
    await usuario.type(janela.getByLabelText('Nome do produto'), 'Iogurte natural')
    await usuario.type(janela.getByLabelText('Porção do rótulo'), '170')
    await usuario.type(janela.getByLabelText('Valor energético'), '110')
    await usuario.type(janela.getByLabelText('Carboidratos'), '12')
    await usuario.type(janela.getByLabelText('Açúcares totais'), '10')
    await usuario.type(janela.getByLabelText('Proteínas'), '8')
    await usuario.type(janela.getByLabelText('Gorduras totais'), '3')
    await usuario.type(janela.getByLabelText('Gorduras saturadas'), '2')
    await usuario.type(janela.getByLabelText('Fibra alimentar'), '0')
    await usuario.type(janela.getByLabelText('Sódio'), '60')

    expect(janela.getByText(/Equivale a 65 kcal por 100 g/)).toBeInTheDocument()
    await usuario.click(janela.getByRole('button', { name: 'Cadastrar produto' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const lista = within(screen.getByRole('list', { name: 'Produtos cadastrados' }))
    expect(lista.getByRole('heading', { name: 'Iogurte natural' })).toBeInTheDocument()
    expect(lista.getByText(/170 g · 1 pote|170 g/)).toBeInTheDocument()
  })

  it('excluir pede confirmação; cancelar mantém, confirmar tira da lista e avisa', async () => {
    criarRepositorioProdutos(localStorage).salvar({ ...iogurte })
    render(<TelaProdutos />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Iogurte natural' }))
    const confirmacao = screen.getByRole('alertdialog', { name: 'Excluir “Iogurte natural”?' })
    await usuario.click(within(confirmacao).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { name: 'Iogurte natural' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Excluir Iogurte natural' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir produto' }))
    expect(screen.queryByRole('heading', { name: 'Iogurte natural' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Produto “Iogurte natural” excluído.')
  })

  it('não salva com campo do rótulo faltando', async () => {
    render(<TelaProdutos />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar pelo rótulo' }))
    const janela = within(screen.getByRole('dialog'))
    await usuario.type(janela.getByLabelText('Nome do produto'), 'Só o nome')
    await usuario.click(janela.getByRole('button', { name: 'Cadastrar produto' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(janela.getByText(/Faltam \d+ campos do rótulo/)).toBeInTheDocument()
  })
})

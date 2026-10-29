// Spec base-ampliada, fase 2, D-755 e CA-1760: a ficha da cópia do catálogo de rótulos diz a fonte, com o link.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { produtoDosDados } from '@/domain/alimentoProprio.ts'
import { dadosDaCopia } from '@/domain/catalogoOff.ts'
import { criarRepositorioProdutos, produtoComoAlimento } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { TelaAlimentos } from './TelaAlimentos.tsx'

beforeEach(() => localStorage.clear())
afterEach(() => registrarProdutos([]))

it('CA-1760: o rodapé diz "Rótulo: Open Food Facts", com o link para o produto e a versão do catálogo', async () => {
  const rotulo = {
    codigo: '7891000100103',
    nome: 'Iogurte Natural Integral Cremoso',
    marca: 'Nestlé',
    por100: { energia_kcal: 60, proteina_g: 4, lipideos_g: 3, carboidrato_g: 5 },
    porcao: { gramas: 170, texto: '1 pote (170 g)' },
    unidade: 'g' as const,
    fonte: 'catálogo de rótulos do Open Food Facts (versão 2026-10-29)',
  }
  const repositorio = criarRepositorioProdutos(armazenamentoLocal())
  repositorio.salvar(produtoDosDados(dadosDaCopia(rotulo)))
  // Como a área de trabalho faz ao abrir: os alimentos próprios da conta entram na busca.
  registrarProdutos(repositorio.listar().map(produtoComoAlimento))
  render(<TelaAlimentos />)
  const usuario = userEvent.setup()
  await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'iogurte natural integral cremoso')
  await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getByRole('button', { name: /^Iogurte Natural Integral Cremoso/ }))
  const ficha = within(screen.getByRole('dialog'))
  expect(ficha.getByText(/Rótulo: Open Food Facts/)).toHaveTextContent('versão 2026-10-29')
  expect(ficha.getByRole('link', { name: 'produto nº 7891000100103' })).toHaveAttribute('href', 'https://world.openfoodfacts.org/product/7891000100103')
  expect(ficha.getByText(/Rótulo: Open Food Facts/)).toHaveTextContent('ODbL')
})

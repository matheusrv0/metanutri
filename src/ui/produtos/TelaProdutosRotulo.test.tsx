// Spec base-ampliada, fase 2, D-769 (revisão da fase 2, achado 9): o cartão da cópia do catálogo em Meus alimentos.
import { render, screen } from '@testing-library/react'
import { produtoDosDados } from '@/domain/alimentoProprio.ts'
import { dadosDaCopia } from '@/domain/catalogoOff.ts'
import { criarRepositorioProdutos } from '@/domain/produtos.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { TelaProdutos } from './TelaProdutos.tsx'

beforeEach(() => localStorage.clear())

it('o cartão diz "Rótulo: Open Food Facts" com o link, e as kcal por 100 g sem "por 100 g Por 100 g"', () => {
  const rotulo = {
    codigo: '7891000100103',
    nome: 'Iogurte Natural Integral Cremoso',
    marca: 'Nestlé',
    por100: { energia_kcal: 60.4, proteina_g: 4, lipideos_g: 3, carboidrato_g: 5 },
    porcao: { gramas: 170, texto: '1 pote (170 g)' },
    unidade: 'g' as const,
    fonte: 'catálogo de rótulos do Open Food Facts (versão 2026-10-29)',
  }
  criarRepositorioProdutos(armazenamentoLocal()).salvar(produtoDosDados(dadosDaCopia(rotulo)))
  render(<TelaProdutos />)
  expect(screen.getByRole('link', { name: 'produto nº 7891000100103' })).toHaveAttribute('href', 'https://world.openfoodfacts.org/product/7891000100103')
  expect(screen.getByText(/Rótulo: Open Food Facts/)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/por 100 g\s*Por 100 g/i)
  expect(screen.getByText('60 kcal')).toBeInTheDocument()
})

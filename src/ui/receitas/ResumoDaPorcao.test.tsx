import { render, screen } from '@testing-library/react'
import { PRIMEIRO_ID_PRODUTO } from '@/domain/produtos.ts'
import { PANQUECA } from '@/domain/receitas.test-utils.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import type { Alimento } from '@/domain/tipos.ts'
import { ResumoDaPorcao } from './ResumoDaPorcao.tsx'

// Spec receitas-com-calculo, CA-862 (rodada da revisão): a fonte diz de onde vem cada parte da soma.

const GRANOLA: Alimento = {
  id: PRIMEIRO_ID_PRODUTO + 1,
  descricao: 'Granola (Marca X)',
  categoria: 'Meus produtos',
  base: null,
  preparo: null,
  qualificadores: null,
  nutrientes: { energia_kcal: 400, proteina_g: 10, lipideos_g: 10, carboidrato_g: 60, fibra_g: 8 } as Alimento['nutrientes'],
  tracos: [],
}

afterEach(() => registrarProdutos([]))

describe('a fonte do valor da porção (CA-862)', () => {
  it('só ingredientes da base: Base MetaNutri (CA-1293, D-461)', () => {
    render(<ResumoDaPorcao receita={PANQUECA} />)
    expect(screen.getByText(/Soma dos ingredientes: Base MetaNutri\./)).toBeInTheDocument()
  })

  it('com produto de Meus produtos: a TACO e o rótulo', () => {
    registrarProdutos([GRANOLA])
    render(<ResumoDaPorcao receita={{ ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: GRANOLA.id, gramas: 20 }] }} />)
    expect(screen.getByText(/Soma dos ingredientes: Base MetaNutri e Meus alimentos\./)).toBeInTheDocument()
  })

  it('só produtos: só o rótulo, sem a TACO', () => {
    registrarProdutos([GRANOLA])
    render(<ResumoDaPorcao receita={{ ...PANQUECA, ingredientes: [{ alimentoId: GRANOLA.id, gramas: 40 }], pesoProntoG: null }} />)
    expect(screen.getByText(/Soma dos ingredientes: Meus alimentos\./)).toBeInTheDocument()
    expect(screen.queryByText(/TACO/)).not.toBeInTheDocument()
  })
})

import { render, screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarReceita, criarPlanoPadrao } from '@/domain/plano.ts'
import { PANQUECA } from '@/domain/receitas.test-utils.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

// Spec receitas-com-calculo, US-RC4: a receita na folha impressa.

let n = 0
const ids = () => `id${++n}`

// Em "Só medida", o modo dos planos de antes (spec alimentos-e-gramaturas, D-376).
const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', receitas: 'Suco verde: couve, limão e água.', quantidades: 'medida-caseira' }

function planoComPanqueca(gramas = 120): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes[0]
  if (!desjejum) throw new Error('plano padrão mudou')
  return adicionarReceita(plano, desjejum.id, 'principal', { receita: PANQUECA, gramas }, ids)
}

beforeEach(() => localStorage.clear())

describe('a receita na folha (CA-879 a CA-881)', () => {
  it('CA-879: a refeição mostra o nome da receita e a porção, uma quantidade só (spec conduta-da-nutricionista, D-297); em "Gramas", o peso', () => {
    const { unmount } = render(<FolhaDieta caso={caso} plano={planoComPanqueca(180)} />)
    const desjejum = within(screen.getByRole('region', { name: '06:00 Desjejum' }))
    expect(desjejum.getByText('Panqueca de banana').closest('li')).toHaveTextContent(/^Panqueca de banana, 1 unidade e meia$/)
    unmount()
    render(<FolhaDieta caso={{ ...caso, quantidades: 'gramas' }} plano={planoComPanqueca(180)} />)
    expect(within(screen.getByRole('region', { name: '06:00 Desjejum' })).getByText('Panqueca de banana').closest('li')).toHaveTextContent(/^Panqueca de banana, 180 g$/)
    expect(desjejum.queryByText(/Banana prata/)).not.toBeInTheDocument()
  })

  it('CA-880: a seção Receitas traz a receita inteira e, depois, o texto livre', () => {
    render(<FolhaDieta caso={caso} plano={planoComPanqueca()} />)
    const secao = screen.getByRole('region', { name: 'Receitas' })
    const receita = within(secao).getByRole('article', { name: 'Panqueca de banana' })
    expect(receita).toHaveTextContent('Rende 2 unidades (120 g cada)')
    const ingredientes = within(receita).getAllByRole('listitem').map((li) => li.textContent)
    expect(ingredientes).toEqual(['Banana prata — 2 unidades', 'Ovo — 2 unidades', 'Aveia em flocos — 2 colheres de sopa'])
    expect(within(receita).getByText(/Amasse a banana/)).toHaveClass('whitespace-pre-wrap')
    // O texto livre vem depois das receitas calculadas.
    expect(secao.textContent?.indexOf('Suco verde')).toBeGreaterThan(secao.textContent?.indexOf('Amasse a banana') ?? Infinity)
  })

  it('CA-880: sem receita no plano e sem texto, a seção não aparece', () => {
    render(<FolhaDieta caso={{ ...caso, receitas: '' }} plano={criarPlanoPadrao(ids)} />)
    expect(screen.queryByRole('region', { name: 'Receitas' })).not.toBeInTheDocument()
  })

  it('CA-881: a lista de compras abre a receita nos ingredientes', () => {
    render(<FolhaDieta caso={caso} plano={planoComPanqueca()} opcoes={{ listaDeCompras: true, trocas: false }} />)
    const compras = screen.getByRole('region', { name: 'Lista de compras' })
    expect(compras).toHaveTextContent('Banana prata — 1 unidade')
    expect(compras).toHaveTextContent('Aveia em flocos — 1 colher de sopa')
    expect(compras).not.toHaveTextContent('Panqueca')
  })
})

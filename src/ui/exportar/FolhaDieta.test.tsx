import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { FolhaDieta } from './FolhaDieta.tsx'
import { MenuExportar } from './MenuExportar.tsx'

let n = 0
const ids = () => `id${++n}`

const caso: Caso = {
  ...criarCasoVazio('c1'),
  nome: 'Maria, 28 anos',
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 60,
  estaturaCm: 165,
  orientacoes: 'Beber 2 litros de água por dia.',
}

function planoCheio(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  const comPrincipal = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
  return adicionarItem(comPrincipal, almoco.id, 'substituto1', { alimentoId: 91, gramas: 120 }, ids)
}

describe('Folha da dieta', () => {
  it('lista refeições por horário com alimento, medida caseira e gramas', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByRole('heading', { name: /12:00\s*Almoço/ })).toBeInTheDocument()
    expect(screen.getAllByText(/Arroz, tipo 1, cozido —/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/150 g/).length).toBeGreaterThan(0)
  })

  it('mostra o substituto junto da refeição', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByText('Substituto 1')).toBeInTheDocument()
    expect(screen.getByText(/Batata, inglesa, cozida —/)).toBeInTheDocument()
  })

  it('traz orientações e a frase de responsabilidade', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByText('Beber 2 litros de água por dia.')).toBeInTheDocument()
    expect(screen.getByText(/prescrição é responsabilidade do nutricionista/)).toBeInTheDocument()
  })

  it('no modo rápido, a folha avisa que não houve avaliação', () => {
    render(<FolhaDieta caso={{ ...caso, modo: 'rapido', metaEnergiaKcal: 1800 }} plano={planoCheio()} />)
    expect(screen.getByText(/sem avaliação antropométrica/)).toBeInTheDocument()
    expect(screen.getByText('1.800 kcal')).toBeInTheDocument()
  })

  it('traz missões do dia e lista de compras', () => {
    render(<FolhaDieta caso={caso} plano={planoCheio()} />)
    expect(screen.getByRole('heading', { name: 'Missões do dia' })).toBeInTheDocument()
    expect(screen.getByText(/Almoço por volta das 12:00/)).toBeInTheDocument()
    expect(screen.getAllByText(/litros de água/).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Lista de compras do dia' })).toBeInTheDocument()
    expect(screen.getByText(/Arroz, tipo 1, cozido — 150 g/)).toBeInTheDocument()
  })

  it('campo vazio não vira texto solto na folha', () => {
    render(<FolhaDieta caso={{ ...caso, orientacoes: '', receitas: '' }} plano={criarPlanoPadrao(ids)} />)
    expect(screen.queryByText('Orientações')).not.toBeInTheDocument()
    expect(screen.queryByText('Receitas')).not.toBeInTheDocument()
    expect(screen.getAllByText('Sem alimentos nesta refeição.')).toHaveLength(6)
  })

  it('o menu Exportar abre a folha e oferece imprimir', async () => {
    render(<MenuExportar caso={caso} plano={planoCheio()} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Dieta para imprimir/ }))

    const janela = within(screen.getByRole('dialog', { name: 'Dieta para imprimir' }))
    expect(janela.getAllByText(/Arroz, tipo 1, cozido —/).length).toBeGreaterThan(0)
    expect(janela.getByRole('button', { name: /Imprimir ou salvar em PDF/ })).toBeInTheDocument()
  })
})

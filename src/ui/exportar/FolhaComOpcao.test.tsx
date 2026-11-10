import { render, screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, adicionarOpcaoAoItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { FolhaDieta } from './FolhaDieta.tsx'

// Spec busca-substitutos, D-1115: a opção do item na folha impressa.

let n = 0
const ids = () => `id${++n}`

const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria', quantidades: 'medida-e-gramas' }

function planoComOpcao(): Plano {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
  if (!almoco) throw new Error('plano padrão mudou')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150, medida: { nome: 'colher de sopa', quantidade: 6, gramasPorMedida: 25 } }, ids)
  const arroz = plano.refeicoes.find((r) => r.id === almoco.id)?.opcoes.principal[0]
  if (!arroz) throw new Error('sem arroz')
  return adicionarOpcaoAoItem(plano, almoco.id, arroz.id, { alimentoId: 91, gramas: 350, medida: { nome: 'unidade', quantidade: 2.5, gramasPorMedida: 140 } })
}

beforeEach(() => localStorage.clear())

describe('a opção do item na folha', () => {
  it('CA-2122: embaixo do item, "ou", o nome para o paciente e a quantidade', () => {
    render(<FolhaDieta caso={caso} plano={planoComOpcao()} />)
    const almoco = within(screen.getByRole('region', { name: '12:00 Almoço' }))
    const item = almoco.getByRole('listitem')
    expect(item).toHaveTextContent(/^Arroz.*6 colheres de sopa \(150 g\)ou Batata.*, 2 unidades e meia \(350 g\)$/)
    // A refeição continua com uma opção só: a opção do item não vira "Opção 2".
    expect(almoco.queryByText(/Opção 2/)).not.toBeInTheDocument()
  })
})

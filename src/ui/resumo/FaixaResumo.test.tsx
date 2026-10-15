import { render, screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { FaixaResumo } from './FaixaResumo.tsx'

let n = 0
const ids = () => `id${++n}`

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('plano sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 1, gramas: 300 }, ids)
}

describe('Faixa do topo da etapa 3 arredonda na direção do estado (CA-696)', () => {
  it('CA-696: 89,6% do gasto sai "89%" e 110,4% sai "111%"', () => {
    const plano = planoComArroz()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    const caso = (get: number): Caso => ({
      ...criarCasoVazio('c1'),
      sexo: 'F',
      idadeAnos: 28,
      pesoKg: 60,
      estaturaCm: 165,
      energia: { ...criarCasoVazio('x').energia, getManual: get },
    })
    const doGasto = () => within(screen.getByText('Do gasto').parentElement as HTMLElement)

    const { unmount } = render(<FaixaResumo caso={caso(kcal / 0.896)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('89%')).toBeInTheDocument()
    unmount()
    render(<FaixaResumo caso={caso(kcal / 1.104)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('111%')).toBeInTheDocument()
  })
})

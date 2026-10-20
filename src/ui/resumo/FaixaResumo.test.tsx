import { render, screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularMacros } from '@/domain/macros.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, MetasMacros, Plano } from '@/domain/tipos.ts'
import { FaixaResumo } from './FaixaResumo.tsx'

let n = 0
const ids = () => `id${++n}`

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('plano sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 1, gramas: 300 }, ids)
}

const casoCom = (extra: Partial<Caso>): Caso => ({
  ...criarCasoVazio('c1'),
  sexo: 'F',
  idadeAnos: 28,
  pesoKg: 60,
  estaturaCm: 165,
  ...extra,
})
const comGet = (get: number) => casoCom({ energia: { ...criarCasoVazio('x').energia, getManual: get } })
describe('Produto apagado na faixa da etapa 3 (spec revisao-geral-trabalho, CA-789)', () => {
  it('a energia e os macros levam a †', () => {
    const plano = planoComArroz()
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('plano sem almoço')
    render(<FaixaResumo caso={comGet(1800)} plano={adicionarItem(plano, almoco.id, 'principal', { alimentoId: 900_001, gramas: 40 }, ids)} aoAlterar={vi.fn()} />)
    for (const rotulo of ['Energia do plano', 'Proteína', 'Carboidrato', 'Gordura']) expect(screen.getByText(rotulo).parentElement).toHaveTextContent('†')
    expect(screen.getByText('GET manual').parentElement).not.toHaveTextContent('†')
  })
})

const celula = (rotulo: string) => {
  const pai = screen.getByText(rotulo).parentElement
  if (!pai) throw new Error(`sem a célula ${rotulo}`)
  return pai
}
const doGasto = () => within(celula('Do gasto'))

describe('Faixa do topo da etapa 3 arredonda sem desmentir o estado (CA-696, CA-711, CA-712)', () => {
  it('CA-696: 89,6% do gasto sai "89%" e 110,4% sai "111%"', () => {
    const plano = planoComArroz()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total

    const { unmount } = render(<FaixaResumo caso={comGet(kcal / 0.896)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('89%')).toBeInTheDocument()
    unmount()
    render(<FaixaResumo caso={comGet(kcal / 1.104)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('111%')).toBeInTheDocument()
  })

  it('CA-711: longe do limite, o % do gasto arredonda para o mais perto (125,2% sai "125%", 70,6% sai "71%")', () => {
    const plano = planoComArroz()
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total

    const { unmount } = render(<FaixaResumo caso={comGet(kcal / 1.252)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('125%')).toBeInTheDocument()
    unmount()
    render(<FaixaResumo caso={comGet(kcal / 0.706)} plano={plano} aoAlterar={() => undefined} />)
    expect(doGasto().getByText('71%')).toBeInTheDocument()
  })

  it('CA-712: o % do macro com meta em % vai para baixo só quando o mais perto chegaria à meta', () => {
    const plano = planoComArroz()
    const totais = totaisDoPlano(plano, buscarAlimento)
    const macros = calcularMacros(totais, casoCom({}))
    const rotulos = { proteina: 'Proteína', carboidrato: 'Carboidrato', gordura: 'Gordura' } as const
    // Um macro cujo % tenha casa de ,5 ou mais: aí o mais perto e "para baixo" dão números diferentes.
    const chave = (['proteina', 'carboidrato', 'gordura'] as const).find((c) => ((macros[c].pctKcal ?? 0) % 1) >= 0.5)
    if (!chave) throw new Error('fixture: nenhum macro com casa de ,5 ou mais')
    const pct = macros[chave].pctKcal ?? 0
    const comMeta = (min: number): MetasMacros => ({ [chave]: { tipo: 'pct', min, max: 100 } })

    // Meta no inteiro logo acima: o mais perto daria o número da meta, em cor de abaixo.
    const { unmount } = render(<FaixaResumo caso={casoCom({ metasMacros: comMeta(Math.ceil(pct)) })} plano={plano} aoAlterar={() => undefined} />)
    expect(celula(rotulos[chave])).toHaveTextContent(`· ${Math.floor(pct)}%`)
    unmount()

    // Meta longe: o mais perto.
    render(<FaixaResumo caso={casoCom({ metasMacros: comMeta(Math.ceil(pct) + 5) })} plano={plano} aoAlterar={() => undefined} />)
    expect(celula(rotulos[chave])).toHaveTextContent(`· ${Math.round(pct)}%`)
  })
})

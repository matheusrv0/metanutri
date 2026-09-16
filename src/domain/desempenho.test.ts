// CB-11 e CA-21: recalcular um plano grande e buscar alimentos continuam rápidos.
import { calcularAdequacao } from './adequacao.ts'
import { buscarAlimentos } from './busca.ts'
import { criarCasoVazio } from './caso.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import { OPCOES, type Caso, type Plano } from './tipos.ts'

let n = 0
const ids = () => `id${++n}`

/** 6 refeições × 3 opções × 15 alimentos, o pior caso previsto na SPEC. */
function planoGrande(): Plano {
  let plano = criarPlanoPadrao(ids)
  for (const refeicao of plano.refeicoes) {
    for (const opcao of OPCOES) {
      for (let i = 0; i < 15; i++) {
        const alimento = ALIMENTOS[(i * 37) % ALIMENTOS.length]
        if (alimento) plano = adicionarItem(plano, refeicao.id, opcao, { alimentoId: alimento.id, gramas: 80 }, ids)
      }
    }
  }
  return plano
}

const caso: Caso = { ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

const medir = (rodar: () => void) => {
  const inicio = performance.now()
  rodar()
  return performance.now() - inicio
}

describe('desempenho', () => {
  it('CB-11: recalcular totais e adequação de um plano grande leva menos de 300 ms', () => {
    const plano = planoGrande()
    expect(plano.refeicoes.flatMap((r) => r.opcoes.principal)).toHaveLength(6 * 15)

    const duracao = medir(() => {
      const totais = totaisDoPlano(plano, buscarAlimento)
      calcularAdequacao(totais, caso, { tipo: 'individual' })
    })
    expect(duracao).toBeLessThan(300)
  })

  it('CB-11: sugerir alimentos para cobrir leva menos de 500 ms com a base completa', () => {
    const totais = totaisDoPlano(criarPlanoPadrao(ids), buscarAlimento)
    const adequacao = calcularAdequacao(totais, caso, { tipo: 'individual' })
    const duracao = medir(() => {
      sugerirParaCobrir('ferro_mg', totais, adequacao, { alimentos: ALIMENTOS, gastoEnergetico: 1800 })
    })
    expect(duracao).toBeLessThan(500)
  })

  it('CA-21: buscar alimentos responde em menos de 200 ms', () => {
    // primeira chamada monta o índice
    buscarAlimentos('arroz', ALIMENTOS)
    const duracao = medir(() => {
      for (const termo of ['arroz int', 'feijao carioca', 'banana', '2 colher de sopa aveia', 'leite']) {
        buscarAlimentos(termo, ALIMENTOS)
      }
    })
    expect(duracao).toBeLessThan(200)
  })
})

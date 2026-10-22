// Spec receitas-com-calculo, D-276 e CA-876 a CA-878, CA-882: onde a receita entra e onde não entra.
import { calcularAdequacao } from './adequacao.ts'
import { criarCasoVazio } from './caso.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { duplicarCaso } from './duplicar.ts'
import { missoesDoPlano } from './missoes.ts'
import { clonarPlano, criarRepositorioModelos } from './modelos.ts'
import { adicionarItem, adicionarReceita, criarPlanoPadrao } from './plano.ts'
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import { PANQUECA, VITAMINA_C_DA_PANQUECA } from './receitas.test-utils.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { Caso, Plano } from './tipos.ts'
import { trocasDoPlano } from './trocas.ts'

let n = 0
const ids = () => `id${++n}`

const CASO: Caso = { ...criarCasoVazio('c'), sexo: 'F', idadeAnos: 28 }

/** O plano padrão com a panqueca no café da manhã e, se pedido, arroz no Almoço. */
function planoComPanqueca(comArroz = false): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes.find((r) => r.nome === 'Café da manhã')?.id ?? ''
  const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')?.id ?? ''
  const comReceita = adicionarReceita(plano, desjejum, 'principal', { receita: PANQUECA, gramas: 120 }, ids)
  return comArroz ? adicionarItem(comReceita, almoco, 'principal', { alimentoId: 3, gramas: 100 }, ids) : comReceita
}

describe('o cobrir não sugere receita (CA-877)', () => {
  it('nenhuma sugestão é receita, e a falta já desconta a receita do plano', () => {
    const vazio = criarPlanoPadrao(ids)
    const comReceita = planoComPanqueca()
    const cobrir = (plano: Plano) => {
      const totais = totaisDoPlano(plano, buscarAlimento)
      return sugerirParaCobrir('vitamina_c_mg', totais, calcularAdequacao(totais, CASO, CASO.adequacao.preset), { alimentos: ALIMENTOS, gastoEnergetico: null })
    }
    const semReceita = cobrir(vazio)
    const resultado = cobrir(comReceita)
    expect(resultado.sugestoes.length).toBeGreaterThan(0)
    expect(resultado.sugestoes.every((s) => s.alimentoId !== ID_DE_RECEITA && s.descricao !== PANQUECA.nome)).toBe(true)
    expect(semReceita.falta - resultado.falta).toBeCloseTo(VITAMINA_C_DA_PANQUECA, 6)
  })
})

describe('missões (CA-878)', () => {
  it('a refeição só com receita tem missão; a receita não conta como fruta nem vegetal', () => {
    const plano = planoComPanqueca()
    const missoes = missoesDoPlano(plano)
    const desjejum = plano.refeicoes.find((r) => r.nome === 'Café da manhã')
    expect(missoes.map((m) => m.id)).toContain(`refeicao-${desjejum?.id ?? ''}`)
    expect(missoes.map((m) => m.id)).not.toContain('frutas')
    expect(missoes.map((m) => m.id)).not.toContain('vegetais')
  })
})

describe('trocas (CA-882)', () => {
  it('a receita e os ingredientes dela não têm troca; o alimento solto continua tendo', () => {
    const grupos = trocasDoPlano(planoComPanqueca(true), buscarAlimento, { alimentos: ALIMENTOS, porAlimento: 2 })
    const ids = grupos.map((g) => g.alimentoId)
    expect(ids).toContain(3)
    for (const fora of [ID_DE_RECEITA, ...PANQUECA.ingredientes.map((i) => i.alimentoId)]) expect(ids).not.toContain(fora)
  })
})

describe('modelo e duplicar levam a cópia (CA-876)', () => {
  it('o modelo de plano e o plano novo tirado dele têm a mesma receita e a mesma soma', () => {
    const plano = planoComPanqueca()
    const modelo = criarRepositorioModelos(null, { gerarId: ids }).salvar({ nome: 'Café rápido', descricao: '', plano })
    const usado = clonarPlano(modelo.plano, ids)
    const receitaDe = (p: Plano) => p.refeicoes.find((r) => r.nome === 'Café da manhã')?.opcoes.principal[0]?.receita
    expect(receitaDe(modelo.plano)).toEqual(PANQUECA)
    expect(receitaDe(usado)).toEqual(PANQUECA)
    expect(totaisDoPlano(usado, buscarAlimento).nutrientes.energia_kcal.total).toBeCloseTo(totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total, 6)
  })

  it('duplicar o plano leva a receita', () => {
    const plano = planoComPanqueca()
    const copia = duplicarCaso({ caso: CASO, plano }, ids, { hoje: null })
    expect(copia.plano.refeicoes.find((r) => r.nome === 'Café da manhã')?.opcoes.principal[0]).toMatchObject({ alimentoId: ID_DE_RECEITA, gramas: 120, receita: PANQUECA })
  })
})

import { IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import type { MudancaSugerida } from '../../supabase/functions/_shared/iaContrato.ts'
import { casoDaGestante, gerarId, planoDeAdulto, restricoesDoCaso } from './ia.test-utils.ts'
import { PORCAO_REDUZIDA, type ContextoDaConferencia } from './iaConferencia.ts'
import { aplicarMudancas, conferirMudancas, efeitoDasMudancas, ITEM_DE_RECEITA, ITEM_SUMIU, resumoDoPlano } from './iaMudancas.ts'
import { gastoCalculado } from './iaPedido.ts'
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import { buscarAlimento } from './tabelas.ts'
import type { Plano } from './tipos.ts'

const caso = casoDaGestante()
const CTX: ContextoDaConferencia = {
  buscar: buscarAlimento,
  caso,
  restricoes: restricoesDoCaso(caso),
  metaKcal: 2150,
  gastoCalculado: gastoCalculado(caso),
  refeicoes: [],
  idsDoCatalogo: new Set(IDS_DO_CATALOGO_IA),
  idsProprios: new Set(),
}

const m = (o: Partial<MudancaSugerida>): MudancaSugerida => ({ tipo: 'trocar', refeicao: 1, opcao: 'principal', item: 0, alimentoId: 1, gramas: null, motivo: '+ fibra', ...o })
const ids = (plano: Plano, refeicao: number) => plano.refeicoes[refeicao]?.opcoes.principal.map((i) => [i.alimentoId, i.gramas])

describe('spec assistente-ia, D-1309: a conferência de cada mudança', () => {
  const plano = planoDeAdulto()

  it('trocar: o alimento novo passa nas conferências, com os gramas do item quando a mudança não diz', () => {
    const [c] = conferirMudancas([m({})], plano, CTX)
    expect(c).toMatchObject({ de: { alimentoId: 3, gramas: 150 }, para: { alimentoId: 1, gramas: 150 }, barrada: null })
  })

  it('a mudança que pega a ficha fica barrada, com o motivo (leite na alergia; fígado na gestação)', () => {
    const [leite, figado] = conferirMudancas([m({ tipo: 'adicionar', refeicao: 2, item: null, alimentoId: 458, gramas: 200 }), m({ alimentoId: 356 })], plano, CTX)
    expect(leite?.barrada).toBe('Alergia: leite e derivados')
    expect(figado?.barrada).toMatch(/^Na gestação, evite fígado/)
  })

  it('gramas: só a porção é conferida, reduzida ao máximo do grupo', () => {
    const [c] = conferirMudancas([m({ tipo: 'gramas', alimentoId: null, gramas: 400 })], plano, CTX)
    expect(c).toMatchObject({ para: { alimentoId: 3, gramas: 150 }, marcas: [PORCAO_REDUZIDA], barrada: null })
  })

  it('item que não existe, ou de receita, fica barrado', () => {
    const comReceita: Plano = { refeicoes: plano.refeicoes.map((r, i) => (i === 1 ? { ...r, opcoes: { ...r.opcoes, principal: [{ id: 'r', alimentoId: ID_DE_RECEITA, gramas: 200 }, ...r.opcoes.principal] } } : r)) }
    const [sumiu, receita] = conferirMudancas([m({ item: 9 }), m({ item: 0 })], comReceita, CTX)
    expect(sumiu?.barrada).toBe(ITEM_SUMIU)
    expect(receita?.barrada).toBe(ITEM_DE_RECEITA)
  })
})

describe('CA-2351: aplicar as mudanças aceitas', () => {
  const plano = planoDeAdulto()
  const mudancas = conferirMudancas(
    [
      m({}), // 0: almoço, arroz tipo 1 → integral
      m({ tipo: 'gramas', item: 1, alimentoId: null, gramas: 100 }), // 1: feijão 140 → 100
      m({ tipo: 'remover', item: 4, alimentoId: null }), // 2: tira o tomate
      m({ tipo: 'adicionar', item: null, alimentoId: 182, gramas: 75 }), // 3: põe banana
      m({ tipo: 'adicionar', refeicao: 2, item: null, alimentoId: 458, gramas: 200 }), // 4: barrada (leite)
    ],
    plano,
    CTX,
  )

  it('só as aceitas e não barradas entram; os números valem para o plano de antes', () => {
    const novo = aplicarMudancas(plano, mudancas, new Set([0, 1, 2, 3, 4]), gerarId)
    expect(ids(novo, 1)).toEqual([
      [1, 150],
      [561, 100],
      [410, 100],
      [78, 30],
      [182, 75],
    ])
    expect(ids(novo, 2)).toEqual(ids(plano, 2))
  })

  it('recusada não muda nada; o plano de antes não é tocado', () => {
    const antes = JSON.stringify(plano)
    const novo = aplicarMudancas(plano, mudancas, new Set([1]), gerarId)
    expect(ids(novo, 1)).toEqual([
      [3, 150],
      [561, 100],
      [410, 100],
      [78, 30],
      [157, 60],
    ])
    expect(JSON.stringify(plano)).toBe(antes)
  })

  it('o item que muda perde a medida gravada; o que não muda fica com ela', () => {
    const comMedida: Plano = {
      refeicoes: plano.refeicoes.map((r, i) =>
        i === 1 ? { ...r, opcoes: { ...r.opcoes, principal: r.opcoes.principal.map((it) => ({ ...it, medida: { nome: 'colher de sopa', quantidade: 6, gramasPorMedida: 25 } })) } } : r,
      ),
    }
    const novo = aplicarMudancas(comMedida, conferirMudancas([m({})], comMedida, CTX), new Set([0]), gerarId)
    expect(novo.refeicoes[1]?.opcoes.principal[0]).not.toHaveProperty('medida')
    expect(novo.refeicoes[1]?.opcoes.principal[1]).toHaveProperty('medida')
  })

  it('CB-1310: trocar por um alimento que já está na mesma opção soma os gramas no item que existe', () => {
    const novo = aplicarMudancas(plano, conferirMudancas([m({ item: 0, alimentoId: 561, gramas: 60 })], plano, CTX), new Set([0]), gerarId)
    expect(ids(novo, 1)).toEqual([
      [561, 200],
      [410, 100],
      [78, 30],
      [157, 60],
    ])
  })

  it('a opção 2 é o substituto 1 do plano', () => {
    const novo = aplicarMudancas(plano, conferirMudancas([m({ opcao: 'opcao2', item: null, tipo: 'adicionar', alimentoId: 533, gramas: 135 })], plano, CTX), new Set([0]), gerarId)
    expect(novo.refeicoes[1]?.opcoes.substituto1.map((i) => [i.alimentoId, i.gramas])).toEqual([[533, 135]])
  })
})

describe('CA-2353: o efeito no plano', () => {
  const plano = planoDeAdulto()
  const mudancas = conferirMudancas([m({}), m({ tipo: 'adicionar', refeicao: 2, item: null, alimentoId: 182, gramas: 75 })], plano, CTX)
  const nutrientes = ['Fibra alimentar', 'Cálcio']

  it('o antes e o depois pelo app; sem nada aceito, os dois são iguais', () => {
    const nada = efeitoDasMudancas(plano, mudancas, new Set(), CTX, nutrientes)
    expect(nada.depois).toEqual(nada.antes)
    const tudo = efeitoDasMudancas(plano, mudancas, new Set([0, 1]), CTX, nutrientes)
    expect(tudo.depois.kcal).toBeGreaterThan(tudo.antes.kcal)
    expect(tudo.depois.nutrientes['Fibra alimentar'] ?? 0).toBeGreaterThan(tudo.antes.nutrientes['Fibra alimentar'] ?? 0)
    expect(Object.keys(tudo.antes.nutrientes).sort()).toEqual(['Cálcio', 'Fibra alimentar'])
  })

  it('o resumo diz a energia em % da meta e quantos nutrientes ficam abaixo no Cobrir', () => {
    const r = resumoDoPlano(plano, CTX, [])
    expect(r.pctDaMeta).toBeCloseTo((r.kcal / 2150) * 100, 3)
    expect(r.abaixoNoCobrir).toBeGreaterThan(0)
  })
})

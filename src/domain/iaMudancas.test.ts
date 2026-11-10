import { IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import type { MudancaSugerida } from '../../supabase/functions/_shared/iaContrato.ts'
import { casoDaGestante, gerarId, planoDeAdulto, restricoesDoCaso } from './ia.test-utils.ts'
import { PORCAO_REDUZIDA, type ContextoDaConferencia } from './iaConferencia.ts'
import { aplicarMudancas, aplicarMudancasComMarcas, conferirMudancas, efeitoDasMudancas, ITEM_DE_RECEITA, ITEM_SUMIU, resumoDoPlano } from './iaMudancas.ts'
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

  it('junção com a busca de substitutos (D-1114): o item que muda pela IA mantém as opções escolhidas; a troca tira a que virou o item', () => {
    // Arroz (item 0) com as opções 1 (que a troca põe no lugar) e 533; feijão (item 1) com a opção 182.
    const comOpcoes: Plano = {
      refeicoes: plano.refeicoes.map((r, i) =>
        i === 1
          ? {
              ...r,
              opcoes: {
                ...r.opcoes,
                principal: r.opcoes.principal.map((it, j) =>
                  j === 0
                    ? { ...it, opcoesDoItem: [{ alimentoId: 1, gramas: 150 }, { alimentoId: 533, gramas: 100 }] }
                    : j === 1
                      ? { ...it, opcoesDoItem: [{ alimentoId: 182, gramas: 90 }] }
                      : it,
                ),
              },
            }
          : r,
      ),
    }
    const conferidas = conferirMudancas([m({}), m({ tipo: 'gramas', item: 1, alimentoId: null, gramas: 100 })], comOpcoes, CTX)
    const novo = aplicarMudancas(comOpcoes, conferidas, new Set([0, 1]), gerarId)
    const [arroz, feijao] = novo.refeicoes[1]?.opcoes.principal ?? []
    expect(arroz).toMatchObject({ alimentoId: 1, opcoesDoItem: [{ alimentoId: 533, gramas: 100 }] })
    expect(feijao).toMatchObject({ alimentoId: 561, gramas: 100, opcoesDoItem: [{ alimentoId: 182, gramas: 90 }] })
    // A soma num item que já existe (CB-1310) também fica com as opções dele.
    const somado = aplicarMudancas(comOpcoes, conferirMudancas([m({ alimentoId: 561 })], comOpcoes, CTX), new Set([0]), gerarId)
    expect(somado.refeicoes[1]?.opcoes.principal.find((i) => i.alimentoId === 561)?.opcoesDoItem).toEqual([{ alimentoId: 182, gramas: 90 }])
  })

  it('CB-1310: trocar por um alimento que já está na mesma opção soma os gramas no item que existe', () => {
    // Alface: 30 g no plano, mais 25 g da troca, cabe nos 60 g da folha crua.
    const novo = aplicarMudancas(plano, conferirMudancas([m({ item: 0, alimentoId: 78, gramas: 25 })], plano, CTX), new Set([0]), gerarId)
    expect(ids(novo, 1)).toEqual([
      [561, 140],
      [410, 100],
      [78, 55],
      [157, 60],
    ])
  })

  describe('CA-2385 e D-1332: a soma no item que já existe fica no máximo do grupo', () => {
    const add = (gramas: number) => m({ tipo: 'adicionar', item: null, alimentoId: 3, gramas })

    it('arroz 150 g mais duas vezes 150 g: o total fica em 150 g, e as duas mudanças saem reduzidas', () => {
      const conferidas = conferirMudancas([add(150), add(150)], plano, CTX)
      expect(conferidas.map((c) => c.maximo)).toEqual([150, 150])
      const aplicadas = aplicarMudancasComMarcas(plano, conferidas, new Set([0, 1]), gerarId)
      expect(aplicadas.plano.refeicoes[1]?.opcoes.principal.find((i) => i.alimentoId === 3)?.gramas).toBe(150)
      expect([...aplicadas.reduzidas]).toEqual([0, 1])
      expect(aplicarMudancas(plano, conferidas, new Set([0, 1]), gerarId).refeicoes[1]?.opcoes.principal.find((i) => i.alimentoId === 3)?.gramas).toBe(150)
    })

    it('a troca que soma num item que existe também fica no máximo (feijão 140 g + 60 g → 140 g)', () => {
      const aplicadas = aplicarMudancasComMarcas(plano, conferirMudancas([m({ item: 0, alimentoId: 561, gramas: 60 })], plano, CTX), new Set([0]), gerarId)
      expect(ids(aplicadas.plano, 1)?.[0]).toEqual([561, 140])
      expect(aplicadas.reduzidas.has(0)).toBe(true)
    })

    it('o item que já passava do máximo (escolha da nutricionista) não é reduzido; só não cresce', () => {
      const grande: Plano = { refeicoes: plano.refeicoes.map((r, i) => (i === 1 ? { ...r, opcoes: { ...r.opcoes, principal: [{ id: 'g', alimentoId: 3, gramas: 300 }] } } : r)) }
      const aplicadas = aplicarMudancasComMarcas(grande, conferirMudancas([add(100)], grande, CTX), new Set([0]), gerarId)
      expect(aplicadas.plano.refeicoes[1]?.opcoes.principal).toEqual([{ id: 'g', alimentoId: 3, gramas: 300 }])
      expect(aplicadas.reduzidas.has(0)).toBe(true)
    })

    it('o efeito no plano usa o reduzido e diz quais mudanças foram reduzidas', () => {
      const conferidas = conferirMudancas([add(150), add(150)], plano, CTX)
      const efeito = efeitoDasMudancas(plano, conferidas, new Set([0, 1]), CTX, [])
      expect(efeito.depois.kcal).toBeCloseTo(efeito.antes.kcal, 6)
      expect([...efeito.reduzidas]).toEqual([0, 1])
    })
  })

  it('a opção 2 é o substituto 1 do plano', () => {
    const novo = aplicarMudancas(plano, conferirMudancas([m({ opcao: 'opcao2', item: null, tipo: 'adicionar', alimentoId: 533, gramas: 135 })], plano, CTX), new Set([0]), gerarId)
    expect(novo.refeicoes[1]?.opcoes.substituto1.map((i) => [i.alimentoId, i.gramas])).toEqual([[533, 135]])
  })
})

describe('CA-2353: o efeito no plano', () => {
  const plano = planoDeAdulto()
  const mudancas = conferirMudancas([m({}), m({ tipo: 'adicionar', refeicao: 2, item: null, alimentoId: 222, gramas: 100 })], plano, CTX)
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

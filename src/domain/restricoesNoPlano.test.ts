// As restrições no Cobrir e nas trocas, com a base de verdade (spec ficha-unica, D-353 e D-354; CA-1074, CA-1075,
// CA-1080, CA-1081).
import { calcularAdequacao } from './adequacao.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { montarRestricoes } from './restricoes.ts'
import { idsDaRestricao } from './restricoesDaBase.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { totaisDeItens } from './totais.ts'
import { trocasDoAlimento } from './trocas.ts'

const MULHER_28 = { sexo: 'F' as const, idadeAnos: 28, condicao: { tipo: 'nenhuma' as const } }
const vazio = totaisDeItens([], buscarAlimento)
const adequacao = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
const restricoes = (marcadas: string[], naoGosta = '') => montarRestricoes({ marcadas, texto: '', doencas: [], naoGosta })
const cobrir = (chave: Parameters<typeof sugerirParaCobrir>[0], r = restricoes([]), incluirIngredientes = false) =>
  sugerirParaCobrir(chave, vazio, adequacao, { alimentos: ALIMENTOS, gastoEnergetico: 2500, restricoes: r, incluirIngredientes }).sugestoes.map((s) => s.alimentoId)

describe('O Cobrir respeita as restrições (CA-1074, CA-1080)', () => {
  it('sem restrição, o Cobrir do cálcio sugere laticínio; com alergia a leite, nenhum', () => {
    const leite = idsDaRestricao('leite')
    expect(cobrir('calcio_mg').some((id) => leite.has(id))).toBe(true)
    for (const incluir of [false, true]) {
      const ids = cobrir('calcio_mg', restricoes(['leite']), incluir)
      expect(ids.length).toBeGreaterThan(0)
      expect(ids.filter((id) => leite.has(id))).toEqual([])
    }
  })

  it('com intolerância à lactose, nenhum alimento com lactose', () => {
    const lactose = idsDaRestricao('lactose')
    expect(cobrir('calcio_mg', restricoes(['lactose'])).filter((id) => lactose.has(id))).toEqual([])
  })

  it('vegetariano e vegano: nenhuma carne, peixe ou fruto do mar no ferro e na B12; vegano também sem ovo e leite', () => {
    for (const chave of ['ferro_mg', 'zinco_mg', 'vitamina_b12_mcg'] as const) {
      expect(cobrir(chave, restricoes(['vegetariano'])).filter((id) => idsDaRestricao('vegetariano').has(id)), chave).toEqual([])
      expect(cobrir(chave, restricoes(['vegano'])).filter((id) => idsDaRestricao('vegano').has(id)), chave).toEqual([])
    }
  })

  it('CA-1081: o que o paciente não gosta vai para o fim, sem sair', () => {
    const antes = cobrir('ferro_mg')
    const primeiro = buscarAlimento(antes[0] ?? 0)
    if (!primeiro) throw new Error('o Cobrir do ferro precisa sugerir algo')
    const nome = primeiro.descricao.split(',')[0] ?? ''
    const depois = cobrir('ferro_mg', restricoes([], nome))
    expect(depois[0]).not.toBe(primeiro.id)
    const comONome = depois.filter((id) => (buscarAlimento(id)?.descricao ?? '').startsWith(nome))
    if (comONome.length > 0) expect(depois.slice(-comONome.length)).toEqual(comONome)
  })
})

describe('As trocas respeitam as restrições (CA-1075)', () => {
  it('o pão francês com glúten não troca por nada que tenha glúten', () => {
    const gluten = idsDaRestricao('gluten')
    const trocas = trocasDoAlimento({ alimentoId: 53, gramas: 50 }, { alimentos: ALIMENTOS, restricoes: restricoes(['gluten']) })
    expect(trocas.filter((t) => gluten.has(t.alimentoId))).toEqual([])
  })

  it('o leite com alergia a leite não troca por laticínio', () => {
    const leite = idsDaRestricao('leite')
    const trocas = trocasDoAlimento({ alimentoId: 458, gramas: 200 }, { alimentos: ALIMENTOS, restricoes: restricoes(['leite']) })
    expect(trocas.filter((t) => leite.has(t.alimentoId))).toEqual([])
  })
})

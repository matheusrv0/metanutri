// A adequação diz de que é a porcentagem (spec ficha-unica, D-459, CA-1283).
import type { LinhaAdequacao } from '@/domain/adequacao.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { aberturaDoCobrir, descreverAvisos, pctDaReferencia, porcaoDaSugestao, rotuloDosNaMeta, textoDaAdequacao } from './estiloAdequacao.ts'

const linha = (adequacaoPct: number, estado: LinhaAdequacao['estado']): LinhaAdequacao => ({
  chave: 'calcio_mg',
  rotulo: 'Cálcio',
  unidade: 'mg',
  total: adequacaoPct * 10,
  semDado: 0,
  subestimado: false,
  referencia: { tipo: 'rda', valor: 1000 },
  usouAi: false,
  metaPct: 90,
  adequacaoPct,
  limite: null,
  totalNoLimite: adequacaoPct * 10,
  notaLimite: null,
  estado,
})

describe('A adequação em % da referência (CA-1283)', () => {
  it('abaixo, na meta e acima do limite, sempre "da referência"', () => {
    expect(textoDaAdequacao(linha(27.6, 'abaixo'))).toBe('28% da referência · abaixo da meta')
    expect(textoDaAdequacao(linha(104, 'adequado'))).toBe('104% da referência')
    expect(textoDaAdequacao(linha(230, 'acima-limite'))).toBe('230% da referência · acima do limite')
  })

  it('CA-1310: na vitamina A, quem passa do limite é a pré-formada (D-470)', () => {
    const vitaminaA: LinhaAdequacao = { ...linha(810, 'acima-limite'), chave: 'vitamina_a_rae_mcg', rotulo: 'Vitamina A (RAE)', unidade: 'µg' }
    expect(textoDaAdequacao(vitaminaA)).toBe('810% da referência · pré-formada acima do limite')
  })

  it('a vitamina A com 1% não parece quase na meta', () => {
    expect(textoDaAdequacao(linha(1, 'abaixo'))).toBe('1% da referência · abaixo da meta')
    expect(pctDaReferencia(linha(1, 'abaixo'))).toBe('1% da referência')
  })

  it('o arredondamento continua sem desmentir o estado (D-211)', () => {
    expect(pctDaReferencia(linha(89.6, 'abaixo'))).toBe('89% da referência')
  })

  it('CA-1314: os avisos da sugestão, com a nota do fígado (D-471)', () => {
    expect(
      descreverAvisos({
        avisos: [{ tipo: 'excede-gasto', kcalAcima: 120 }, { tipo: 'excede-limite', chave: 'selenio_mcg', rotulo: 'Selênio' }, { tipo: 'figado-semanal' }],
      }),
    ).toEqual(['Ultrapassa o gasto energético em 120 kcal.', 'Ultrapassa o limite superior (UL) de Selênio.', 'Fígado: no máximo 1 vez por semana.'])
  })

  it('CA-1320: a porção do que o paciente pesa cru diz "(peso cru)" (D-474)', () => {
    // 66 Abóbora menina crua: come-se cozida, e a base só a tem crua. 110 Cenoura crua: come-se crua.
    expect(porcaoDaSugestao({ gramas: 100, medida: null }, buscarAlimento(66))).toBe('100 g (peso cru)')
    expect(porcaoDaSugestao({ gramas: 100, medida: null }, buscarAlimento(110))).toBe('100 g')
    expect(porcaoDaSugestao({ gramas: 150, medida: { nome: 'copo americano', quantidade: 1, gramasPorMedida: 150 } }, buscarAlimento(458))).toBe('1 copo americano · 150 ml')
  })

  it('a gaveta do Cobrir começa por quanto o plano tem', () => {
    expect(aberturaDoCobrir(linha(27.6, 'abaixo'))).toBe('O plano tem 28% da referência. ')
    expect(aberturaDoCobrir(undefined)).toBe('')
  })
})

describe('O botão dos nutrientes na meta (CA-1286)', () => {
  it('concorda com o número', () => {
    expect(rotuloDosNaMeta(1, false)).toBe('Ver o nutriente na meta')
    expect(rotuloDosNaMeta(1, true)).toBe('Esconder o nutriente na meta')
    expect(rotuloDosNaMeta(5, false)).toBe('Ver os 5 nutrientes na meta')
    expect(rotuloDosNaMeta(5, true)).toBe('Esconder os 5 nutrientes na meta')
  })
})

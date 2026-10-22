// A adequação diz de que é a porcentagem (spec ficha-unica, D-459, CA-1283).
import type { LinhaAdequacao } from '@/domain/adequacao.ts'
import { aberturaDoCobrir, pctDaReferencia, rotuloDosNaMeta, textoDaAdequacao } from './estiloAdequacao.ts'

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
  notaLimite: null,
  estado,
})

describe('A adequação em % da referência (CA-1283)', () => {
  it('abaixo, na meta e acima do limite, sempre "da referência"', () => {
    expect(textoDaAdequacao(linha(27.6, 'abaixo'))).toBe('28% da referência · abaixo da meta')
    expect(textoDaAdequacao(linha(104, 'adequado'))).toBe('104% da referência')
    expect(textoDaAdequacao(linha(230, 'acima-limite'))).toBe('230% da referência · acima do limite')
  })

  it('a vitamina A com 1% não parece quase na meta', () => {
    expect(textoDaAdequacao(linha(1, 'abaixo'))).toBe('1% da referência · abaixo da meta')
    expect(pctDaReferencia(linha(1, 'abaixo'))).toBe('1% da referência')
  })

  it('o arredondamento continua sem desmentir o estado (D-211)', () => {
    expect(pctDaReferencia(linha(89.6, 'abaixo'))).toBe('89% da referência')
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

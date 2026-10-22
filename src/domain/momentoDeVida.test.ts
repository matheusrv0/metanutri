// Gestação e lactação na ficha (spec ficha-unica, D-342 e D-343; CA-1039 a CA-1043, CB-343 a CB-345).
import {
  AMAMENTACOES,
  condicaoNaData,
  descricaoDoMomento,
  lerMomento,
  mesesEntre,
  momentoDaCondicao,
  semanasNaData,
  type MomentoDeVida,
  type MomentoGestante,
} from './momentoDeVida.ts'

const gestante = (semanas: number | null, semanasEm: string | null = '2026-10-21', pesoPreGestacionalKg: number | null = 60): MomentoGestante => ({
  tipo: 'gestante',
  semanas,
  semanasEm,
  pesoPreGestacionalKg,
})

describe('Ler o que está guardado (CA-1088)', () => {
  it('lê os três tipos e devolve nulo para o que não se lê', () => {
    expect(lerMomento({ tipo: 'nenhum' })).toEqual({ tipo: 'nenhum' })
    expect(lerMomento(gestante(24))).toEqual(gestante(24))
    expect(lerMomento({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'exclusiva' })).toEqual({
      tipo: 'lactante',
      dataDoParto: '2026-07-21',
      amamentacao: 'exclusiva',
    })
    for (const estragado of [null, undefined, 'gestante', 42, [], { tipo: 'outro' }]) expect(lerMomento(estragado)).toBeNull()
  })

  it('campo estragado dentro do tipo vira vazio, sem perder o tipo', () => {
    expect(lerMomento({ tipo: 'gestante', semanas: 'vinte', semanasEm: 'ontem', pesoPreGestacionalKg: -3 })).toEqual(gestante(null, null, null))
    expect(lerMomento({ tipo: 'lactante', dataDoParto: '21/07/2026', amamentacao: 'muito' })).toEqual({ tipo: 'lactante', dataDoParto: null, amamentacao: null })
  })
})

describe('Lactante é quem amamenta (D-455)', () => {
  it('CA-1276: a amamentação é "Só no peito" ou "Peito e outros alimentos"', () => {
    expect(AMAMENTACOES).toEqual([
      { valor: 'exclusiva', rotulo: 'Só no peito' },
      { valor: 'mista', rotulo: 'Peito e outros alimentos' },
    ])
  })

  it('CA-1276: "Lactante" com "Não amamenta", gravado antes, é lido como "Não"', () => {
    expect(lerMomento({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'nao-amamenta' })).toEqual({ tipo: 'nenhum' })
  })
})

describe('As semanas andam sozinhas (CA-1039)', () => {
  it('24 semanas em 21/10 são 28 em 18/11 e 24 no mesmo dia', () => {
    expect(semanasNaData(gestante(24), '2026-11-18')).toBe(28)
    expect(semanasNaData(gestante(24), '2026-10-21')).toBe(24)
    expect(semanasNaData(gestante(24), '2026-10-27')).toBe(24)
    expect(semanasNaData(gestante(24), '2026-10-28')).toBe(25)
  })

  it('antes da data informada, as semanas voltam', () => {
    expect(semanasNaData(gestante(24), '2026-09-23')).toBe(20)
  })

  it('sem semanas ou sem data, nulo', () => {
    expect(semanasNaData(gestante(null), '2026-10-21')).toBeNull()
    expect(semanasNaData(gestante(24, null), '2026-10-21')).toBeNull()
  })

  it('meses entre o parto e a data', () => {
    expect(mesesEntre('2026-07-21', '2026-10-21')).toBe(3)
    expect(mesesEntre('2026-07-21', '2026-10-20')).toBe(2)
    expect(mesesEntre('2026-10-22', '2026-10-21')).toBeNull()
  })
})

describe('A condição do plano na data da consulta (D-343)', () => {
  it('CA-1041: gestante com as semanas daquela data e o peso pré-gestacional', () => {
    expect(condicaoNaData(gestante(24), '2026-11-18')).toEqual({ tipo: 'gestante', semanasGestacao: 28, pesoPreGestacionalKg: 60 })
  })

  it('CA-1042: semanas abaixo de 1 ou acima de 42 não são gestação naquela data', () => {
    expect(condicaoNaData(gestante(4), '2026-09-01')).toEqual({ tipo: 'nenhuma' })
    expect(condicaoNaData(gestante(40), '2026-12-01')).toEqual({ tipo: 'nenhuma' })
  })

  it('CB-343: gestante sem semanas continua gestante, sem semanas', () => {
    expect(condicaoNaData(gestante(null, null), '2026-10-21')).toEqual({ tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: 60 })
  })

  it('CA-1043: lactante que amamenta tem os meses daquela data; quem não amamenta não é lactante', () => {
    const lactante = (amamentacao: 'exclusiva' | 'mista' | null): MomentoDeVida => ({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao })
    expect(condicaoNaData(lactante('exclusiva'), '2026-10-21')).toEqual({ tipo: 'lactante', mesesPosParto: 3 })
    expect(condicaoNaData(lactante('mista'), '2026-10-21')).toEqual({ tipo: 'lactante', mesesPosParto: 3, amamentacao: 'mista' })
    expect(condicaoNaData(lactante(null), '2026-10-21')).toEqual({ tipo: 'lactante', mesesPosParto: 3 })
    expect(condicaoNaData(lerMomento({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'nao-amamenta' }), '2026-10-21')).toEqual({ tipo: 'nenhuma' })
  })

  it('CB-344 e CB-345: sem data do parto, lactante sem meses; parto depois da consulta, não é lactante', () => {
    expect(condicaoNaData({ tipo: 'lactante', dataDoParto: null, amamentacao: 'exclusiva' }, '2026-10-21')).toEqual({ tipo: 'lactante', mesesPosParto: null })
    expect(condicaoNaData({ tipo: 'lactante', dataDoParto: '2026-11-01', amamentacao: 'exclusiva' }, '2026-10-21')).toEqual({ tipo: 'nenhuma' })
  })

  it('nenhum e não informado são nenhuma', () => {
    expect(condicaoNaData({ tipo: 'nenhum' }, '2026-10-21')).toEqual({ tipo: 'nenhuma' })
    expect(condicaoNaData(null, '2026-10-21')).toEqual({ tipo: 'nenhuma' })
  })
})

describe('Levar a condição do plano para a ficha (CA-1044)', () => {
  it('a gestação leva as semanas na data da consulta do plano', () => {
    expect(momentoDaCondicao({ tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 58 }, '2026-09-10')).toEqual(gestante(20, '2026-09-10', 58))
  })

  it('a lactação leva a data do parto contada para trás', () => {
    expect(momentoDaCondicao({ tipo: 'lactante', mesesPosParto: 3 }, '2026-10-21')).toEqual({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: null })
    expect(momentoDaCondicao({ tipo: 'lactante', mesesPosParto: null }, '2026-10-21')).toEqual({ tipo: 'lactante', dataDoParto: null, amamentacao: null })
    expect(momentoDaCondicao({ tipo: 'nenhuma' }, '2026-10-21')).toEqual({ tipo: 'nenhum' })
  })
})

describe('O resumo do momento', () => {
  it('diz as semanas e os meses de hoje', () => {
    expect(descricaoDoMomento(gestante(24), '2026-11-18')).toBe('Gestante, 28 semanas')
    expect(descricaoDoMomento(gestante(null), '2026-11-18')).toBe('Gestante')
    expect(descricaoDoMomento({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'exclusiva' }, '2026-10-21')).toBe('Lactante, 3 meses após o parto')
    expect(descricaoDoMomento({ tipo: 'lactante', dataDoParto: '2026-09-21', amamentacao: 'exclusiva' }, '2026-10-21')).toBe('Lactante, 1 mês após o parto')
    expect(descricaoDoMomento({ tipo: 'nenhum' }, '2026-10-21')).toBeNull()
    expect(descricaoDoMomento(null, '2026-10-21')).toBeNull()
  })
})

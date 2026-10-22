import { criarCasoVazio } from './caso.ts'
import { camposDaPessoa, mostraDobras, mostraNivelDeAtividade, temDadoDeComposicao } from './camposVisiveis.ts'
import type { Caso } from './tipos.ts'

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, ...p })

describe('campos da pessoa (CA-331, CB-73, CB-74; spec ficha-unica, R1, R8, R9)', () => {
  it('adulta no atendimento completo: condição e cintura, sem meses nem panturrilha', () => {
    expect(camposDaPessoa(caso())).toEqual({ condicao: true, mesesAlemDosAnos: false, cintura: true, panturrilha: false })
  })

  it('R1: gestação ou lactação só para o sexo feminino de 14 a 50 anos; com condição marcada, aparece (CB-74)', () => {
    expect(camposDaPessoa(caso({ sexo: 'M' })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ sexo: 'M', condicao: { tipo: 'lactante', mesesPosParto: null } })).condicao).toBe(true)
    expect(camposDaPessoa(caso({ sexo: null })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 6 })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 62 })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 14 })).condicao).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 50 })).condicao).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: null })).condicao).toBe(false)
  })

  it('R9: meses só abaixo de 19 anos (o adulto não tem o campo, nem com meses guardados)', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 18 })).mesesAlemDosAnos).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 19 })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: null })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 30, idadeMesesAdicionais: 6 })).mesesAlemDosAnos).toBe(false)
  })

  it('R8: cintura de 20 anos em diante e fora da gestação, ou com valor', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 19 })).cintura).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 20 })).cintura).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 6 })).cintura).toBe(false)
    expect(camposDaPessoa(caso({ condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: null } })).cintura).toBe(false)
    expect(camposDaPessoa(caso({ condicao: { tipo: 'lactante', mesesPosParto: 3 } })).cintura).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 6, circunferenciaCinturaCm: 55 })).cintura).toBe(true)
  })

  it('panturrilha só a partir de 60 anos, ou com valor (CB-73), e nunca no modo rápido', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 60 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 45, circunferenciaPanturrilhaCm: 33 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 72, modo: 'rapido' }))).toEqual({ condicao: false, mesesAlemDosAnos: false, cintura: false, panturrilha: false })
  })
})

describe('temDadoDeComposicao (CA-332)', () => {
  it('só com alguma dobra, bioimpedância ou aparelho preenchido', () => {
    const vazio = criarCasoVazio('c1')
    expect(temDadoDeComposicao(vazio)).toBe(false)
    expect(temDadoDeComposicao({ ...vazio, composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: 12 } } })).toBe(true)
    expect(temDadoDeComposicao({ ...vazio, composicao: { ...vazio.composicao, bioimpedancia: { ...vazio.composicao.bioimpedancia, aparelho: 'InBody' } } })).toBe(true)
  })
})

describe('correção B: nível de atividade e dobras pela idade (spec ficha-unica, D-458)', () => {
  it('CA-1279: o nível de atividade aparece de 3 anos em diante; sem a idade, aparece', () => {
    expect(mostraNivelDeAtividade(caso({ idadeAnos: 2 }))).toBe(false)
    expect(mostraNivelDeAtividade(caso({ idadeAnos: 3 }))).toBe(true)
    expect(mostraNivelDeAtividade(caso({ idadeAnos: null }))).toBe(true)
  })

  it('CA-1281: as dobras de 18 anos em diante e fora da gestação; com dobra preenchida, ficam', () => {
    expect(mostraDobras(caso({ idadeAnos: 35 }))).toBe(true)
    expect(mostraDobras(caso({ idadeAnos: 68 }))).toBe(true)
    expect(mostraDobras(caso({ idadeAnos: 17 }))).toBe(false)
    expect(mostraDobras(caso({ idadeAnos: 6 }))).toBe(false)
    expect(mostraDobras(caso({ idadeAnos: 28, condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 } }))).toBe(false)
    expect(mostraDobras(caso({ idadeAnos: null }))).toBe(true)
    const comDobra = caso({ idadeAnos: 6 })
    expect(mostraDobras({ ...comDobra, composicao: { ...comDobra.composicao, dobras: { ...comDobra.composicao.dobras, tricipital: 9 } } })).toBe(true)
  })
})

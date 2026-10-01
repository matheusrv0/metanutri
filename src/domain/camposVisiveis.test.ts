import { criarCasoVazio } from './caso.ts'
import { camposDaPessoa, temDadoDeComposicao } from './camposVisiveis.ts'
import type { Caso } from './tipos.ts'

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), sexo: 'F', idadeAnos: 28, ...p })

describe('campos da pessoa (CA-331, CB-73, CB-74)', () => {
  it('adulta no atendimento completo: condição e cintura, sem meses nem panturrilha', () => {
    expect(camposDaPessoa(caso())).toEqual({ condicao: true, mesesAlemDosAnos: false, cintura: true, panturrilha: false })
  })

  it('masculino não vê condição; com condição marcada, vê (CB-74)', () => {
    expect(camposDaPessoa(caso({ sexo: 'M' })).condicao).toBe(false)
    expect(camposDaPessoa(caso({ sexo: 'M', condicao: { tipo: 'lactante', mesesPosParto: null } })).condicao).toBe(true)
    expect(camposDaPessoa(caso({ sexo: null })).condicao).toBe(true)
  })

  it('meses só abaixo de 19 anos, ou com valor (CB-73)', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 18 })).mesesAlemDosAnos).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 19 })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: null })).mesesAlemDosAnos).toBe(false)
    expect(camposDaPessoa(caso({ idadeAnos: 30, idadeMesesAdicionais: 6 })).mesesAlemDosAnos).toBe(true)
  })

  it('panturrilha só a partir de 60 anos, ou com valor (CB-73), e nunca no modo rápido', () => {
    expect(camposDaPessoa(caso({ idadeAnos: 60 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 45, circunferenciaPanturrilhaCm: 33 })).panturrilha).toBe(true)
    expect(camposDaPessoa(caso({ idadeAnos: 72, modo: 'rapido' }))).toEqual({ condicao: true, mesesAlemDosAnos: false, cintura: false, panturrilha: false })
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

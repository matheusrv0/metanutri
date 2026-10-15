import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import { assinaturaDoDocumento, dataDeHoje, ehProposta, FRASE_PROPOSTA, linhaFinaDoDocumento, propostaNaDieta, tituloDoDocumento } from './documentoDoPaciente.ts'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: ' Júlia Martins ', responsavelTecnico: 'Carla Mendes' }
const ADMIN: AssinaturaDoPlano = { situacao: null, linhaNutricionista: null, origem: 'conta', nome: 'Dono', responsavelTecnico: '' }

describe('quem assina a folha do paciente (D-167)', () => {
  it('CA-576: nutricionista assina com nome e CRN', () => {
    expect(assinaturaDoDocumento(ANA)).toEqual({ tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })
    expect(ehProposta(ANA)).toBe(false)
  })

  it('CA-582: estudante assina como estagiária, com a preceptora de Quem assina', () => {
    expect(assinaturaDoDocumento(JULIA)).toEqual({ tipo: 'estagio', estagiario: 'Júlia Martins', preceptor: 'Carla Mendes' })
    expect(ehProposta(JULIA)).toBe(true)
  })

  it('CA-583: nutricionista sem nome ou CRN sai com a linha vazia, nunca "null"; sem situação, linha "Assinatura" e sem proposta', () => {
    expect(assinaturaDoDocumento({ ...ANA, linhaNutricionista: null })).toEqual({ tipo: 'nutricionista', linha: '' })
    expect(assinaturaDoDocumento(ADMIN)).toEqual({ tipo: 'vazia' })
    expect(assinaturaDoDocumento(null)).toEqual({ tipo: 'vazia' })
    expect(ehProposta(ADMIN)).toBe(false)
    expect(ehProposta(null)).toBe(false)
  })

  it('CA-576, CA-580 e CA-582: os títulos das folhas', () => {
    expect(tituloDoDocumento('suplementos', false)).toBe('Suplementação')
    expect(tituloDoDocumento('suplementos', true)).toBe('Proposta de suplementação')
    expect(tituloDoDocumento('exames', false)).toBe('Solicitação de exames')
    expect(tituloDoDocumento('exames', true)).toBe('Proposta de solicitação de exames')
    expect(FRASE_PROPOSTA).toBe('Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).')
  })

  it('CA-584: a dieta leva a frase em plano de estudante ou em plano com estagiário ou preceptor', () => {
    const caso = criarCasoVazio('c1')
    expect(propostaNaDieta(JULIA, caso)).toBe(true)
    expect(propostaNaDieta(ANA, caso)).toBe(false)
    expect(propostaNaDieta(ANA, { ...caso, preceptor: 'Carla' })).toBe(true)
    expect(propostaNaDieta(null, caso)).toBe(false)
    expect(propostaNaDieta(null, { ...caso, estagiario: 'Júlia' })).toBe(true)
  })
})

describe('linha fina das páginas seguintes (CA-576, CA-580)', () => {
  it('traz o título, o paciente e quem assina, como a dieta', () => {
    expect(linhaFinaDoDocumento('Suplementação', 'Maria Silva', { tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })).toEqual({
      esquerda: 'Suplementação · Maria Silva',
      direita: 'Ana Souza · CRN-6 12345',
    })
    expect(linhaFinaDoDocumento('Proposta de suplementação', '  ', { tipo: 'estagio', estagiario: 'Júlia', preceptor: 'Carla' })).toEqual({
      esquerda: 'Proposta de suplementação · Paciente sem nome',
      direita: 'Júlia · Carla',
    })
    expect(linhaFinaDoDocumento('Solicitação de exames', 'Ana', { tipo: 'vazia' }).direita).toBe('')
  })
})

describe('data do dia', () => {
  it('é a data do relógio de quem imprime, não a de Greenwich', () => {
    expect(dataDeHoje(new Date(2026, 9, 14, 23, 30))).toBe('2026-10-14')
    expect(dataDeHoje(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02')
  })
})

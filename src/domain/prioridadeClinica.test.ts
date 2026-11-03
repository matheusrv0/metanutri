import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { nivelDePrioridade, prioridadeDoCaso, type EntradaDaPrioridade } from './prioridadeClinica.ts'
import type { Caso } from './tipos.ts'

const entrada = (e: Partial<EntradaDaPrioridade>): EntradaDaPrioridade => ({ sexo: 'M', idadeAnos: 40, imc: 22, cinturaCm: null, estaturaCm: null, ...e })

describe('nível de prioridade (spec antropometria-completa, CA-2065)', () => {
  // Os 8 casos da pesquisa (4.4, R4.4a): entradas montadas pela pesquisa; o nível sai da regra.
  it.each([
    ['mulher IMC 23, cintura 82, 1,64 m', { sexo: 'F', imc: 23, cinturaCm: 82, estaturaCm: 164 }, 1],
    ['homem IMC 27, cintura 98, 1,80 m', { sexo: 'M', imc: 27, cinturaCm: 98, estaturaCm: 180 }, 1],
    ['homem IMC 28, cintura 104, 1,75 m', { sexo: 'M', imc: 28, cinturaCm: 104, estaturaCm: 175 }, 2],
    ['mulher IMC 32, cintura 95, 1,60 m', { sexo: 'F', imc: 32, cinturaCm: 95, estaturaCm: 160 }, 3],
    ['mulher IMC 24, cintura 100, 1,65 m', { sexo: 'F', imc: 24, cinturaCm: 100, estaturaCm: 165 }, 2],
    ['homem IMC 41 sem cintura', { sexo: 'M', imc: 41 }, 4],
    ['homem IMC 22, cintura 85, 1,78 m', { sexo: 'M', imc: 22, cinturaCm: 85, estaturaCm: 178 }, 0],
    ['mulher IMC 17,8', { sexo: 'F', imc: 17.8 }, 0],
  ] as const)('CA-2065: %s → nível %i', (_, e, nivel) => {
    expect(nivelDePrioridade(entrada(e)).nivel).toBe(nivel)
  })

  it('CA-2065: os gatilhos que dispararam vêm na lista, com a fonte', () => {
    const p = nivelDePrioridade(entrada({ sexo: 'F', imc: 23, cinturaCm: 82, estaturaCm: 164 }))
    expect(p.gatilhos.map((g) => [g.nivel, g.fonte.curta])).toEqual([
      [1, FONTES.abeso2016.curta],
      [1, FONTES.ross2020.curta],
    ])
    expect(p.rotulo).toBe('Aumentado')
    const quatro = nivelDePrioridade(entrada({ imc: 41 }))
    expect(quatro.rotulo).toBe('Extremamente alto')
    expect(quatro.avisos).toContain('Cintura não medida: a prioridade pode estar subestimada.')
  })

  it('CA-2065: IMC 17,8 liga a sobreposição de risco nutricional (GLIM); aos 70 anos, o corte é 22', () => {
    expect(nivelDePrioridade(entrada({ sexo: 'F', imc: 17.8 })).riscoNutricional).toBe(true)
    expect(nivelDePrioridade(entrada({ imc: 21, idadeAnos: 70 })).riscoNutricional).toBe(true)
    expect(nivelDePrioridade(entrada({ imc: 21, idadeAnos: 69 })).riscoNutricional).toBe(false)
  })

  it('o texto fala em risco pelas medidas, nunca em risco do paciente (R4.4e)', () => {
    expect(nivelDePrioridade(entrada({})).avisos.join(' ')).toMatch(/Risco pelas medidas antropométricas/)
  })

  it('D-1004: no menor perímetro, a cintura não entra; na crista ilíaca, entra na matriz mas não na RCE', () => {
    const menor = nivelDePrioridade(entrada({ sexo: 'F', imc: 28, cinturaCm: 100, estaturaCm: 160, pontoDaCintura: 'menor-perimetro' }))
    expect(menor.nivel).toBe(1)
    expect(menor.avisos.join(' ')).toMatch(/menor perímetro/)
    const crista = nivelDePrioridade(entrada({ sexo: 'F', imc: 28, cinturaCm: 100, estaturaCm: 160, pontoDaCintura: 'crista-iliaca' }))
    expect(crista.nivel).toBe(2)
    expect(crista.gatilhos.some((g) => g.fonte.curta === FONTES.nice2025.curta)).toBe(false)
  })
})

describe('prioridade do caso (spec antropometria-completa, CA-2066)', () => {
  const vazio = criarCasoVazio('c')
  // IMC 32 em 1,60 m.
  const caso = (p: Partial<Caso>): Caso => ({ ...vazio, sexo: 'F', idadeAnos: 40, pesoKg: 32 * 1.6 ** 2, estaturaCm: 160, circunferenciaCinturaCm: 95, ...p })

  it('CA-2065: o caso de IMC 32 e cintura 95 dá nível 3', () => {
    expect(prioridadeDoCaso(caso({}))?.nivel).toBe(3)
  })

  it('CA-2066: menor de 18 anos ou gestante → não vem', () => {
    expect(prioridadeDoCaso(caso({ idadeAnos: 17 }))).toBeNull()
    expect(prioridadeDoCaso(caso({ condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))).toBeNull()
  })
})

describe('idoso (spec antropometria-completa, revisão, CA-2071 e CA-2072)', () => {
  it('CA-2071: no idoso, IMC de 25 a < 27 não dispara gatilho de IMC; de 27 a 29,99, sim', () => {
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 25.97 })).nivel).toBe(0)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 26.99 })).nivel).toBe(0)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 27 })).nivel).toBe(1)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 28, cinturaCm: 95, estaturaCm: 158, pontoDaCintura: 'crista-iliaca' })).nivel).toBe(2)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 59, imc: 26 })).nivel).toBe(1)
  })

  it('CA-2071: o aviso do idoso lembra a faixa de referência de > 22 a < 27', () => {
    expect(nivelDePrioridade(entrada({ idadeAnos: 65, imc: 24 })).avisos.join(' ')).toMatch(/> 22 e < 27/)
    expect(nivelDePrioridade(entrada({ idadeAnos: 45, imc: 24 })).avisos.join(' ')).not.toMatch(/> 22 e < 27/)
  })

  it('CA-2072: panturrilha abaixo do corte da D-1029 liga a sobreposição de risco nutricional no idoso', () => {
    expect(nivelDePrioridade(entrada({ sexo: 'M', idadeAnos: 70, imc: 24, panturrilhaCm: 33.9 })).riscoNutricional).toBe(true)
    expect(nivelDePrioridade(entrada({ sexo: 'M', idadeAnos: 70, imc: 24, panturrilhaCm: 34 })).riscoNutricional).toBe(false)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 24, panturrilhaCm: 32.9 })).riscoNutricional).toBe(true)
    expect(nivelDePrioridade(entrada({ sexo: 'F', idadeAnos: 70, imc: 24, panturrilhaCm: 33 })).riscoNutricional).toBe(false)
    expect(nivelDePrioridade(entrada({ sexo: 'M', idadeAnos: 59, imc: 24, panturrilhaCm: 30 })).riscoNutricional).toBe(false)
  })

  it('CA-2072: no caso, a panturrilha vem da direita e, sem ela, da esquerda', () => {
    const vazio = criarCasoVazio('i')
    const idoso: Caso = { ...vazio, sexo: 'M', idadeAnos: 72, pesoKg: 70, estaturaCm: 170, circunferenciaPanturrilhaCm: null, medidasCorporais: { ...vazio.medidasCorporais, panturrilhaEsquerdaCm: 31 } }
    expect(prioridadeDoCaso(idoso)?.riscoNutricional).toBe(true)
  })
})

describe('proposta do app (spec antropometria-completa, revisão, CA-2083)', () => {
  it('CA-2083: a escala é marcada como proposta do app, e cada gatilho mantém a sua fonte', () => {
    const p = nivelDePrioridade(entrada({ sexo: 'M', imc: 28, cinturaCm: 104, estaturaCm: 175 }))
    expect(p.evidencia).toBe('proposta-do-app')
    expect(p.avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\): a escala de 0 a 4 é uma classificação proposta pelo app/)
    expect(p.gatilhos.every((g) => g.fonte.citacao.length > 20)).toBe(true)
  })
})

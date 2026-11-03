import { criarCasoVazio } from './caso.ts'
import {
  chumlea1985Altura,
  chumlea1988Peso,
  estimativasDeAltura,
  estimativasDePeso,
  rabitoAlturaVII,
  rabitoPesoIII,
  rabitoPesoIV,
  rabitoPesoV,
} from './estimativas.ts'
import { FONTES } from './fontesAntropometria.ts'
import type { Caso, MedidasCorporais } from './tipos.ts'

const caso = (p: Partial<Caso> = {}, medidas: Partial<MedidasCorporais> = {}, subescapular: number | null = null): Caso => {
  const vazio = criarCasoVazio('c')
  return {
    ...vazio,
    sexo: 'M',
    idadeAnos: 70,
    ...p,
    medidasCorporais: { ...vazio.medidasCorporais, ...medidas },
    composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, subescapular } },
  }
}

describe('Chumlea (spec antropometria-completa, CA-2051 e CA-2052)', () => {
  // Contas nossas com os coeficientes [V2] da pesquisa (3.16); a pesquisa não traz caso numérico destas equações.
  it('CA-2051: altura pela altura do joelho, 1985', () => {
    expect(chumlea1985Altura('M', 70, 50)).toBeCloseTo(162.39, 10)
    expect(chumlea1985Altura('F', 70, 47)).toBeCloseTo(154.09, 10)
  })

  it('CA-2051: no caso, com o erro de ± 6 cm, e o aviso fora de 60 a 90 anos', () => {
    const [primeira] = estimativasDeAltura(caso({}, { alturaDoJoelhoCm: 50 }))
    expect(primeira?.equacao).toBe('chumlea-1985')
    expect(primeira?.valor).toBeCloseTo(162.39, 10)
    expect(primeira?.erro).toEqual({ valor: 6, unidade: 'cm', descricao: 'limites de 90% para uma pessoa (±)' })
    expect(primeira?.fonte.curta).toBe(FONTES.chumlea1985.curta)
    expect(primeira?.avisos.join(' ')).toMatch(/deitado/)
    expect(estimativasDeAltura(caso({ idadeAnos: 92 }, { alturaDoJoelhoCm: 50 }))[0]?.avisos.join(' ')).toMatch(/60 a 90 anos/)
  })

  it('CA-2052: peso do idoso, 1988', () => {
    expect(chumlea1988Peso('M', 28, 33, 15, 52)).toBeCloseTo(64.96, 10)
    expect(chumlea1988Peso('F', 27, 32, 18, 48)).toBeCloseTo(53.71, 10)
    const [primeira] = estimativasDePeso(caso({}, { bracoRelaxadoDireitoCm: 28, alturaDoJoelhoCm: 52 }, 15))
    // A panturrilha vem do campo de hoje (a direita); sem ela, a estimativa diz que falta.
    expect(primeira?.equacao).toBe('chumlea-1988')
    expect(primeira?.valor).toBeNull()
    expect(primeira?.falta).toEqual([{ campo: 'circunferenciaPanturrilhaCm', nome: 'a panturrilha' }])
    const comPanturrilha = estimativasDePeso(caso({ circunferenciaPanturrilhaCm: 33 }, { bracoRelaxadoDireitoCm: 28, alturaDoJoelhoCm: 52 }, 15))[0]
    expect(comPanturrilha?.valor).toBeCloseTo(64.96, 10)
    expect(comPanturrilha?.erro).toBeNull()
  })
})

describe('Rabito 2006 (spec antropometria-completa, CA-2053 e CA-2054)', () => {
  it('CA-2053: altura VII pela semienvergadura (S = 1 no homem, 2 na mulher)', () => {
    expect(rabitoAlturaVII('M', 40, 85)).toBeCloseTo(167.431, 3)
    expect(rabitoAlturaVII('F', 40, 78)).toBeCloseTo(155.143, 3)
  })

  it('CA-2054: pesos III, IV e V (com −32,9241, não "±")', () => {
    expect(rabitoPesoIII(30, 95, 36, 20)).toBeCloseTo(73.583, 3)
    expect(rabitoPesoIV(30, 95, 36)).toBeCloseTo(73.192, 3)
    expect(rabitoPesoV('M', 30, 95, 36)).toBeCloseTo(74.31, 3)
    expect(rabitoPesoV('F', 30, 95, 36)).toBeCloseTo(69.441, 3)
  })
})

describe('qual estimativa vem primeiro (spec antropometria-completa, CA-2055)', () => {
  const adulto = caso({ idadeAnos: 40, circunferenciaPanturrilhaCm: 36 }, { semienvergaduraCm: 85, bracoRelaxadoDireitoCm: 30, abdomenCm: 95 }, 20)

  it('CA-2055: adulto, Rabito; idoso, Chumlea primeiro', () => {
    expect(estimativasDeAltura(adulto).map((e) => e.equacao)).toEqual(['rabito-vii'])
    expect(estimativasDePeso(adulto).map((e) => e.equacao)).toEqual(['rabito-v', 'rabito-iv', 'rabito-iii'])
    expect(estimativasDeAltura(caso()).map((e) => e.equacao)).toEqual(['chumlea-1985', 'rabito-vii'])
    expect(estimativasDePeso(caso()).map((e) => e.equacao)).toEqual(['chumlea-1988', 'rabito-v', 'rabito-iv', 'rabito-iii'])
  })

  it('CA-2055: cada uma traz a fonte e o erro; as que não têm dado dizem o que falta', () => {
    const [v, iv, iii] = estimativasDePeso(adulto)
    expect(v?.valor).toBeCloseTo(74.31, 3)
    expect(v?.erro).toEqual({ valor: 6, unidade: '%', descricao: 'erro médio em hospitalizados brasileiros' })
    expect(iv?.erro?.valor).toBe(6.7)
    expect(iii?.erro?.valor).toBe(7)
    expect(v?.fonte.curta).toBe(FONTES.rabito2006.curta)
    expect(estimativasDeAltura(caso({ idadeAnos: 40 }))[0]?.falta).toEqual([{ campo: 'medidasCorporais.semienvergaduraCm', nome: 'a semienvergadura' }])
  })

  it('abaixo de 18 anos e na gestação, nenhuma estimativa', () => {
    expect(estimativasDeAltura(caso({ idadeAnos: 15 }))).toEqual([])
    expect(estimativasDePeso(caso({ sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))).toEqual([])
  })
})

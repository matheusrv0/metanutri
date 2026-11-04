import { avaliarAntropometria } from './antropometria.ts'
import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { faseDaVida, linhaCintura, linhaImc, linhaPanturrilha, linhaPescoco, linhaRce, linhaRcq } from './indicadoresCorporais.ts'
import type { LinhaDoResultado } from './linhaDoResultado.ts'
import type { Caso, MedidasCorporais, PontoDaCintura, Sexo } from './tipos.ts'

const caso = (p: Partial<Caso> = {}, medidas: Partial<MedidasCorporais> = {}): Caso => {
  const vazio = criarCasoVazio('c')
  return { ...vazio, sexo: 'M', idadeAnos: 35, pesoKg: 80, estaturaCm: 178, ...p, medidasCorporais: { ...vazio.medidasCorporais, ...medidas } }
}
/** Peso que dá o IMC pedido na estatura do caso. */
const comImc = (imc: number, estaturaCm = 178) => ({ pesoKg: imc * (estaturaCm / 100) ** 2, estaturaCm })
const rotulo = (l: LinhaDoResultado | null) => l?.situacao?.rotulo ?? null

describe('fase da vida', () => {
  it('gestante, criança e adolescente (até 19), adulto (20 a 59) e idoso (60+)', () => {
    expect(faseDaVida(caso({ idadeAnos: 19 }))).toBe('crianca-adolescente')
    expect(faseDaVida(caso({ idadeAnos: 20 }))).toBe('adulto')
    expect(faseDaVida(caso({ idadeAnos: 60 }))).toBe('idoso')
    expect(faseDaVida(caso({ sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))).toBe('gestante')
    expect(faseDaVida(caso({ idadeAnos: null }))).toBeNull()
  })
})

describe('IMC por fase da vida (spec antropometria-completa, CA-2031 a CA-2033)', () => {
  it('CA-2031: adulto, SISVAN com os graus da OMS, decidido nas 2 casas', () => {
    const l = linhaImc(caso(comImc(25.52)))
    expect(l?.valor).toBeCloseTo(25.52, 6)
    expect(l?.casas).toBe(2)
    expect(l?.unidade).toBe('kg/m²')
    expect(l?.recomendacao?.texto).toBe('18,50 – 24,99 kg/m²')
    expect(l?.situacao).toEqual({ rotulo: 'Sobrepeso', nivel: 'atencao' })
    expect(l?.fonte?.curta).toBe(FONTES.sisvan2011.curta)
    const tabela: readonly [number, string][] = [
      [18.49, 'Baixo peso'],
      [18.5, 'Eutrofia'],
      [24.994, 'Eutrofia'],
      [24.996, 'Sobrepeso'],
      [30, 'Obesidade grau I'],
      [35, 'Obesidade grau II'],
      [40, 'Obesidade grau III'],
    ]
    for (const [imc, esperado] of tabela) expect.soft(rotulo(linhaImc(caso(comImc(imc)))), String(imc)).toBe(esperado)
  })

  it('CA-2032: idoso pelo SISVAN (≤ 22 baixo peso; ≥ 27 sobrepeso), com a nota da Caderneta', () => {
    const l = linhaImc(caso({ idadeAnos: 70, ...comImc(24) }))
    expect(l?.recomendacao?.texto).toBe('> 22,0 e < 27,0 kg/m²')
    expect(l?.fonte?.curta).toBe(FONTES.nsi1994.curta)
    expect(l?.avisos.join(' ')).toMatch(/Caderneta/)
    const tabela: readonly [number, string][] = [
      [22, 'Baixo peso'],
      [22.01, 'Eutrofia'],
      [26.99, 'Eutrofia'],
      [27, 'Sobrepeso'],
    ]
    for (const [imc, esperado] of tabela) expect.soft(rotulo(linhaImc(caso({ idadeAnos: 70, ...comImc(imc) }))), String(imc)).toBe(esperado)
  })

  it('CA-2033: criança e adolescente pelo escore-z de hoje, com o IMC no detalhe', () => {
    const menino: Caso = caso({ idadeAnos: 10, pesoKg: 32, estaturaCm: 138 })
    const hoje = avaliarAntropometria(menino).imcIdade
    const l = linhaImc(menino)
    expect(l?.unidade).toBe('escore-z')
    expect(l?.valor).toBe(hoje?.z)
    expect(l?.situacao?.rotulo).toBe(hoje?.classe)
    expect(l?.recomendacao?.texto).toBe('escore-z de −2 a +1')
    expect(l?.detalhes).toContainEqual({ tipo: 'numero', rotulo: 'IMC', valor: hoje?.valorImc, unidade: 'kg/m²', casas: 2 })
  })

  it('CA-2033: gestante, o IMC pré-gestacional e o ganho de peso (Kac 2021); sem o peso pré-gestacional, diz que falta', () => {
    const gestante = caso({ sexo: 'F', idadeAnos: 30, pesoKg: 66, estaturaCm: 160, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } })
    const l = linhaImc(gestante)
    expect(l?.nome).toBe('IMC pré-gestacional')
    expect(l?.valor).toBeCloseTo(60 / 1.6 ** 2, 6)
    expect(l?.situacao).toEqual({ rotulo: 'Eutrofia', nivel: 'adequado' })
    expect(l?.fonte?.curta).toBe(FONTES.kac2021.curta)
    expect(l?.detalhes).toContainEqual({ tipo: 'numero', rotulo: 'Ganho de peso até agora', valor: 6, unidade: 'kg', casas: 1 })
    const sem = linhaImc({ ...gestante, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: null } })
    expect(sem?.valor).toBeNull()
    expect(sem?.falta).toEqual([{ campo: 'condicao.pesoPreGestacionalKg', nome: 'o peso pré-gestacional' }])
  })

  it('CB-1001: sem estatura, sem valor e diz o que falta; sem idade, valor sem situação', () => {
    expect(linhaImc(caso({ estaturaCm: null }))?.falta).toEqual([{ campo: 'estaturaCm', nome: 'a estatura' }])
    const semIdade = linhaImc(caso({ idadeAnos: null }))
    expect(semIdade?.valor).not.toBeNull()
    expect(semIdade?.situacao).toBeNull()
    expect(semIdade?.falta).toEqual([{ campo: 'idadeAnos', nome: 'a idade' }])
  })
})

describe('cintura (spec antropometria-completa, CA-2036)', () => {
  const cintura = (cm: number, sexo: Sexo = 'M', ponto: PontoDaCintura | null = 'ponto-medio') =>
    linhaCintura(caso({ sexo, circunferenciaCinturaCm: cm }, { pontoDaCintura: ponto }))

  it('CA-2036: OMS em dois níveis, com ≥, no ponto médio', () => {
    expect(rotulo(cintura(93.9))).toBe('Sem risco aumentado')
    expect(cintura(94)?.situacao).toEqual({ rotulo: 'Risco aumentado', nivel: 'atencao' })
    expect(cintura(102)?.situacao).toEqual({ rotulo: 'Risco substancialmente aumentado', nivel: 'alterado' })
    expect(rotulo(cintura(79.9, 'F'))).toBe('Sem risco aumentado')
    expect(rotulo(cintura(80, 'F'))).toBe('Risco aumentado')
    expect(rotulo(cintura(88, 'F'))).toBe('Risco substancialmente aumentado')
    expect(cintura(90)?.recomendacao?.texto).toBe('Abaixo de 94 cm')
    expect(cintura(70, 'F')?.recomendacao?.texto).toBe('Abaixo de 80 cm')
    expect(cintura(90)?.fonte?.curta).toBe(FONTES.cinturaOms.curta)
    expect(cintura(90)?.avisos).toEqual([])
  })

  it('CA-2036 e D-1004: sem ponto registrado, a OMS com o aviso', () => {
    const l = cintura(95, 'M', null)
    expect(rotulo(l)).toBe('Risco aumentado')
    expect(l?.avisos.join(' ')).toMatch(/não foi registrado.*ponto médio/)
  })

  it('CA-2036: na crista ilíaca, o corte do NIH (> 102 / > 88)', () => {
    expect(rotulo(cintura(102, 'M', 'crista-iliaca'))).toBe('Sem risco aumentado')
    expect(cintura(102.1, 'M', 'crista-iliaca')?.situacao).toEqual({ rotulo: 'Risco aumentado', nivel: 'alterado' })
    expect(rotulo(cintura(88, 'F', 'crista-iliaca'))).toBe('Sem risco aumentado')
    expect(rotulo(cintura(88.1, 'F', 'crista-iliaca'))).toBe('Risco aumentado')
    expect(cintura(100, 'M', 'crista-iliaca')?.fonte?.curta).toBe(FONTES.nhlbi1998.curta)
  })

  it('CA-2036 e CB-1008: no menor perímetro ou num ponto desconhecido, valor sem situação, com aviso', () => {
    const menor = cintura(95, 'M', 'menor-perimetro')
    expect(menor?.valor).toBe(95)
    expect(menor?.situacao).toBeNull()
    expect(menor?.avisos.length).toBeGreaterThan(0)
    const futuro = cintura(95, 'M', 'umbigo' as PontoDaCintura)
    expect(futuro?.situacao).toBeNull()
  })

  it('CB-1002 e CB-1003: não vem na gestação nem abaixo de 20 anos; sem a cintura, diz que falta', () => {
    expect(linhaCintura(caso({ sexo: 'F', idadeAnos: 30, circunferenciaCinturaCm: 90, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))).toBeNull()
    expect(linhaCintura(caso({ idadeAnos: 19, circunferenciaCinturaCm: 90 }))).toBeNull()
    expect(linhaCintura(caso())?.falta).toEqual([{ campo: 'circunferenciaCinturaCm', nome: 'a cintura' }])
  })
})

describe('RCQ (spec antropometria-completa, CA-2037)', () => {
  const rcq = (valor: number, sexo: Sexo = 'M', idadeAnos = 25, referencia: 'oms' | 'bray-gray' = 'oms') =>
    linhaRcq(caso({ sexo, idadeAnos, circunferenciaCinturaCm: valor * 100 }, { quadrilCm: 100, pontoDaCintura: 'ponto-medio' }), referencia)

  it('CA-2037: OMS (≥ 0,90 / ≥ 0,85), 2 casas', () => {
    expect(rcq(0.89)?.situacao).toEqual({ rotulo: 'Sem risco aumentado', nivel: 'adequado' })
    expect(rcq(0.8999)?.situacao).toEqual({ rotulo: 'Risco substancialmente aumentado', nivel: 'alterado' })
    expect(rotulo(rcq(0.85, 'F'))).toBe('Risco substancialmente aumentado')
    expect(rotulo(rcq(0.84, 'F'))).toBe('Sem risco aumentado')
    expect(rcq(0.8)?.casas).toBe(2)
    expect(rcq(0.8)?.recomendacao?.texto).toBe('Abaixo de 0,90')
    expect(rcq(0.8)?.fonte?.curta).toBe(FONTES.who2011.curta)
  })

  it('CA-2037: Bray & Gray, homem de 20 a 29 anos (a régua do "Abaixo de 0,83" do Dietbox)', () => {
    const tabela: readonly [number, string][] = [
      [0.82, 'Risco baixo'],
      [0.83, 'Risco moderado'],
      [0.88, 'Risco moderado'],
      [0.89, 'Risco alto'],
      [0.91, 'Risco alto'],
      [0.94, 'Risco alto'],
      [0.95, 'Risco muito alto'],
    ]
    for (const [v, esperado] of tabela) expect.soft(rotulo(rcq(v, 'M', 25, 'bray-gray')), String(v)).toBe(esperado)
    const l = rcq(0.91, 'M', 25, 'bray-gray')
    expect(l?.recomendacao?.texto).toBe('Abaixo de 0,83')
    expect(l?.fonte?.curta).toBe(FONTES.brayGray1988.curta)
  })

  it('CA-2037: Bray & Gray por idade e sexo (mulher de 60 a 69: < 0,76 baixo; 0,84–0,90 alto)', () => {
    expect(rotulo(rcq(0.75, 'F', 65, 'bray-gray'))).toBe('Risco baixo')
    expect(rotulo(rcq(0.83, 'F', 65, 'bray-gray'))).toBe('Risco moderado')
    expect(rotulo(rcq(0.9, 'F', 65, 'bray-gray'))).toBe('Risco alto')
    expect(rotulo(rcq(0.91, 'F', 65, 'bray-gray'))).toBe('Risco muito alto')
  })

  it('CA-2037: Bray & Gray fora de 20 a 69 anos volta para a OMS e avisa', () => {
    const l = rcq(0.91, 'M', 72, 'bray-gray')
    expect(rotulo(l)).toBe('Risco substancialmente aumentado')
    expect(l?.fonte?.curta).toBe(FONTES.who2011.curta)
    expect(l?.avisos.join(' ')).toMatch(/20 a 69 anos/)
  })

  it('CB-1005 e D-1004: sem quadril diz que falta; fora do ponto médio, sem situação', () => {
    expect(linhaRcq(caso({ circunferenciaCinturaCm: 90 }))?.falta).toEqual([{ campo: 'medidasCorporais.quadrilCm', nome: 'o quadril' }])
    const crista = linhaRcq(caso({ circunferenciaCinturaCm: 90 }, { quadrilCm: 100, pontoDaCintura: 'crista-iliaca' }))
    expect(crista?.valor).toBeCloseTo(0.9, 10)
    expect(crista?.situacao).toBeNull()
  })
})

describe('RCE (spec antropometria-completa, CA-2038)', () => {
  const rce = (valor: number, imc = 24) => linhaRce(caso({ circunferenciaCinturaCm: valor * 178, ...comImc(imc) }, { pontoDaCintura: 'ponto-medio' }))

  it('CA-2038: faixas do NICE, 2 casas', () => {
    expect(rce(0.39)?.situacao).toEqual({ rotulo: 'Abaixo da faixa de referência', nivel: 'informativo' })
    expect(rce(0.4)?.situacao).toEqual({ rotulo: 'Saudável', nivel: 'adequado' })
    expect(rotulo(rce(0.49))).toBe('Saudável')
    expect(rce(0.5)?.situacao).toEqual({ rotulo: 'Risco aumentado', nivel: 'atencao' })
    expect(rce(0.6)?.situacao).toEqual({ rotulo: 'Risco alto', nivel: 'alterado' })
    expect(rce(0.45)?.recomendacao?.texto).toBe('0,40 – 0,49')
    expect(rce(0.45)?.fonte?.curta).toBe(FONTES.nice2025.curta)
  })

  it('CA-2038: com IMC ≥ 35, valor sem situação e aviso', () => {
    const l = rce(0.62, 36)
    expect(l?.valor).toBeCloseTo(0.62, 10)
    expect(l?.situacao).toBeNull()
    expect(l?.avisos.join(' ')).toMatch(/35/)
  })

  it('CB-1005: sem estatura diz que falta', () => {
    expect(linhaRce(caso({ circunferenciaCinturaCm: 90, estaturaCm: null }))?.falta).toEqual([{ campo: 'estaturaCm', nome: 'a estatura' }])
  })
})

describe('pescoço (spec antropometria-completa, CA-2039)', () => {
  const pescoco = (cm: number, sexo: Sexo = 'M') => linhaPescoco(caso({ sexo }, { pescocoCm: cm }))

  it('CA-2039: só o corte conferido de Ben-Noun (≥ 37 / ≥ 34 cm)', () => {
    expect(pescoco(36.9)?.situacao).toEqual({ rotulo: 'Sem indicação de excesso de peso', nivel: 'adequado' })
    expect(pescoco(37)?.situacao).toEqual({ rotulo: 'Indica avaliar excesso de peso', nivel: 'atencao' })
    expect(rotulo(pescoco(33.9, 'F'))).toBe('Sem indicação de excesso de peso')
    expect(rotulo(pescoco(34, 'F'))).toBe('Indica avaliar excesso de peso')
    expect(pescoco(40)?.recomendacao?.texto).toBe('Abaixo de 37 cm')
    expect(pescoco(30, 'F')?.recomendacao?.texto).toBe('Abaixo de 34 cm')
    // O segundo nível (39,5 / 36,5) é [V1] e fica fora: 45 cm continua no mesmo rótulo.
    expect(rotulo(pescoco(45))).toBe('Indica avaliar excesso de peso')
  })
})

describe('panturrilha do idoso (spec antropometria-completa, CA-2046)', () => {
  it('CA-2046: como hoje (Pagotto 2018), com a nota dos 31 cm', () => {
    const l = (cm: number, sexo: Sexo = 'M') => linhaPanturrilha(caso({ sexo, idadeAnos: 70, circunferenciaPanturrilhaCm: cm }))
    expect(l(33.9)?.situacao).toEqual({ rotulo: 'Indicativo de redução de massa muscular', nivel: 'alterado' })
    expect(l(34)?.situacao).toEqual({ rotulo: 'Adequada', nivel: 'adequado' })
    expect(rotulo(l(32.9, 'F'))).toBe('Indicativo de redução de massa muscular')
    expect(rotulo(l(33, 'F'))).toBe('Adequada')
    expect(l(36)?.recomendacao?.texto).toBe('34 cm ou mais')
    expect(l(36, 'F')?.recomendacao?.texto).toBe('33 cm ou mais')
    expect(l(36)?.avisos.join(' ')).toMatch(/31 cm/)
    expect(l(36)?.fonte?.curta).toBe(FONTES.pagotto2018.curta)
  })

  it('CB-1007: sem a direita, usa a esquerda e diz o lado', () => {
    const l = linhaPanturrilha(caso({ idadeAnos: 70, circunferenciaPanturrilhaCm: null }, { panturrilhaEsquerdaCm: 35 }))
    expect(l?.valor).toBe(35)
    expect(l?.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Lado', texto: 'esquerdo' })
  })

  it('CA-2046: abaixo de 60 anos, a linha não vem', () => {
    expect(linhaPanturrilha(caso({ idadeAnos: 59, circunferenciaPanturrilhaCm: 35 }))).toBeNull()
  })
})

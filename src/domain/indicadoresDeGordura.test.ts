import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { gorduraDoCaso, linhaGordura, linhaMassaGorda, linhaMassaMagra, linhaSomaDeDobras } from './indicadoresDeGordura.ts'
import { calcularProtocolo } from './protocolosDeDobras.ts'
import type { Caso, ComposicaoCorporal } from './tipos.ts'

type Dobras = ComposicaoCorporal['dobras']
const caso = (p: Partial<Caso> = {}, dobras: Partial<Dobras> = {}, bio: Partial<ComposicaoCorporal['bioimpedancia']> = {}): Caso => {
  const vazio = criarCasoVazio('c')
  return {
    ...vazio,
    sexo: 'M',
    idadeAnos: 30,
    pesoKg: 80,
    estaturaCm: 178,
    ...p,
    composicao: {
      ...vazio.composicao,
      ...p.composicao,
      dobras: { ...vazio.composicao.dobras, ...dobras },
      bioimpedancia: { ...vazio.composicao.bioimpedancia, ...bio },
    },
  }
}
/** Bioimpedância com o % pedido. */
const comBio = (gorduraPct: number, p: Partial<Caso> = {}) => caso(p, {}, { gorduraPct })

describe('% de gordura (spec antropometria-completa, CA-2034)', () => {
  it('CA-2034: homem de 30 anos, Gallagher 2000 "8% a < 20%"', () => {
    const l = linhaGordura(comBio(19.9))
    expect(l?.recomendacao?.texto).toBe('8% a < 20%')
    expect(l?.situacao).toEqual({ rotulo: 'Saudável', nivel: 'adequado' })
    expect(l?.casas).toBe(1)
    expect(l?.fonte?.curta).toBe(FONTES.gallagher2000.curta)
    expect(linhaGordura(comBio(20))?.situacao).toEqual({ rotulo: 'Sobrepeso', nivel: 'atencao' })
    expect(linhaGordura(comBio(25))?.situacao).toEqual({ rotulo: 'Obesidade', nivel: 'alterado' })
    expect(linhaGordura(comBio(7.9))?.situacao).toEqual({ rotulo: 'Abaixo do saudável', nivel: 'atencao' })
  })

  it('CA-2034: mulher de 45 anos, "23% a < 34%"', () => {
    expect(linhaGordura(comBio(30, { sexo: 'F', idadeAnos: 45 }))?.recomendacao?.texto).toBe('23% a < 34%')
  })

  it('CA-2034: aos 19 e aos 80 anos, o valor sem situação', () => {
    for (const idadeAnos of [19, 80]) {
      const l = linhaGordura(comBio(22, { idadeAnos }))
      expect.soft(l?.valor, String(idadeAnos)).toBe(22)
      expect.soft(l?.situacao, String(idadeAnos)).toBeNull()
      expect.soft(l?.avisos.join(' '), String(idadeAnos)).toMatch(/20 a 79 anos/)
    }
  })

  it('CA-2034 e D-1019: das dobras quando o protocolo calcula, com o método no detalhe; senão, da bioimpedância', () => {
    const dasDobras = caso({}, { peitoral: 15, abdominal: 25, coxa: 20 }, { gorduraPct: 30, aparelho: 'InBody' })
    const esperado = calcularProtocolo('jackson-pollock-3', { sexo: 'M', idadeAnos: 30, pesoKg: 80, estaturaCm: 178, gestante: false }, dasDobras.composicao.dobras)
    if (!esperado.calculou) throw new Error('JP3 devia calcular')
    const l = linhaGordura(dasDobras)
    expect(l?.valor).toBe(esperado.gorduraPct)
    expect(l?.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Método', texto: 'Jackson & Pollock, 3 dobras (Jackson e Pollock, 1978; Siri, 1961)' })
    expect(l?.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Conversão', texto: 'Siri' })
    const daBio = linhaGordura(caso({}, { peitoral: 15 }, { gorduraPct: 30, aparelho: 'InBody' }))
    expect(daBio?.valor).toBe(30)
    expect(daBio?.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Método', texto: 'Bioimpedância (InBody)' })
  })

  it('CB-1001: sem dobras completas nem bioimpedância, diz o que falta', () => {
    const l = linhaGordura(caso({}, { peitoral: 15 }))
    expect(l?.valor).toBeNull()
    expect(l?.falta).toEqual([
      { campo: 'composicao.dobras.abdominal', nome: 'a dobra abdominal' },
      { campo: 'composicao.dobras.coxa', nome: 'a dobra coxa' },
    ])
  })

  it('CB-1002: na gestação a linha não vem', () => {
    expect(linhaGordura(comBio(30, { sexo: 'F', condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))).toBeNull()
  })
})

describe('massa gorda, massa magra e soma de dobras (spec antropometria-completa, CA-2035)', () => {
  it('CA-2035: massa gorda e massa magra só com o valor', () => {
    const mg = linhaMassaGorda(comBio(25))
    expect(mg?.valor).toBeCloseTo(20, 10)
    expect(mg?.recomendacao).toBeNull()
    expect(mg?.situacao).toBeNull()
    const mlg = linhaMassaMagra(comBio(25))
    expect(mlg?.valor).toBeCloseTo(60, 10)
    expect(mlg?.situacao).toBeNull()
  })

  it('a massa magra do aparelho vale quando ele dá', () => {
    expect(linhaMassaMagra(caso({}, {}, { gorduraPct: 25, massaMagraKg: 58.4 }))?.valor).toBe(58.4)
  })

  it('CA-2035: sem o peso, as massas dizem que falta o peso', () => {
    expect(linhaMassaGorda(comBio(25, { pesoKg: null }))?.falta).toEqual([{ campo: 'pesoKg', nome: 'o peso' }])
  })

  it('CA-2035: a soma das dobras do protocolo, em mm, sem referência', () => {
    const l = linhaSomaDeDobras(caso({}, { peitoral: 7, abdominal: 25, coxa: 20.5, tricipital: 99 }))
    expect(l?.valor).toBe(52.5)
    expect(l?.situacao).toBeNull()
    expect(l?.fonte?.curta).toBe(FONTES.jacksonPollock1978.curta)
  })

  it('CA-2035: incompleta, sem valor, com o que falta e a parcial no detalhe', () => {
    const l = linhaSomaDeDobras(caso({}, { peitoral: 7, abdominal: 25 }))
    expect(l?.valor).toBeNull()
    expect(l?.falta).toEqual([{ campo: 'composicao.dobras.coxa', nome: 'a dobra coxa' }])
    expect(l?.detalhes).toContainEqual({ tipo: 'numero', rotulo: 'Soma parcial', valor: 32, unidade: 'mm', casas: 1 })
    expect(l?.avisos.join(' ')).toMatch(/incompleta/)
  })

  it('D-1019: gorduraDoCaso diz a origem', () => {
    expect(gorduraDoCaso(comBio(25))?.origem).toBe('bioimpedancia')
    expect(gorduraDoCaso(caso({}, { peitoral: 15, abdominal: 25, coxa: 20 }))?.origem).toBe('dobras')
    expect(gorduraDoCaso(caso())).toBeNull()
  })
})

describe('suprailíaca pela linha na soma de dobras (spec antropometria-completa, revisão, CA-2078)', () => {
  it('CA-2078: a soma segue a mesma escolha de linha do protocolo, com o aviso', () => {
    const l = linhaSomaDeDobras(caso({ sexo: 'F' }, { tricipital: 25, suprailiacaMed: 20, coxa: 25 }))
    expect(l?.valor).toBe(70)
    expect(l?.avisos.join(' ')).toMatch(/deslocado/)
  })
})

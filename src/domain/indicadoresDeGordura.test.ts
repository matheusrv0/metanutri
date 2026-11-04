import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { gorduraDoCaso, linhaGordura, linhaMassaGorda, linhaMassaMagra, linhaSomaDeDobras, type OpcoesDaGordura } from './indicadoresDeGordura.ts'
import { calcularProtocolo, type IdProtocolo } from './protocolosDeDobras.ts'
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

describe('o motivo da recusa chega à linha (spec antropometria-completa, rodada 2, CA-2088 a CA-2090)', () => {
  const PICO = 'Petroski só vale até 115,5 mm de soma, o pico da equação'
  /** Petroski mulher com Σ 140 mm, acima do pico de 115,5. */
  const acimaDoPico = (bio: Partial<ComposicaoCorporal['bioimpedancia']> = {}) =>
    caso({ sexo: 'F', idadeAnos: 30, pesoKg: 90, estaturaCm: 160 }, { subescapular: 45, suprailiacaMed: 45, coxa: 50 }, bio)
  const tresLinhas = (c: Caso, opcoes: OpcoesDaGordura) => [linhaGordura(c, opcoes), linhaMassaGorda(c, opcoes), linhaMassaMagra(c, opcoes)]
  const petroski = { protocolo: 'petroski' } as const

  it('CA-2088: sem bioimpedância, gordura e massas vêm sem valor, sem falta e com o motivo do pico', () => {
    for (const l of tresLinhas(acimaDoPico(), petroski)) {
      expect.soft(l?.valor, l?.id).toBeNull()
      expect.soft(l?.falta, l?.id).toEqual([])
      expect.soft(l?.avisos, l?.id).toEqual([`${PICO}: escolha outro protocolo ou informe o % da bioimpedância.`])
    }
  })

  it('CA-2089: com a bioimpedância no lugar, as três linhas dizem que as dobras não calcularam', () => {
    const c = acimaDoPico({ gorduraPct: 35 })
    const [gordura, massaGorda, massaMagra] = tresLinhas(c, petroski)
    const aviso = `As dobras não calcularam (${PICO}): usado o % da bioimpedância.`
    expect(gordura?.valor).toBe(35)
    expect(gordura?.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Método', texto: 'Bioimpedância' })
    expect(gordura?.avisos).toContain(aviso)
    expect(massaGorda?.valor).toBeCloseTo(31.5, 10)
    expect(massaGorda?.avisos).toEqual([aviso])
    expect(massaMagra?.valor).toBeCloseTo(58.5, 10)
    expect(massaMagra?.avisos).toEqual([aviso])
    expect(gorduraDoCaso(c, petroski)?.dobrasRecusadas?.causa).toBe(PICO)
  })

  it('CA-2089: só faltando dobras, a bioimpedância entra sem esse aviso', () => {
    const c = caso({ sexo: 'F', idadeAnos: 30, pesoKg: 90, estaturaCm: 160 }, { subescapular: 45 }, { gorduraPct: 35 })
    for (const l of tresLinhas(c, petroski)) {
      expect.soft(l?.valor, l?.id).not.toBeNull()
      expect.soft(l?.avisos.join(' '), l?.id).not.toMatch(/não calcularam/)
    }
    expect(gorduraDoCaso(c, petroski)?.dobrasRecusadas).toBeNull()
  })

  it('CA-2090: resultado implausível e Lohman abaixo de 7 anos, cada um com o seu motivo nas três linhas', () => {
    const implausivel = caso({ idadeAnos: 12 }, { tricipital: 60, subescapular: 60 })
    for (const l of tresLinhas(implausivel, { protocolo: 'slaughter-triceps-subescapular' })) {
      expect.soft(l?.avisos, l?.id).toEqual(['O % calculado fica fora do plausível: confira as medidas ou informe o % da bioimpedância.'])
    }
    const seisAnos = caso({ idadeAnos: 6 }, { peitoral: 5, axilarMedia: 5, tricipital: 8, subescapular: 5, abdominal: 6, suprailiacaAnt: 5, coxa: 9 })
    for (const l of tresLinhas(seisAnos, { protocolo: 'jackson-pollock-7' })) {
      expect.soft(l?.avisos, l?.id).toEqual(['A conversão de Lohman começa aos 7 anos: escolha Siri ou Brozek, ou informe o % da bioimpedância.'])
    }
  })

  it('CA-2090: protocolo desconhecido chega à linha com o motivo e o que fazer', () => {
    const l = linhaGordura(caso({}, { peitoral: 15, abdominal: 25, coxa: 20 }), { protocolo: 'protocolo-do-futuro' as IdProtocolo })
    expect(l?.valor).toBeNull()
    expect(l?.avisos.join(' ')).toMatch(/^Protocolo desconhecido.*: escolha outro protocolo ou informe o % da bioimpedância\.$/)
  })

  it('CA-2090: faltando dobra, a linha diz o que falta, sem motivo de recusa', () => {
    const l = linhaGordura(caso({}, { peitoral: 15 }))
    expect(l?.falta.map((f) => f.campo)).toEqual(['composicao.dobras.abdominal', 'composicao.dobras.coxa'])
    expect(l?.avisos).toEqual(['Ou informe o % de gordura da bioimpedância.'])
  })
})

// Spec base-ampliada, CA-1723 e CB-710: as restrições do paciente na base ampliada (pelo nome e pelo grupo, D-717).
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { comCuidadosDaFase, montarRestricoes, restricaoDoAlimento } from './restricoes.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDeItens } from './totais.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const porNome = (nome: string) => {
  const a = BASE.find((x) => x.descricao === nome)
  if (!a) throw new Error(`Sem ${nome} na base ampliada.`)
  return a
}
const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })

afterEach(() => registrarBaseAmpliada([]))

describe('CA-1723: restrições na base ampliada', () => {
  it('alergia a peixe pega a tilápia pelo nome, e ela sai do Cobrir', () => {
    const tilapia = porNome('Tilápia, filé, grelhada')
    expect(restricaoDoAlimento(tilapia, marcadas('peixe'))).toBe('Alergia: peixe')
    registrarBaseAmpliada(BASE)
    const vazio = totaisDeItens([], buscarAlimento)
    const ad = calcularAdequacao(vazio, { sexo: 'F', idadeAnos: 28, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
    const r = sugerirParaCobrir('vitamina_d_mcg', vazio, ad, { gastoEnergetico: 2000, alimentos: alimentosParaSugerir(), restricoes: marcadas('peixe') })
    expect(r.sugestoes.map((s) => buscarAlimento(s.alimentoId)?.categoria)).not.toContain('Pescados e frutos do mar')
  })

  it('o peixe que o nome não diz é pego pelo alergênico da curadoria (D-716b); a alergia a crustáceo, pelo grupo, com o grupo no aviso (D-511)', () => {
    expect(restricaoDoAlimento(porNome('Hadoque, filé, grelhado'), marcadas('peixe'))).toBe('Alergia: peixe')
    expect(restricaoDoAlimento(porNome('Hadoque, filé, grelhado'), marcadas('frutos-do-mar'))).toMatch(/\(grupo Pescados e frutos do mar\)$/)
  })

  it('alergia a soja pega tempeh, edamame e tofu', () => {
    for (const nome of ['Tempeh, cru', 'Edamame, cozido', 'Tofu, firme']) expect(restricaoDoAlimento(porNome(nome), marcadas('soja')), nome).toBe('Alergia: soja')
  })

  it('glúten pega a espelta e o trigo para quibe; trigo pega a espelta', () => {
    expect(restricaoDoAlimento(porNome('Farinha, de espelta, integral'), marcadas('gluten'))).toBe('Intolerância: glúten')
    expect(restricaoDoAlimento(porNome('Farinha, de espelta, integral'), marcadas('trigo'))).toBe('Alergia: trigo')
    expect(restricaoDoAlimento(porNome('Trigo para quibe (bulgur), cozido'), marcadas('gluten'))).toBe('Intolerância: glúten')
  })

  it('leite pega o cottage e o kefir pelo grupo e pelo nome; vegetariano pega a carne', () => {
    expect(restricaoDoAlimento(porNome('Queijo, cottage'), marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(porNome('Kefir, natural, semidesnatado'), marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoAlimento(porNome('Cabrito, assado'), marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
  })
})

describe('CB-710: cuidado da fase e mercúrio', () => {
  it('nenhum sugerível é peixe com muito mercúrio, miúdo ou fígado', () => {
    const sugeriveis = BASE.filter((a) => a.ampliada?.sugerivel)
    for (const a of sugeriveis) {
      expect(a.descricao, a.descricao).not.toMatch(/espadarte|cação|cavala-rei|peixe-batata|atum-azul|fígado|rim|coração|moela|língua|tutano|miolo/i)
    }
  })

  it('o fígado da base ampliada, na gestação, pega o cuidado da fase', () => {
    const figado = BASE.find((a) => /fígado/i.test(a.descricao))
    expect(figado).toBeDefined()
    const gestante = comCuidadosDaFase(marcadas(), { condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 }, idadeAnos: 28 })
    expect(figado ? restricaoDoAlimento(figado, gestante) : null).toMatch(/Na gestação, evite fígado/)
  })
})

describe('D-716e: alertas falsos (achado 4 da revisão)', () => {
  it('a couve-manteiga não é leite: a pontuação sai do nome antes da exceção, na base ampliada e no alimento próprio', () => {
    expect(restricaoDoAlimento(porNome('Couve, manteiga, cozida'), marcadas('leite'))).toBeNull()
    expect(restricaoDoAlimento({ id: 900_001, descricao: 'Couve, manteiga, refogada' }, marcadas('leite'))).toBeNull()
    // A manteiga de verdade continua pegando.
    expect(restricaoDoAlimento({ id: 900_002, descricao: 'Manteiga, com sal' }, marcadas('leite'))).toBe('Alergia: leite e derivados')
  })

  it('o ovo de galinha não acusa vegetariano; a galinha e o caldo de galinha continuam acusando', () => {
    for (const id of [100097, 100098, 100099, 100100, 100639]) {
      const ovo = BASE.find((a) => a.id === id)
      expect(ovo, String(id)).toBeDefined()
      if (ovo) expect(restricaoDoAlimento(ovo, marcadas('vegetariano')), ovo.descricao).toBeNull()
    }
    expect(restricaoDoAlimento({ id: 900_003, descricao: 'Galinha caipira, cozida' }, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    expect(restricaoDoAlimento({ id: 900_004, descricao: 'Caldo de galinha' }, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    // O ovo continua sendo ovo para a alergia e para o vegano.
    expect(restricaoDoAlimento(porNome('Ovo, de galinha, inteiro, pochê'), marcadas('ovo'))).toBe('Alergia: ovo')
    expect(restricaoDoAlimento(porNome('Ovo, de galinha, inteiro, pochê'), marcadas('vegano'))).not.toBeNull()
  })
})

describe('D-716b: alergênicos da curadoria, além dos termos do nome (achado 1 da revisão)', () => {
  const celiaca = montarRestricoes({ marcadas: [], texto: '', doencas: ['celiaca'], naoGosta: '' })
  const id = (n: number) => {
    const a = BASE.find((x) => x.id === n)
    if (!a) throw new Error(`Sem ${n}.`)
    return a
  }

  it('trigo e glúten: grissini e focaccia pegam trigo, glúten e doença celíaca', () => {
    for (const n of [100406, 100414]) {
      expect(restricaoDoAlimento(id(n), marcadas('trigo')), String(n)).toBe('Alergia: trigo')
      expect(restricaoDoAlimento(id(n), marcadas('gluten')), String(n)).toBe('Intolerância: glúten')
      expect(restricaoDoAlimento(id(n), celiaca), String(n)).not.toBeNull()
    }
    // Glúten sem trigo: o missô (cevada) e o pão de centeio.
    expect(restricaoDoAlimento(id(100281), marcadas('gluten'))).toBe('Intolerância: glúten')
    expect(restricaoDoAlimento(id(100405), marcadas('gluten'))).toBe('Intolerância: glúten')
  })

  it('ovo: a massa fresca de espinafre (colesterol de 73 mg) e o surimi pegam ovo', () => {
    for (const n of [100365, 100366, 100042]) expect(restricaoDoAlimento(id(n), marcadas('ovo')), String(n)).toBe('Alergia: ovo')
  })

  it('leite e lactose: pão de alho e chocolate amargo pegam leite; o croissant de queijo pega lactose', () => {
    for (const n of [100415, 100618]) expect(restricaoDoAlimento(id(n), marcadas('leite')), String(n)).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(id(100413), marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoAlimento(id(100618), marcadas('vegano'))).not.toBeNull()
  })

  it('soja: o chocolate amargo (lecitina) pega soja', () => {
    expect(restricaoDoAlimento(id(100619), marcadas('soja'))).toBe('Alergia: soja')
  })

  it('peixe e crustáceo: o surimi pega os dois; a lula frita pega crustáceo e trigo (empanada)', () => {
    expect(restricaoDoAlimento(id(100042), marcadas('peixe'))).not.toBeNull()
    expect(restricaoDoAlimento(id(100042), marcadas('frutos-do-mar'))).not.toBeNull()
    expect(restricaoDoAlimento(id(100068), marcadas('frutos-do-mar'))).not.toBeNull()
    expect(restricaoDoAlimento(id(100068), marcadas('trigo'))).toBe('Alergia: trigo')
  })

  it('castanhas: noz-pecã, macadâmia e farinha de amêndoa pegam castanhas', () => {
    for (const n of [100316, 100314, 100300]) expect(restricaoDoAlimento(id(n), marcadas('castanhas')), String(n)).toBe('Alergia: castanhas')
  })

  it('varredura: todo pão, massa, bolo e biscoito de trigo da base pega glúten, trigo e doença celíaca', () => {
    const DE_TRIGO = /\b(bread|pita|croissants?|focaccia|phyllo|crackers?|pasta|noodles|soba|tortillas?|couscous|cake|cookies?|muffin|bagel|pretzel)\b/i
    const SEM_TRIGO = /gluten-free|^Rice noodles|cellophane|^Tortilla, corn|corn|rice cakes/i
    const deTrigo = BASE.filter((a) => a.ampliada && DE_TRIGO.test(a.ampliada.nomeOriginal) && !SEM_TRIGO.test(a.ampliada.nomeOriginal))
    expect(deTrigo.length).toBeGreaterThan(25)
    for (const a of deTrigo) {
      expect(restricaoDoAlimento(a, marcadas('gluten')), a.descricao).toBe('Intolerância: glúten')
      expect(restricaoDoAlimento(a, marcadas('trigo')), a.descricao).toBe('Alergia: trigo')
      expect(restricaoDoAlimento(a, celiaca), a.descricao).not.toBeNull()
    }
  })
})

describe('D-716l: restrições que pegavam demais (achado 11 da revisão)', () => {
  const id = (n: number) => {
    const a = BASE.find((x) => x.id === n)
    if (!a) throw new Error(`Sem ${n}.`)
    return a
  }

  it('macarrão de arroz, de milho e harussame, biscoito de arroz e trigo-sarraceno não pegam glúten nem trigo', () => {
    for (const n of [100379, 100380, 100367, 100368, 100284, 100634, 100335, 100336, 100346]) {
      expect(restricaoDoAlimento(id(n), marcadas('gluten')), id(n).descricao).toBeNull()
      expect(restricaoDoAlimento(id(n), marcadas('trigo')), id(n).descricao).toBeNull()
    }
    // O mesmo nome no alimento próprio, e o macarrão de trigo continua pegando.
    expect(restricaoDoAlimento({ id: 900_010, descricao: 'Macarrão de arroz integral' }, marcadas('gluten'))).toBeNull()
    expect(restricaoDoAlimento({ id: 900_011, descricao: 'Macarrão, trigo, cozido' }, marcadas('gluten'))).toBe('Intolerância: glúten')
  })

  it('a noz-moscada não pega castanhas; a noz e a noz-pecã continuam pegando', () => {
    expect(restricaoDoAlimento(id(100604), marcadas('castanhas'))).toBeNull()
    expect(restricaoDoAlimento(id(100316), marcadas('castanhas'))).toBe('Alergia: castanhas')
    expect(restricaoDoAlimento({ id: 900_012, descricao: 'Noz, crua' }, marcadas('castanhas'))).toBe('Alergia: castanhas')
  })

  it('o croissant de queijo pega lactose', () => {
    expect(restricaoDoAlimento(id(100413), marcadas('lactose'))).toBe('Intolerância: lactose')
  })
})

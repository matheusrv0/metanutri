// O mapeamento das restrições na base (spec ficha-unica, D-352, CA-1073 e Apêndice A).
import { ALIMENTOS_POR_RESTRICAO, idsDaRestricao } from './restricoesDaBase.ts'
import { ALIMENTOS } from './tabelas.ts'

const PRIMEIRO_ID = 1
const ULTIMO_ID = 597
const intervalo = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => de + i)
const nomes = (ids: ReadonlySet<number>) => ALIMENTOS.filter((a) => ids.has(a.id)).map((a) => a.descricao.trim())
const daCategoria = (prefixo: string) => ALIMENTOS.filter((a) => a.categoria.startsWith(prefixo)).map((a) => a.id)
const porNome = (descricao: string) => {
  const achado = ALIMENTOS.find((a) => a.descricao.trim() === descricao)
  if (!achado) throw new Error(`"${descricao}" não está na base.`)
  return achado.id
}

describe('Apêndice A: os ids de cada restrição (CA-1073)', () => {
  it('só usa ids que existem na base de 597 alimentos, sem repetir', () => {
    expect(ALIMENTOS.length).toBe(ULTIMO_ID)
    for (const [id, lista] of Object.entries(ALIMENTOS_POR_RESTRICAO)) {
      expect(new Set(lista).size, id).toBe(lista.length)
      for (const alimentoId of lista) {
        expect(alimentoId, id).toBeGreaterThanOrEqual(PRIMEIRO_ID)
        expect(alimentoId, id).toBeLessThanOrEqual(ULTIMO_ID)
      }
    }
  })

  it('tem as contagens do Apêndice A', () => {
    expect(idsDaRestricao('leite').size).toBe(81)
    expect(idsDaRestricao('lactose').size).toBe(42)
    expect(idsDaRestricao('ovo').size).toBe(40)
    expect(idsDaRestricao('trigo').size).toBe(57)
    expect(idsDaRestricao('gluten').size).toBe(62)
    expect(idsDaRestricao('soja').size).toBe(26)
    expect(idsDaRestricao('amendoim').size).toBe(5)
    expect(idsDaRestricao('castanhas').size).toBe(6)
    expect(idsDaRestricao('peixe').size).toBe(47)
    expect(idsDaRestricao('frutos-do-mar').size).toBe(9)
    expect(idsDaRestricao('vegetariano').size).toBe(203)
  })
})

describe('Leite e derivados e lactose', () => {
  const leite = idsDaRestricao('leite')
  const lactose = idsDaRestricao('lactose')

  it('Leite e derivados pega a categoria inteira: os 9 queijos (com requeijão e ricota) e os 5 iogurtes', () => {
    for (const id of daCategoria('Leite e derivados')) expect(leite.has(id)).toBe(true)
    const queijos = nomes(leite).filter((n) => n.startsWith('Queijo,'))
    expect(queijos).toHaveLength(9)
    expect(nomes(leite).filter((n) => n.startsWith('Iogurte'))).toHaveLength(5)
  })

  it('Leite e derivados pega manteiga, margarina e as preparações com leite ou queijo', () => {
    for (const nome of [
      'Manteiga, com sal',
      'Margarina, com óleo interesterificado, com sal (65%de lipídeos)',
      'Pão, de queijo, assado',
      'Estrogonofe de frango',
      'Chocolate, ao leite',
      'Doce, de leite, cremoso',
      'Omelete, de queijo',
      'Pastel, de queijo, frito',
      'Tapioca, com manteiga',
      'Capuccino, pó',
    ]) {
      expect(leite.has(porNome(nome)), nome).toBe(true)
    }
  })

  it('Leite e derivados não pega leite de coco nem queijo de soja', () => {
    expect(leite.has(porNome('Leite, de coco'))).toBe(false)
    expect(leite.has(porNome('Soja, queijo (tofu)'))).toBe(false)
    expect(leite.has(porNome('Soja, extrato solúvel, natural, fluido'))).toBe(false)
    expect(leite.has(porNome('Pão, trigo, francês'))).toBe(false)
  })

  it('toda descrição com leite, queijo, iogurte, requeijão, manteiga ou creme de leite está em Leite e derivados', () => {
    const termos = /\b(leite|queijo|iogurte|requeij|manteiga|creme de leite|láctea|lácteo)/i
    const fora = ALIMENTOS.filter((a) => termos.test(a.descricao) && !leite.has(a.id)).map((a) => a.descricao.trim())
    // Couve manteiga é a variedade da couve; leite de coco e queijo de soja não têm leite.
    expect(fora).toEqual(['Couve, manteiga, crua', 'Couve, manteiga, refogada', 'Leite, de coco', 'Soja, queijo (tofu)'])
  })

  it('Lactose está dentro de Leite e derivados', () => {
    for (const id of lactose) expect(leite.has(id), String(id)).toBe(true)
  })

  it('Lactose deixa de fora os queijos maturados, a manteiga, a margarina, os pães e os biscoitos', () => {
    for (const nome of [
      'Queijo, parmesão',
      'Queijo, prato',
      'Queijo, minas, meia cura',
      'Queijo, mozarela',
      'Manteiga, sem sal',
      'Pão, trigo, forma, integral',
      'Biscoito, doce, maisena',
    ]) {
      expect(lactose.has(porNome(nome)), nome).toBe(false)
    }
  })

  it('Lactose pega leites, iogurtes, requeijão, ricota e os queijos frescos', () => {
    for (const nome of [
      'Leite, de vaca, integral',
      'Leite, de vaca, desnatado, UHT',
      'Leite, de cabra',
      'Iogurte, natural',
      'Queijo, requeijão, cremoso',
      'Queijo, ricota',
      'Queijo, minas, frescal',
      'Leite, condensado',
      'Creme de Leite',
    ]) {
      expect(lactose.has(porNome(nome)), nome).toBe(true)
    }
  })
})

describe('Trigo e glúten', () => {
  const trigo = idsDaRestricao('trigo')
  const gluten = idsDaRestricao('gluten')

  it('Trigo está dentro de Glúten', () => {
    for (const id of trigo) expect(gluten.has(id), String(id)).toBe(true)
  })

  it('Glúten soma aveia, centeio, cevada (cerveja) e malte (cereal matinal)', () => {
    for (const nome of ['Aveia, flocos, crua', 'Farinha, de centeio, integral', 'Cerveja, pilsen 2', 'Cereal matinal, milho']) {
      expect(gluten.has(porNome(nome)), nome).toBe(true)
      expect(trigo.has(porNome(nome)), nome).toBe(false)
    }
  })

  it('pega pães (menos o de queijo), macarrão, biscoitos (menos o de polvilho), bolos, pastéis, quibe e empanados', () => {
    for (const nome of [
      'Pão, trigo, francês',
      'Pão, trigo, forma, integral',
      'Macarrão, trigo, cru',
      'Biscoito, salgado, cream cracker',
      'Bolo, pronto, chocolate',
      'Pastel, de carne, frito',
      'Quibe, assado',
      'Frango, filé, à milanesa',
      'Torrada, pão francês',
      'Shoyu',
      'Tabule',
    ]) {
      expect(gluten.has(porNome(nome)), nome).toBe(true)
    }
    for (const nome of ['Pão, de queijo, assado', 'Biscoito, polvilho doce', 'Tapioca, com manteiga', 'Arroz, tipo 1, cozido', 'Cuscuz, de milho, cozido com sal', 'Farinha, de mandioca, crua']) {
      expect(gluten.has(porNome(nome)), nome).toBe(false)
    }
  })

  it('toda descrição com trigo, pão, macarrão, biscoito, bolo, pastel, lasanha ou milanesa está em Glúten, menos as de polvilho e de queijo', () => {
    const termos = /\b(trigo|pão|macarrão|biscoito|bolo,|pastel|lasanha|milanesa|torrada|empada|quibe|croquete|nhoque)/i
    const fora = ALIMENTOS.filter((a) => termos.test(a.descricao) && !gluten.has(a.id)).map((a) => a.descricao.trim())
    // Polvilho e pão de queijo são de mandioca; "torrada" ali é o preparo; fruta-pão é fruta; quibebe é de abóbora.
    expect(fora).toEqual([
      'Biscoito, polvilho doce',
      'Farinha, de mandioca, torrada',
      'Pão, de queijo, assado',
      'Pão, de queijo, cru',
      'Fruta-pão, crua',
      'Quibebe',
      'Amêndoa, torrada, salgada',
      'Castanha-de-caju, torrada, salgada',
    ])
  })
})

describe('Peixe, frutos do mar, oleaginosas e soja', () => {
  it('toda a categoria Pescados e frutos do mar está em Peixe ou em Crustáceos e frutos do mar, sem estar nos dois', () => {
    const peixe = idsDaRestricao('peixe')
    const mar = idsDaRestricao('frutos-do-mar')
    for (const id of daCategoria('Pescados')) {
      expect(peixe.has(id) !== mar.has(id), String(id)).toBe(true)
    }
    expect(nomes(mar).filter((n) => /^(Camarão, |Caranguejo)/.test(n))).toHaveLength(4)
  })

  it('Amendoim e Castanhas pegam os grãos e os doces e pratos feitos com eles', () => {
    expect(nomes(idsDaRestricao('amendoim'))).toEqual(['Vatapá', 'Amendoim, grão, cru', 'Amendoim, torrado, salgado', 'Paçoca, amendoim', 'Pé-de-moleque, amendoim'])
    expect(idsDaRestricao('castanhas').has(porNome('Castanha-do-Brasil, crua'))).toBe(true)
    expect(idsDaRestricao('castanhas').has(porNome('Chocolate, ao leite, com castanha do Pará'))).toBe(true)
    expect(idsDaRestricao('castanhas').has(porNome('Coco, cru'))).toBe(false)
  })

  it('Soja pega os derivados da soja e o shoyu, e não o óleo refinado', () => {
    const soja = idsDaRestricao('soja')
    for (const nome of ['Soja, queijo (tofu)', 'Soja, farinha', 'Shoyu', 'Pão, de soja']) expect(soja.has(porNome(nome)), nome).toBe(true)
    expect(soja.has(porNome('Óleo, de soja'))).toBe(false)
  })
})

describe('Vegetariano e vegano', () => {
  const vegetariano = idsDaRestricao('vegetariano')
  const vegano = idsDaRestricao('vegano')

  it('Vegetariano pega as carnes, os peixes, os frutos do mar, a gelatina e os pratos com eles', () => {
    for (const id of [...daCategoria('Carnes'), ...daCategoria('Pescados')]) expect(vegetariano.has(id), String(id)).toBe(true)
    for (const nome of ['Feijoada', 'Estrogonofe de carne', 'Gelatina, sabores variados, pó', 'Pastel, de carne, cru', 'Cuscuz, paulista']) {
      expect(vegetariano.has(porNome(nome)), nome).toBe(true)
    }
    for (const nome of ['Ovo, de galinha, inteiro, cozido/10minutos', 'Leite, de vaca, integral', 'Feijão, carioca, cozido', 'Tabule']) {
      expect(vegetariano.has(porNome(nome)), nome).toBe(false)
    }
  })

  it('Vegano contém Vegetariano, Leite e derivados, Ovo e o mel', () => {
    for (const id of [...vegetariano, ...idsDaRestricao('leite'), ...idsDaRestricao('ovo')]) expect(vegano.has(id)).toBe(true)
    expect(vegano.has(porNome('Mel, de abelha'))).toBe(true)
    expect(vegano.has(porNome('Melado'))).toBe(false)
    expect(vegano.size).toBe(new Set([...vegetariano, ...idsDaRestricao('leite'), ...idsDaRestricao('ovo'), porNome('Mel, de abelha')]).size)
  })

  it('cobre os 597 alimentos sem id fora do intervalo', () => {
    const todos = new Set(intervalo(PRIMEIRO_ID, ULTIMO_ID))
    for (const id of vegano) expect(todos.has(id)).toBe(true)
  })
})

// Spec alimentos-e-gramaturas, D-493: a regra prescritível do alimento próprio, que lê os campos declarados, o grupo e o
// nome livre.
import { dadosEmBranco, produtoDosDados } from './alimentoProprio.ts'
import { produtoComoAlimento, type DadosAlimentoProprio } from './produtos.ts'
import { motivoParaNaoSugerir, regraDoProprio } from './sugestaoDoProprio.ts'
import type { Alimento } from './tipos.ts'

const NEUTRO: DadosAlimentoProprio = {
  ...dadosEmBranco('alimento'),
  nome: 'Mistura da casa',
  grupo: 'Cereais e derivados',
  preparo: 'cozido',
  valores: { energia_kcal: 112, proteina_g: 2.2, carboidrato_g: 25, lipideos_g: 0.3 },
  fonte: { tipo: 'laboratorio' },
}

const comoAlimento = (d: Partial<DadosAlimentoProprio> & { readonly valoresExtra?: DadosAlimentoProprio['valores'] }): Alimento => {
  const { valoresExtra, ...resto } = d
  const dados: DadosAlimentoProprio = { ...NEUTRO, ...resto, valores: { ...NEUTRO.valores, ...valoresExtra } }
  return produtoComoAlimento({ ...produtoDosDados(dados), id: 900_001, codigoBarras: '', marca: '', medidaCaseira: '', criadoEm: '' })
}

describe('os campos declarados e o grupo (D-493)', () => {
  it('CA-1352: gordura trans acima de 0 é "nunca"; 0 ou vazia não tira (CB-460)', () => {
    expect(regraDoProprio(comoAlimento({ valoresExtra: { gordura_trans_g: 0.6 } }))).toMatchObject({ nivel: 'nunca', motivo: 'gordura trans declarada' })
    expect(regraDoProprio(comoAlimento({ valoresExtra: { gordura_trans_g: 0 } }))).toBeNull()
    expect(regraDoProprio(comoAlimento({}))).toBeNull()
  })

  it('CA-1353: o grupo "Outros alimentos industrializados" fica fora da rotina', () => {
    expect(regraDoProprio(comoAlimento({ grupo: 'Outros alimentos industrializados' }))).toMatchObject({ nivel: 'fora-da-rotina', motivo: 'grupo Outros alimentos industrializados' })
  })

  it('CA-1354: açúcares acima de 15 g em 100 g, ou de 7,5 g na bebida e no leite; a fruta não passa pelo limite', () => {
    expect(regraDoProprio(comoAlimento({ tipo: 'preparacao', valoresExtra: { acucares_g: 35, carboidrato_g: 50 } }))?.motivo).toBe('mais de 15 g de açúcares em 100 g')
    expect(regraDoProprio(comoAlimento({ valoresExtra: { acucares_g: 14 } }))).toBeNull()
    const bebida = { grupo: 'Bebidas (alcoólicas e não alcoólicas)', unidade: 'ml' as const, valoresExtra: { acucares_g: 11.5 } }
    expect(regraDoProprio(comoAlimento(bebida))?.motivo).toBe('mais de 7,5 g de açúcares em 100 ml')
    expect(regraDoProprio(comoAlimento({ grupo: 'Leite e derivados', valoresExtra: { acucares_g: 12 } }))?.motivo).toBe('mais de 7,5 g de açúcares em 100 g')
    expect(regraDoProprio(comoAlimento({ grupo: 'Leite e derivados', valoresExtra: { acucares_g: 4.7 } }))).toBeNull()
    expect(regraDoProprio(comoAlimento({ grupo: 'Frutas e derivados', preparo: 'cru', valoresExtra: { acucares_g: 16 } }))).toBeNull()
    expect(regraDoProprio(comoAlimento({ grupo: 'Frutas e derivados', tipo: 'preparacao', valoresExtra: { acucares_g: 40, carboidrato_g: 50 } }))?.motivo).toBe('mais de 15 g de açúcares em 100 g')
    // CB-459: sem açúcar declarado, a regra do açúcar não vale.
    expect(regraDoProprio(comoAlimento({ grupo: 'Leite e derivados' }))).toBeNull()
  })
})

describe('só a fruta do tipo Alimento fica fora do limite de açúcar (D-507)', () => {
  const FRUTA = 'Frutas e derivados'

  it('CA-1373: a fruta de rótulo e a preparação de fruta passam pelo limite; a do tipo Alimento, não', () => {
    const acai = comoAlimento({ tipo: 'rotulo', nome: 'Açaí com guaraná', grupo: FRUTA, preparo: null, valoresExtra: { acucares_g: 18 } })
    expect(regraDoProprio(acai)?.motivo).toBe('mais de 15 g de açúcares em 100 g')
    expect(motivoParaNaoSugerir(acai)).toBe('mais de 15 g de açúcares em 100 g')
    const chips = comoAlimento({ tipo: 'rotulo', nome: 'Banana chips', grupo: FRUTA, preparo: null, valoresExtra: { acucares_g: 35, lipideos_g: 33 } })
    expect(motivoParaNaoSugerir(chips)).toBe('mais de 15 g de açúcares em 100 g')
    expect(regraDoProprio(comoAlimento({ tipo: 'preparacao', grupo: FRUTA, valoresExtra: { acucares_g: 16, carboidrato_g: 25 } }))?.motivo).toBe('mais de 15 g de açúcares em 100 g')
    expect(regraDoProprio(comoAlimento({ tipo: 'alimento', nome: 'Banana-passa', grupo: FRUTA, preparo: 'cru', valoresExtra: { acucares_g: 16 } }))).toBeNull()
  })

  it('CA-1373: "chips" em qualquer lugar do nome é ultraprocessado, em qualquer tipo (CB-467)', () => {
    for (const tipo of ['alimento', 'preparacao', 'rotulo'] as const) {
      expect(regraDoProprio(comoAlimento({ tipo, nome: 'Banana chips', grupo: FRUTA }))?.motivo, tipo).toBe('ultraprocessado')
    }
    expect(regraDoProprio(comoAlimento({ nome: 'Chips de banana' }))?.motivo).toBe('ultraprocessado')
    expect(regraDoProprio(comoAlimento({ nome: 'Mandioca chips assada' }))?.motivo).toBe('ultraprocessado')
  })

  it('CB-466: a fruta de rótulo medida em ml passa pelo limite de 7,5 g em 100 ml; a do tipo Alimento, não', () => {
    const suco = { nome: 'Suco de laranja integral', grupo: FRUTA, unidade: 'ml' as const, preparo: null, valoresExtra: { acucares_g: 8.4 } }
    expect(regraDoProprio(comoAlimento({ ...suco, tipo: 'rotulo' }))?.motivo).toBe('mais de 7,5 g de açúcares em 100 ml')
    expect(regraDoProprio(comoAlimento({ ...suco, tipo: 'alimento' }))).toBeNull()
  })
})

describe('o açúcar do próprio leite não trava o leite (D-509)', () => {
  const LEITE = 'Leite e derivados'
  const leite = (nome: string, acucares_g: number) => comoAlimento({ nome, grupo: LEITE, preparo: 'pronto para consumo', valoresExtra: { acucares_g } })

  it('CA-1375: leite e iogurte sem adição ficam fora do limite de açúcar, e a chave fica livre', () => {
    for (const [nome, acucares] of [
      ['Leite em pó integral', 38],
      ['Leite em pó desnatado da fazenda', 52],
      ['Leite de vaca integral', 4.7],
      ['Leite semidesnatado', 4.9],
      ['Leite em pó de cabra', 40],
      ['Iogurte natural desnatado', 8],
      ['Iogurte integral', 9],
    ] as const) {
      expect(regraDoProprio(leite(nome, acucares)), nome).toBeNull()
      expect(motivoParaNaoSugerir(leite(nome, acucares)), nome).toBeNull()
    }
  })

  it('CA-1375: com sinal de adição no nome, o limite de 7,5 g vale como antes', () => {
    for (const [nome, acucares] of [
      ['Iogurte de morango', 12],
      ['Leite em pó sabor morango', 40],
      ['Iogurte natural com mel', 10],
      ['Iogurte natural de coco', 10],
      ['Leite integral achocolatado', 9],
      ['Leite em pó integral adoçado', 45],
      ['Leite condensado', 55],
      ['Leite fermentado desnatado', 14],
      ['Leite integral com cacau', 9],
    ] as const) {
      expect(regraDoProprio(leite(nome, acucares))?.motivo, nome).toBe('mais de 7,5 g de açúcares em 100 g')
    }
    // O achocolatado não começa por "leite": passa pelo limite.
    expect(regraDoProprio(leite('Achocolatado em pó', 70))?.motivo).toBe('mais de 7,5 g de açúcares em 100 g')
  })

  it('CB-468: sem açúcar declarado, o nome ainda pega o condensado, o fermentado e o "sabor"', () => {
    expect(regraDoProprio(comoAlimento({ nome: 'Leite condensado', grupo: LEITE }))?.motivo).toBe('doce')
    expect(regraDoProprio(comoAlimento({ nome: 'Leite fermentado', grupo: LEITE }))?.motivo).toBe('bebida adoçada')
    expect(regraDoProprio(comoAlimento({ nome: 'Leite em pó sabor baunilha', grupo: LEITE }))?.motivo).toBe('ultraprocessado')
  })
})

describe('o nome livre (D-493)', () => {
  it.each([
    ['Bolo de chocolate da vó', 'doce'],
    ['Pudim de leite da tia', 'doce'],
    ['Doce de leite caseiro', 'doce'],
    ['Goiabada cascão', 'doce'],
    ['Abacaxi em calda', 'doce'],
    ['Castanha com cobertura de chocolate', 'doce'],
    ['Biscoito recheado sabor chocolate', 'ultraprocessado'],
    ['Rosquinha de coco', 'ultraprocessado'],
    ['Bolacha de água e sal', 'ultraprocessado'],
    ['Barra de cereais com castanha', 'ultraprocessado'],
    ['Salgadinho de milho', 'ultraprocessado'],
    ['Pão recheado da padaria', 'ultraprocessado'],
    ['Néctar de acerola', 'bebida adoçada'],
    ['Refresco de caju', 'bebida adoçada'],
    ['Suco de uva adoçado', 'bebida adoçada'],
    ['Chope artesanal', 'bebida alcoólica'],
    ['Espumante de caju', 'bebida alcoólica'],
  ])('"%s" fica fora: %s', (nome, motivo) => {
    expect(regraDoProprio(comoAlimento({ nome }))?.motivo).toBe(motivo)
  })

  it.each(['Camu-camu, polpa congelada', 'Cuscuz nordestino', 'Batata-doce assada da feira', 'Farinha d’água de Bragança', 'Tapioca com coco', 'Pão caseiro de macaxeira'])('"%s" não é pego pelo nome', (nome) => {
    expect(regraDoProprio(comoAlimento({ nome }))).toBeNull()
  })
})

describe('o motivo que o formulário mostra (CA-1356)', () => {
  it('a regra da base, a do próprio e o grupo Suplementos; o mais grave primeiro', () => {
    expect(motivoParaNaoSugerir(comoAlimento({ grupo: 'Suplementos' }))).toBe('suplemento')
    expect(motivoParaNaoSugerir(comoAlimento({ nome: 'Cerveja de mandioca' }))).toBe('bebida alcoólica')
    expect(motivoParaNaoSugerir(comoAlimento({ grupo: 'Produtos açucarados' }))).toBe('doce, açúcar ou fruta em calda')
    // A gordura trans ("nunca") vem antes do grupo industrializado ("fora da rotina").
    expect(motivoParaNaoSugerir(comoAlimento({ grupo: 'Outros alimentos industrializados', valoresExtra: { gordura_trans_g: 1 } }))).toBe('gordura trans declarada')
    expect(motivoParaNaoSugerir(comoAlimento({}))).toBeNull()
    // A forma de ingrediente segue a chave "Incluir ingredientes" do Cobrir: não trava a chave do cadastro.
    expect(motivoParaNaoSugerir(comoAlimento({ nome: 'Farinha de babaçu', preparo: 'cru' }))).toBeNull()
  })
})

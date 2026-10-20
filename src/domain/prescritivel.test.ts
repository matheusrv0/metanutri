import { FORMA_DE_INGREDIENTE, NUNCA_APARECE } from './naoProposto.test-utils.ts'
import { ehDeUsoComum, ehPrescritivel, ehSegundaEscolha, REGRAS_PRESCRICAO, regraQueExclui } from './prescritivel.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

// A TACO tem descrições com espaço sobrando nas pontas ("Couve, manteiga, refogada ").
const porDescricao = (d: string): Alimento => {
  const a = ALIMENTOS.find((x) => x.descricao.trim() === d)
  if (!a) throw new Error(`Alimento "${d}" não existe na tabela.`)
  return a
}

// Lista revisada à mão contra o Apêndice A. Mudou a regra ou a base? Esta lista e o apêndice mudam juntos.
const IDS_POR_MOTIVO: Readonly<Record<string, readonly number[]>> = {
  alcool: [472, 474],
  'sal-e-fermento': [513, 514, 516, 517, 518, 519],
  // Spec conduta-da-nutricionista, D-292: gordura trans é "nunca".
  'gordura-trans': [263, 264, 522],
  'bebida-adocada': [446, 455, 470, 473, 479, 480, 481, 482, 483, 512],
  doce: [
    8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 26, 29, 30, 167, 171, 173, 176, 195, 198, 199, 224, 227, 245, 450, 451, 452, 453, 466,
    491, 492, 493, 494, 495, 496, 497, 499, 500, 501, 502, 503, 504, 505, 506, 508, 509, 510, 515, 579, 580,
  ],
  gordura: [259, 261, 262, 265, 266, 267, 268, 269, 270, 271, 272, 444, 445, 447, 523, 524, 545, 547],
  embutido: [323, 339, 385, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 434, 437, 438, 439, 443],
  'prato-com-embutido': [526, 539, 555],
  fritura: [55, 56, 57, 58, 59, 60, 90, 93, 132, 281, 286, 297, 299, 300, 303, 305, 306, 308, 320, 331, 340, 386, 387, 388, 401, 428, 442, 525, 529, 530],
  ultraprocessado: [23, 24, 28, 31, 36, 39, 46, 99, 324, 325, 389, 390],
  // Spec conduta-da-nutricionista, D-291: preparações que quase nunca se prescrevem assim.
  preparacao: [13, 61, 140, 551],
  miscelanea: [511],
  po: [27, 114, 583],
  farinha: [32, 33, 34, 35, 42, 43, 123, 124, 146, 581, 592],
  cru: [
    2, 4, 6, 19, 38, 40, 41, 44, 65, 67, 87, 89, 92, 96, 103, 113, 130, 141, 275, 278, 279,
    283, 285, 288, 291, 292, 295, 296, 298, 302, 304, 307, 310, 312, 314, 316, 321, 322, 327, 329, 330, 333, 334, 336, 341, 343, 345, 348,
    350, 352, 354, 355, 357, 360, 362, 364, 366, 367, 369, 372, 373, 375, 376, 379, 380, 382, 391, 394, 397, 399, 400, 402, 405, 407, 409,
    412, 414, 426, 427, 431, 433, 436, 441, 485, 489, 557, 562, 564, 566, 568, 570, 572, 574, 575, 576, 578, 585,
  ],
  tempero: [81, 82, 108, 133, 153, 158, 159, 160, 188, 220, 234, 258, 535, 552],
}

describe('regra "prescritível" (spec sugestoes-com-criterio)', () => {
  it.each(['Cerveja, pilsen 2', 'Cana, aguardente 1'])('CA-650: "%s" nunca é proposto, nem com a chave ligada', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id: 'alcool', nivel: 'nunca' })
    expect(ehPrescritivel(a)).toBe(false)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each(['Sal, grosso', 'Sal, dietético', 'Shoyu', 'Tempero a base de sal', 'Fermento em pó, químico', 'Fermento, biológico, levedura, tablete'])(
    'CA-665: "%s" nunca é proposto, nem com a chave ligada',
    (d) => {
      const a = porDescricao(d)
      expect(regraQueExclui(a)).toMatchObject({ id: 'sal-e-fermento', nivel: 'nunca' })
      expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
    },
  )

  it.each(['Mingau tradicional, pó', 'Creme de milho, pó', 'Farinha, de arroz, enriquecida'])(
    'CA-666: "%s" é fortificado: ultraprocessado, como o mingau infantil; a chave não o traz',
    (d) => {
      const a = porDescricao(d)
      expect(regraQueExclui(a)).toMatchObject({ id: 'ultraprocessado', nivel: 'fora-da-rotina' })
      expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
    },
  )

  // A feijoada e os pratos regionais voltaram pela conduta da parceira (spec conduta-da-nutricionista, D-290).
  it.each(['Feijão tropeiro mineiro', 'Virado à paulista', 'Arroz carreteiro'])('CA-669 e CA-910: "%s" continua prato com embutido ou carne curada', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id: 'prato-com-embutido', nivel: 'fora-da-rotina' })
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it('CA-666: o creme de arroz em pó não é fortificado e segue como forma de ingrediente', () => {
    expect(regraQueExclui(porDescricao('Creme de arroz, pó'))).toMatchObject({ id: 'po', nivel: 'ingrediente' })
  })

  it.each([
    ['Capuccino, pó', 'bebida-adocada'],
    ['Gelatina, sabores variados, pó', 'doce'],
  ])('CA-665: "%s" é fora da rotina (%s), não ingrediente: a chave não o traz', (d, id) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id, nivel: 'fora-da-rotina' })
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each([
    ['Refrigerante, tipo cola', 'bebida-adocada'],
    ['Refrigerante, tipo água tônica', 'bebida-adocada'],
    ['Bebida isotônica, sabores variados', 'bebida-adocada'],
    ['Cana, caldo de', 'bebida-adocada'],
    ['Bebida láctea, pêssego', 'bebida-adocada'],
    ['Leite, de vaca, achocolatado', 'bebida-adocada'],
    ['Doce, de leite, cremoso', 'doce'],
    ['Achocolatado, pó', 'doce'],
    ['Biscoito, doce, recheado com chocolate', 'doce'],
    ['Bolo, pronto, chocolate', 'doce'],
    ['Pêssego, enlatado, em calda', 'doce'],
    // Revisão C1: o nome não diz "em calda", e escapava.
    ['Ameixa, calda, enlatada', 'doce'],
    ['Goiaba, doce em pasta', 'doce'],
    ['Açaí, polpa, com xarope de guaraná e glucose', 'doce'],
    ['Iogurte, sabor morango', 'doce'],
    ['Queijo, petit suisse, morango', 'doce'],
    ['Leite, condensado', 'doce'],
    ['Paçoca, amendoim', 'doce'],
    ['Chocolate, ao leite', 'doce'],
    ['Cereal matinal, milho, açúcar', 'doce'],
    ['Óleo, de soja', 'gordura'],
    ['Azeite, de dendê', 'gordura'],
    ['Margarina, com óleo interesterificado, com sal (65%de lipídeos)', 'gordura'],
    ['Manteiga, com sal', 'gordura'],
    ['Maionese, tradicional com ovos', 'gordura'],
    ['Creme de Leite', 'gordura'],
    ['Toucinho, frito', 'gordura'],
    ['Leite, de coco', 'gordura'],
    ['Salada, de legumes, com maionese', 'gordura'],
    ['Mortadela', 'embutido'],
    ['Lingüiça, porco, grelhada', 'embutido'],
    ['Presunto, sem capa de gordura', 'embutido'],
    ['Salame', 'embutido'],
    ['Apresuntado', 'embutido'],
    ['Hambúrguer, bovino, grelhado', 'embutido'],
    ['Carne, bovina, charque, cru', 'embutido'],
    ['Carne, bovina, seca, crua', 'embutido'],
    ['Frango, filé, à milanesa', 'fritura'],
    ['Batata, inglesa, frita', 'fritura'],
    ['Batata, frita, tipo chips, industrializada', 'fritura'],
    ['Pescada, filé, com farinha de trigo, frito', 'fritura'],
    ['Carne, bovina, almôndegas, fritas', 'fritura'],
    ['Coxinha de frango, frita', 'fritura'],
    ['Pastel, de queijo, cru', 'fritura'],
    ['Acarajé', 'fritura'],
    ['Bife à cavalo, com contra filé', 'fritura'],
    ['Caldo de carne, tablete', 'ultraprocessado'],
    ['Macarrão, instantâneo', 'ultraprocessado'],
    ['Cereais, mingau, milho, infantil', 'ultraprocessado'],
    ['Cereais, mistura para vitamina, trigo, cevada e aveia', 'ultraprocessado'],
    ['Farinha, láctea, de cereais', 'ultraprocessado'],
    ['Empada de frango, pré-cozida, assada', 'ultraprocessado'],
    ['Biscoito, polvilho doce', 'ultraprocessado'],
  ])('CA-651 e CA-652: "%s" fica fora da rotina (%s), com a chave ligada ou não', (d, id) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id, nivel: 'fora-da-rotina' })
    expect(ehPrescritivel(a)).toBe(false)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each([
    ['Café, pó, torrado', 'miscelanea'],
    ['Coentro, folhas desidratadas', 'po'],
    ['Farinha, de trigo', 'farinha'],
    ['Milho, amido, cru', 'farinha'],
    ['Milho, fubá, cru', 'farinha'],
    ['Soja, farinha', 'farinha'],
    ['Fécula, de mandioca', 'farinha'],
    ['Polvilho, doce', 'farinha'],
    ['Feijão, carioca, cru', 'cru'],
    ['Carne, bovina, fígado, cru', 'cru'],
    ['Frango, peito, sem pele, cru', 'cru'],
    ['Ovo, de galinha, inteiro, cru', 'cru'],
    ['Arroz, integral, cru', 'cru'],
    ['Salmão, sem pele, fresco, cru', 'cru'],
    ['Carne, bovina, almôndegas, cruas', 'cru'],
    ['Mandioca, crua', 'cru'],
    ['Batata, doce, crua', 'cru'],
    ['Batata, inglesa, crua', 'cru'],
    ['Cará, cru', 'cru'],
    ['Abóbora, cabotian, crua', 'cru'],
    ['Abóbora, moranga, crua', 'cru'],
    ['Dourada de água doce, fresca', 'cru'],
    ['Berinjela, crua', 'cru'],
    ['Chuchu, cru', 'cru'],
    ['Pão, de queijo, cru', 'cru'],
    ['Alfavaca, crua', 'tempero'],
    ['Alho, cru', 'tempero'],
    ['Manjericão, cru', 'tempero'],
    ['Salsa, crua', 'tempero'],
    ['Limão, tahiti, cru', 'tempero'],
    ['Tomate, extrato', 'tempero'],
    ['Tomate, molho industrializado', 'tempero'],
    ['Tucupi, com pimenta-de-cheiro', 'tempero'],
    ['Cuxá, molho', 'tempero'],
    ['Uva, suco concentrado, envasado', 'tempero'],
  ])('CA-652, CA-653 e CA-670: "%s" é forma de ingrediente (%s); só a chave libera', (d, id) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id, nivel: 'ingrediente' })
    expect(ehPrescritivel(a)).toBe(false)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(true)
  })

  it.each([
    'Café, infusão 10%',
    'Chá, mate, infusão 5%',
    'Coco, água de',
    'Laranja, pêra, suco',
    'Limão, galego, suco',
    'Iogurte, natural',
    'Queijo, requeijão, cremoso',
    'Queijo, pasteurizado',
    'Cuscuz, de milho, cozido com sal',
    'Bacalhau, salgado, refogado',
    'Sardinha, conserva em óleo',
    'Atum, conserva em óleo',
    'Palmito, juçara, em conserva',
    'Castanha-de-caju, torrada, salgada',
    'Castanha-do-Brasil, crua',
    'Omelete, de queijo',
    'Ovo, de galinha, inteiro, cozido/10minutos',
    'Batata, doce, cozida',
    'Couve, manteiga, refogada',
    'Alho-poró, cru',
    'Abobrinha, italiana, crua',
    'Abóbora, menina brasileira, crua',
    'Abóbora, pescoço, crua',
    // Re-revisão D-199a: a base só os traz crus, e a folha marca "(peso cru)".
    'Inhame, cru',
    'Vagem, crua',
    'Taioba, crua',
    'Fruta-pão, crua',
    'Jiló, cru',
    'Feijão, broto, cru',
    'Caruru, cru',
    'Quiabo, cru',
    'Pequi, cru',
    'Maxixe, cru',
    'Mostarda, folha, crua',
    'Salmão, sem pele, fresco, grelhado',
    'Cenoura, crua',
    'Acerola, crua',
    'Açaí, polpa, congelada',
    'Aveia, flocos, crua',
    'Farinha, de mandioca, torrada',
    'Feijão, carioca, cozido',
    'Carne, bovina, fígado, grelhado',
    'Quibe, assado',
  ])('seção 2.1 e CA-670: "%s" é prescritível', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toBeNull()
    expect(ehPrescritivel(a)).toBe(true)
  })

  it('CA-670: verdura ou fruta crua só sai quando a base tem a versão cozida do mesmo alimento', () => {
    const verdurasEFrutasCruasQueSaem = ALIMENTOS.filter(
      (a) => (a.categoria.startsWith('Verduras') || a.categoria.startsWith('Frutas')) && regraQueExclui(a)?.id === 'cru',
    )
    expect(verdurasEFrutasCruasQueSaem.length).toBeGreaterThan(0)
    for (const cru of verdurasEFrutasCruasQueSaem) {
      // "Batata, inglesa, crua" → "batata, inglesa,": a versão cozida tem o mesmo começo e outro preparo.
      const comeco = cru.descricao.trim().replace(/[^,]+$/, '').toLowerCase()
      const cozida = ALIMENTOS.find((b) => b.id !== cru.id && b.descricao.trim().toLowerCase().startsWith(comeco) && b.preparo !== 'cru')
      expect(cozida?.descricao, cru.descricao).toBeDefined()
    }
  })

  it('CA-664: os motivos, na ordem e com o título do Apêndice A', () => {
    expect(REGRAS_PRESCRICAO.map((r) => [r.id, r.nivel, r.titulo])).toEqual([
      ['alcool', 'nunca', 'Bebida alcoólica'],
      ['sal-e-fermento', 'nunca', 'Sal, shoyu, tempero pronto ou fermento'],
      ['gordura-trans', 'nunca', 'Gordura trans (hidrogenada)'],
      ['bebida-adocada', 'fora-da-rotina', 'Refrigerante, isotônico ou bebida adoçada'],
      ['doce', 'fora-da-rotina', 'Doce, açúcar ou fruta em calda'],
      ['gordura', 'fora-da-rotina', 'Óleo ou gordura de adição'],
      ['embutido', 'fora-da-rotina', 'Embutido, carne processada ou curada'],
      ['prato-com-embutido', 'fora-da-rotina', 'Prato com embutido, toucinho, carne curada ou miúdos'],
      ['fritura', 'fora-da-rotina', 'Fritura ou salgado frito'],
      ['ultraprocessado', 'fora-da-rotina', 'Ultraprocessado, salgadinho ou petisco em conserva'],
      ['preparacao', 'fora-da-rotina', 'Preparação que raramente se prescreve assim'],
      ['miscelanea', 'ingrediente', 'Ingrediente da categoria Miscelâneas (café em pó)'],
      ['po', 'ingrediente', 'Produto em pó ou desidratado'],
      ['farinha', 'ingrediente', 'Farinha, amido ou fécula de uso culinário'],
      ['cru', 'ingrediente', 'Versão crua de alimento que se come cozido'],
      ['tempero', 'ingrediente', 'Tempero, molho ou concentrado'],
    ])
  })

  it('CA-664: a contagem por motivo é a do Apêndice A', () => {
    const contagem: Record<string, number> = {}
    for (const a of ALIMENTOS) {
      const regra = regraQueExclui(a)
      if (regra) contagem[regra.id] = (contagem[regra.id] ?? 0) + 1
    }
    expect(contagem).toEqual({
      alcool: 2,
      'sal-e-fermento': 6,
      'gordura-trans': 3,
      'bebida-adocada': 10,
      doce: 50,
      gordura: 18,
      embutido: 18,
      'prato-com-embutido': 3,
      fritura: 30,
      ultraprocessado: 12,
      preparacao: 4,
      miscelanea: 1,
      po: 3,
      farinha: 11,
      cru: 97,
      tempero: 14,
    })
    expect(Object.values(contagem).reduce((x, y) => x + y, 0)).toBe(282)
    expect(ALIMENTOS).toHaveLength(597)
  })

  it('CA-664: os ids por motivo são os do Apêndice A (lista fixa, não só a contagem)', () => {
    const porMotivo: Record<string, number[]> = {}
    for (const a of ALIMENTOS) {
      const regra = regraQueExclui(a)
      if (regra) (porMotivo[regra.id] ??= []).push(a.id)
    }
    expect(porMotivo).toEqual(IDS_POR_MOTIVO)
  })

  it('CA-667: a trava de texto pega todos os ids da lista fixa (revisão N5)', () => {
    const FORMA = new Set(['miscelanea', 'po', 'farinha', 'cru', 'tempero'])
    for (const [motivo, ids] of Object.entries(IDS_POR_MOTIVO)) {
      const trava = FORMA.has(motivo) ? FORMA_DE_INGREDIENTE : NUNCA_APARECE
      for (const id of ids) {
        const nome = (ALIMENTOS.find((a) => a.id === id)?.descricao ?? '').trim().replace(/\s+/g, ' ')
        expect(nome, `${motivo} ${id}`).toMatch(trava)
      }
    }
  })

  it.each([
    ['  Mortadela', 'Carnes e derivados', 'embutido'],
    [' Ameixa,  calda, enlatada ', 'Frutas e derivados', 'doce'],
    ['  Refrigerante,   tipo cola', 'Bebidas (alcoólicas e não alcoólicas)', 'bebida-adocada'],
    ['  Farinha,  de trigo', 'Cereais e derivados', 'farinha'],
    [' Alho,  cru', 'Verduras, hortaliças e derivados', 'tempero'],
  ])('CA-677: espaço nas pontas ou repetido não muda a regra ("%s")', (descricao, categoria, id) => {
    expect(regraQueExclui({ descricao, categoria, preparo: null })?.id).toBe(id)
  })

  it('CA-677: a farinha de mandioca torrada continua prescritível com espaço sobrando', () => {
    expect(regraQueExclui({ descricao: ' Farinha,  de mandioca, torrada ', categoria: 'Verduras, hortaliças e derivados', preparo: 'torrado' })).toBeNull()
  })

  it('o nível mais grave vale primeiro: cerveja antes de tudo, fritura antes de cru', () => {
    // "Pastel, de carne, cru" é cru e é salgado de fritar: vale o motivo que a chave não libera.
    expect(regraQueExclui(porDescricao('Pastel, de carne, cru'))?.id).toBe('fritura')
    // "Lingüiça, frango, crua" é cru e é embutido.
    expect(regraQueExclui(porDescricao('Lingüiça, frango, crua'))?.id).toBe('embutido')
  })
})

describe('a conduta da nutricionista (spec conduta-da-nutricionista)', () => {
  const LIBERADOS = [
    'Azeite, de oliva, extra virgem',
    'Mel, de abelha',
    'Chocolate, meio amargo',
    'Leite, fermentado',
    'Cereal matinal, milho',
    'Carne, bovina, charque, cozido',
    'Carne, bovina, seca, cozida',
    'Azeitona, preta, conserva',
    'Azeitona, verde, conserva',
    'Tremoço, em conserva',
    'Ovo, de galinha, inteiro, frito',
    'Feijoada',
    'Baião de dois, arroz e feijão-de-corda',
    'Barreado',
    'Dobradinha',
    'Maniçoba',
    'Sarapatel',
    'Farinha, de mandioca, crua',
    'Leite, de vaca, integral, pó',
    'Leite, de vaca, desnatado, pó',
  ]

  it.each(LIBERADOS)('CA-910: "%s" volta a ser proposto, com a chave ligada ou desligada', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toBeNull()
    expect(ehPrescritivel(a)).toBe(true)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(true)
  })

  it.each([
    ['Azeite, de dendê', 'gordura'],
    ['Cereal matinal, milho, açúcar', 'doce'],
    ['Carne, bovina, charque, cru', 'embutido'],
    ['Carne, bovina, seca, crua', 'embutido'],
    ['Feijão tropeiro mineiro', 'prato-com-embutido'],
    ['Virado à paulista', 'prato-com-embutido'],
    ['Arroz carreteiro', 'prato-com-embutido'],
  ])('CA-910: o parente que a parceira não liberou continua fora ("%s", %s)', (d, id) => {
    expect(regraQueExclui(porDescricao(d))?.id).toBe(id)
  })

  it('CA-910: o nome é limpo antes de comparar, como no resto da regra', () => {
    expect(regraQueExclui({ descricao: '  Mel,  de abelha ', categoria: 'Produtos açucarados', preparo: null })).toBeNull()
  })

  it.each(['Tapioca, com manteiga', 'Pão, de queijo, assado', 'Pipoca, com óleo de soja, sem sal', 'Biscoito, salgado, cream cracker'])(
    'CA-911: "%s" é preparação que raramente se prescreve assim; a chave não a traz',
    (d) => {
      const a = porDescricao(d)
      expect(regraQueExclui(a)).toMatchObject({ id: 'preparacao', nivel: 'fora-da-rotina', titulo: 'Preparação que raramente se prescreve assim' })
      expect(ehPrescritivel(a)).toBe(false)
      expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
    },
  )

  it('CA-911: o pão de queijo cru continua forma de ingrediente', () => {
    expect(regraQueExclui(porDescricao('Pão, de queijo, cru'))?.id).toBe('cru')
  })

  it.each([
    'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)',
    'Margarina, com óleo hidrogenado, sem sal (80% de lipídeos)',
    'Chantilly, spray, com gordura vegetal',
  ])('CA-912: "%s" é gordura trans: nunca, nem com a chave ligada', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id: 'gordura-trans', nivel: 'nunca' })
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each(LIBERADOS.filter((d) => d !== 'Farinha, de mandioca, crua'))('CA-914: "%s" é segunda escolha (D-293)', (d) => {
    expect(ehSegundaEscolha(porDescricao(d))).toBe(true)
  })

  it('CA-914: corte gordo e ave com pele também são segunda escolha; magro, in natura e a farinha d\'água, não', () => {
    expect(ehSegundaEscolha(porDescricao('Carne, bovina, picanha, com gordura, grelhada'))).toBe(true)
    expect(ehSegundaEscolha(porDescricao('Frango, coxa, com pele, assada'))).toBe(true)
    for (const d of ['Farinha, de mandioca, crua', 'Carne, bovina, patinho, sem gordura, grelhado', 'Feijão, carioca, cozido', 'Banana, prata, crua']) {
      expect(ehSegundaEscolha(porDescricao(d)), d).toBe(false)
    }
  })

  it('CA-912: qualquer nome que diga "hidrogenada" é trans; a margarina interesterificada continua gordura de adição', () => {
    expect(regraQueExclui({ descricao: 'Gordura vegetal hidrogenada', categoria: 'Gorduras e óleos', preparo: null })?.id).toBe('gordura-trans')
    expect(regraQueExclui({ descricao: 'Biscoito, com óleo hidrogenado', categoria: 'Cereais e derivados', preparo: null })?.id).toBe('gordura-trans')
    expect(regraQueExclui(porDescricao('Margarina, com óleo interesterificado, sem sal (65% de lipídeos)'))).toMatchObject({ id: 'gordura', nivel: 'fora-da-rotina' })
  })
})

describe('uso comum (D-197)', () => {
  it('jurubeba e jamelão, que só uma região conhece, perdem a frente', () => {
    expect(ehDeUsoComum(porDescricao('Jurubeba, crua'))).toBe(false)
    expect(ehDeUsoComum(porDescricao('Jamelão, cru'))).toBe(false)
    expect(ehDeUsoComum(porDescricao('Banana, prata, crua'))).toBe(true)
  })

  it('CA-676: miolo de alcatra (corte magro) e linhaça são de uso comum; o miolo de boi, não', () => {
    expect(ehDeUsoComum(porDescricao('Carne, bovina, miolo de alcatra, sem gordura, grelhado'))).toBe(true)
    expect(ehDeUsoComum(porDescricao('Linhaça, semente'))).toBe(true)
    expect(ehDeUsoComum({ descricao: 'Carne, bovina, miolo, cozido' })).toBe(false)
  })
})

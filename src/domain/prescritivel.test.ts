import { ehDeUsoComum, ehPrescritivel, REGRAS_PRESCRICAO, regraQueExclui } from './prescritivel.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

// A TACO tem descrições com espaço sobrando nas pontas ("Couve, manteiga, refogada ").
const porDescricao = (d: string): Alimento => {
  const a = ALIMENTOS.find((x) => x.descricao.trim() === d)
  if (!a) throw new Error(`Alimento "${d}" não existe na tabela.`)
  return a
}

describe('regra "prescritível" (spec sugestoes-com-criterio)', () => {
  it.each(['Cerveja, pilsen 2', 'Cana, aguardente 1'])('CA-650: "%s" nunca é proposto, nem com a chave ligada', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id: 'alcool', nivel: 'nunca' })
    expect(ehPrescritivel(a)).toBe(false)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each([
    ['Refrigerante, tipo cola', 'bebida-adocada'],
    ['Refrigerante, tipo água tônica', 'bebida-adocada'],
    ['Bebida isotônica, sabores variados', 'bebida-adocada'],
    ['Cana, caldo de', 'bebida-adocada'],
    ['Bebida láctea, pêssego', 'bebida-adocada'],
    ['Leite, fermentado', 'bebida-adocada'],
    ['Leite, de vaca, achocolatado', 'bebida-adocada'],
    ['Doce, de leite, cremoso', 'doce'],
    ['Mel, de abelha', 'doce'],
    ['Chocolate, meio amargo', 'doce'],
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
    ['Óleo, de soja', 'gordura'],
    ['Azeite, de oliva, extra virgem', 'gordura'],
    ['Margarina, com óleo hidrogenado, com sal (65% de lipídeos)', 'gordura'],
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
    ['Carne, bovina, charque, cozido', 'embutido'],
    ['Carne, bovina, seca, cozida', 'embutido'],
    ['Feijoada', 'embutido'],
    ['Feijão tropeiro mineiro', 'embutido'],
    ['Arroz carreteiro', 'embutido'],
    ['Ovo, de galinha, inteiro, frito', 'fritura'],
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
    ['Cereal matinal, milho', 'ultraprocessado'],
    ['Cereais, mingau, milho, infantil', 'ultraprocessado'],
    ['Cereais, mistura para vitamina, trigo, cevada e aveia', 'ultraprocessado'],
    ['Farinha, láctea, de cereais', 'ultraprocessado'],
    ['Empada de frango, pré-cozida, assada', 'ultraprocessado'],
    ['Biscoito, polvilho doce', 'ultraprocessado'],
    ['Azeitona, preta, conserva', 'ultraprocessado'],
    ['Tremoço, em conserva', 'ultraprocessado'],
  ])('CA-651 e CA-652: "%s" fica fora da rotina (%s), com a chave ligada ou não', (d, id) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toMatchObject({ id, nivel: 'fora-da-rotina' })
    expect(ehPrescritivel(a)).toBe(false)
    expect(ehPrescritivel(a, { incluirIngredientes: true })).toBe(false)
  })

  it.each([
    ['Café, pó, torrado', 'miscelanea'],
    ['Sal, grosso', 'miscelanea'],
    ['Fermento, biológico, levedura, tablete', 'miscelanea'],
    ['Coentro, folhas desidratadas', 'po'],
    ['Leite, de vaca, desnatado, pó', 'po'],
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
    ['Abóbora, menina brasileira, crua', 'cru'],
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
  ])('CA-652 e CA-653: "%s" é forma de ingrediente (%s); só a chave libera', (d, id) => {
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
    'Tapioca, com manteiga',
    'Pão, de queijo, assado',
    'Bacalhau, salgado, refogado',
    'Sardinha, conserva em óleo',
    'Atum, conserva em óleo',
    'Palmito, juçara, em conserva',
    'Biscoito, salgado, cream cracker',
    'Pipoca, com óleo de soja, sem sal',
    'Castanha-de-caju, torrada, salgada',
    'Castanha-do-Brasil, crua',
    'Omelete, de queijo',
    'Ovo, de galinha, inteiro, cozido/10minutos',
    'Batata, doce, cozida',
    'Couve, manteiga, refogada',
    'Alho-poró, cru',
    'Abobrinha, italiana, crua',
    'Inhame, cru',
    'Cenoura, crua',
    'Acerola, crua',
    'Açaí, polpa, congelada',
    'Aveia, flocos, crua',
    'Farinha, de mandioca, torrada',
    'Feijão, carioca, cozido',
    'Carne, bovina, fígado, grelhado',
    'Quibe, assado',
  ])('seção 2.1: "%s" é prescritível', (d) => {
    const a = porDescricao(d)
    expect(regraQueExclui(a)).toBeNull()
    expect(ehPrescritivel(a)).toBe(true)
  })

  it('CA-664: os motivos, na ordem e com o título do Apêndice A', () => {
    expect(REGRAS_PRESCRICAO.map((r) => [r.id, r.nivel, r.titulo])).toEqual([
      ['alcool', 'nunca', 'Bebida alcoólica'],
      ['bebida-adocada', 'fora-da-rotina', 'Refrigerante, isotônico ou bebida adoçada'],
      ['doce', 'fora-da-rotina', 'Doce, açúcar ou fruta em calda'],
      ['gordura', 'fora-da-rotina', 'Óleo ou gordura de adição'],
      ['embutido', 'fora-da-rotina', 'Embutido, carne processada ou curada'],
      ['fritura', 'fora-da-rotina', 'Fritura ou salgado frito'],
      ['ultraprocessado', 'fora-da-rotina', 'Ultraprocessado, salgadinho ou petisco em conserva'],
      ['miscelanea', 'ingrediente', 'Tempero, sal, fermento ou pó (Miscelâneas)'],
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
      'bebida-adocada': 10,
      doce: 51,
      gordura: 22,
      embutido: 24,
      fritura: 31,
      ultraprocessado: 13,
      miscelanea: 9,
      po: 7,
      farinha: 13,
      cru: 98,
      tempero: 14,
    })
    expect(Object.values(contagem).reduce((x, y) => x + y, 0)).toBe(294)
    expect(ALIMENTOS).toHaveLength(597)
  })

  it('o nível mais grave vale primeiro: cerveja antes de tudo, fritura antes de cru', () => {
    // "Pastel, de carne, cru" é cru e é salgado de fritar: vale o motivo que a chave não libera.
    expect(regraQueExclui(porDescricao('Pastel, de carne, cru'))?.id).toBe('fritura')
    // "Lingüiça, frango, crua" é cru e é embutido.
    expect(regraQueExclui(porDescricao('Lingüiça, frango, crua'))?.id).toBe('embutido')
  })
})

describe('uso comum (D-197)', () => {
  it('jurubeba e jamelão, que só uma região conhece, perdem a frente', () => {
    expect(ehDeUsoComum(porDescricao('Jurubeba, crua'))).toBe(false)
    expect(ehDeUsoComum(porDescricao('Jamelão, cru'))).toBe(false)
    expect(ehDeUsoComum(porDescricao('Banana, prata, crua'))).toBe(true)
  })
})

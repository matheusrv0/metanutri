import {
  buscarAlimentos,
  formatarQuantidadeMedida,
  interpretarEntrada,
  leituraDoResultado,
  MEDIDAS,
  MEDIDAS_DE_CONTAR,
  medidaCaseiraParaPaciente,
  medidaDeContar,
  medidaEquivalente,
  medidaParaMostrar,
  medidaPedida,
  PRIMEIRO_ID_PROPRIO,
  registrarMedidasProprias,
  variantesDoTermo,
} from './busca.ts'
import { CONSUMO_POF } from './consumoPof.ts'
import { ehLiquido } from './liquido.ts'
import { PRIMEIRO_ID_PRODUTO } from './produtos.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

describe('interpretarEntrada', () => {
  it.each([
    ['150 arroz int', { quantidade: 150, medida: null, termos: ['arroz', 'int'] }],
    ['150g arroz', { quantidade: 150, medida: null, unidade: 'g', termos: ['arroz'] }],
    ['150 g de arroz', { quantidade: 150, medida: null, unidade: 'g', termos: ['arroz'] }],
    ['arroz integral', { quantidade: null, medida: null, termos: ['arroz', 'integral'] }],
    ['68,5 frango', { quantidade: 68.5, medida: null, termos: ['frango'] }],
    ['2 colher de sopa arroz', { quantidade: 2, medida: 'colher de sopa', termos: ['arroz'] }],
    ['2 colheres de sopa de arroz', { quantidade: 2, medida: 'colher de sopa', termos: ['arroz'] }],
    ['1 concha feijão', { quantidade: 1, medida: 'concha', termos: ['feijao'] }],
    ['3 conchas de feijao', { quantidade: 3, medida: 'concha', termos: ['feijao'] }],
    ['1/2 unidade banana prata', { quantidade: 0.5, medida: 'unidade', termos: ['banana', 'prata'] }],
    ['2 fatias queijo minas', { quantidade: 2, medida: 'fatia', termos: ['queijo', 'minas'] }],
    ['1 xícara de chá leite', { quantidade: 1, medida: 'xícara de chá', termos: ['leite'] }],
    ['2 pedaços mandioca', { quantidade: 2, medida: 'pedaço', termos: ['mandioca'] }],
    ['colher de sopa arroz', { quantidade: 1, medida: 'colher de sopa', termos: ['arroz'] }],
  ] as const)('"%s"', (texto, esperado) => {
    expect(interpretarEntrada(texto)).toEqual({ unidade: null, ...esperado })
  })

  it('conhece as medidas cadastradas nas medidas caseiras', () => {
    expect(MEDIDAS).toContain('colher de servir')
    expect(MEDIDAS).toContain('escumadeira')
  })
})

describe('buscarAlimentos', () => {
  it('CA-15: devolve até 5 alimentos com todas as palavras, sem diferenciar acento nem maiúsculas', () => {
    const r = buscarAlimentos('150 ARROZ INT', ALIMENTOS)
    expect(r.resultados.length).toBeGreaterThan(0)
    expect(r.resultados.length).toBeLessThanOrEqual(5)
    for (const x of r.resultados) expect(x.alimento.descricao.toLowerCase()).toMatch(/arroz.*integral/)
    expect(buscarAlimentos('feijao carioca cozido', ALIMENTOS).resultados[0]?.alimento.descricao).toBe('Feijão, carioca, cozido')
  })

  it('CA-16: a quantidade digitada vem preenchida em gramas', () => {
    const r = buscarAlimentos('150 arroz integral cozido', ALIMENTOS)
    expect(r.resultados[0]).toMatchObject({ gramas: 150, medida: null })
    expect(r.resultados[0]?.alimento.descricao).toBe('Arroz, integral, cozido')
  })

  it('CA-17: sem quantidade, usa 100 g', () => {
    expect(buscarAlimentos('banana prata', ALIMENTOS).resultados[0]?.gramas).toBe(100)
  })

  it('CA-18: converte medida caseira em gramas e mostra a conversão', () => {
    const r = buscarAlimentos('2 colheres de sopa de arroz tipo 1 cozido', ALIMENTOS)
    const arroz = r.resultados[0]
    expect(arroz?.alimento.descricao).toBe('Arroz, tipo 1, cozido')
    expect(arroz?.medida).toEqual({ nome: 'colher de sopa', quantidade: 2, gramasPorMedida: 25 })
    expect(arroz?.gramas).toBe(50)
  })

  it('CA-18: meia unidade de banana prata = 37,5 g', () => {
    const r = buscarAlimentos('1/2 unidade banana prata', ALIMENTOS)
    expect(r.resultados[0]?.gramas).toBe(37.5)
  })

  it('CA-18: com medida, alimentos que têm essa medida aparecem primeiro', () => {
    const r = buscarAlimentos('1 concha feijao', ALIMENTOS)
    expect(r.resultados[0]?.medida?.nome).toBe('concha')
    expect(r.resultados[0]?.gramas).toBe(140)
  })

  it('CB-07: medida que não existe para o alimento pede gramas e não inventa conversão', () => {
    const r = buscarAlimentos('2 colheres de sopa macarrão', ALIMENTOS)
    const macarrao = r.resultados.find((x) => x.alimento.descricao === 'Macarrão, trigo, cru')
    expect(macarrao).toMatchObject({ gramas: null, medida: null, faltaMedida: { nome: 'colher de sopa', quantidade: 2 } })
    // D-432 (correção A): o aviso diz o que falta e as medidas que há (o macarrão cru não tem nenhuma).
    expect(macarrao?.aviso).toBe('Sem “colher de sopa” e sem outra medida cadastrada')
  })

  it('CA-20: sem correspondência, não devolve nada e explica', () => {
    const r = buscarAlimentos('150 xyzabc', ALIMENTOS)
    expect(r.resultados).toEqual([])
    expect(r.aviso).toMatch(/Nenhum alimento/)
  })

  it.each([
    ['350 cerveja', 'Cerveja, pilsen 2'],
    ['30 doce de leite', 'Doce, de leite, cremoso'],
    ['5 margarina', 'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)'],
  ])('CA-663: a busca não filtra o que o cobrir não propõe ("%s")', (texto, esperado) => {
    const { resultados } = buscarAlimentos(texto, ALIMENTOS)
    expect(resultados.map((r) => r.alimento.descricao)).toContain(esperado)
  })

  it('texto vazio não busca', () => {
    expect(buscarAlimentos('   ', ALIMENTOS)).toEqual({ resultados: [], aviso: null })
    expect(buscarAlimentos('150', ALIMENTOS).resultados).toEqual([])
  })

  it('CA-21: responde bem abaixo de 200 ms com a base completa', () => {
    const consultas = ['150 arroz int', '2 colheres de sopa de feijao', 'frango peito grelhado', '1 unidade banana', 'queijo', 'x']
    const inicio = performance.now()
    for (let i = 0; i < 20; i++) for (const q of consultas) buscarAlimentos(q, ALIMENTOS)
    const media = (performance.now() - inicio) / (20 * consultas.length)
    expect(media).toBeLessThan(200)
  })
})

describe('formatarQuantidadeMedida', () => {
  it.each([
    [1, 'unidade', '1 unidade'],
    [2, 'unidade', '2 unidades'],
    [0.5, 'unidade', 'meia unidade'],
    [1.5, 'concha', '1 concha e meia'],
    [2.5, 'fatia', '2 fatias e meia'],
    [1.5, 'pedaço', '1 pedaço e meio'],
    [6, 'colher de sopa', '6 colheres de sopa'],
    [0.5, 'pedaço', 'meio pedaço'],
    [2, 'copo americano', '2 copos americanos'],
    [3, 'unidade pequena', '3 unidades pequenas'],
    [2, 'filé', '2 filés'],
    [2, 'xícara de chá', '2 xícaras de chá'],
    [2, 'copo de requeijão', '2 copos de requeijão'],
  ] as const)('%f %s -> %s', (q, medida, texto) => {
    expect(formatarQuantidadeMedida(q, medida)).toBe(texto)
  })
})

describe('medidaEquivalente (CA-19)', () => {
  it.each([
    [3, 150, '6 colheres de sopa', 150], // arroz tipo 1 cozido: colher de sopa 25 g
    [561, 140, '1 concha', 140], // feijão carioca: concha 140 g
    [182, 75, '1 unidade', 75], // banana prata: unidade 75 g
    [182, 150, '2 unidades', 150],
    [410, 100, '1 bife', 100], // frango peito grelhado: bife 100 g
    [461, 45, '1 fatia', 45], // queijo minas: fatia 45 g
  ] as const)('alimento %i com %i g = %s', (id, gramas, texto, equivalente) => {
    expect(medidaEquivalente(id, gramas)).toMatchObject({ texto, gramasEquivalentes: equivalente })
  })

  it('usa meia medida quando fica mais perto', () => {
    expect(medidaEquivalente(182, 37)?.texto).toBe('meia unidade')
  })

  it('não inventa medida quando nenhuma fica perto (erro acima de 15%)', () => {
    expect(medidaEquivalente(461, 100)).toMatchObject({ texto: '2 fatias' }) // 90 g, 10% de erro
    expect(medidaEquivalente(461, 1000)).toBeNull() // exigiria mais de 8 fatias
  })

  it('alimento sem medidas ou quantidade zero não tem equivalente', () => {
    expect(medidaEquivalente(40, 100)).toBeNull() // macarrão cru
    expect(medidaEquivalente(3, 0)).toBeNull()
  })
})

describe('medidaParaMostrar (spec revisao-geral-trabalho, D-242)', () => {
  const MANTEIGA = 261
  const MARGARINA = 263
  const GORDURAS = [261, 262, 263, 264, 265, 266]
  const BANANA_PRATA = 182

  it.each([
    [2.5, 'meia ponta de faca'],
    [5, '1 ponta de faca'],
    [7.5, '1 ponta de faca e meia'],
    [10, '2 pontas de faca'],
    [15, '3 pontas de faca'],
  ] as const)('CA-779: margarina e manteiga com %s g = %s', (gramas, texto) => {
    expect(medidaParaMostrar(MARGARINA, gramas)?.texto).toBe(texto)
    expect(medidaParaMostrar(MANTEIGA, gramas)?.texto).toBe(texto)
  })

  it('CA-780: manteiga e margarina nunca saem em fatia; 23 g é "1 colher de sobremesa"', () => {
    // Correção C (D-483): a colher de sopa cheia de 32 g da POF saiu (gordura com colher de sopa até 30 g).
    expect(medidaParaMostrar(MANTEIGA, 23)?.texto).toBe('1 colher de sobremesa')
    expect(medidaParaMostrar(MARGARINA, 23)?.texto).toBe('1 colher de sobremesa')
    for (const id of GORDURAS) {
      for (let gramas = 1; gramas <= 300; gramas += 1) expect(medidaParaMostrar(id, gramas)?.medida).not.toBe('fatia')
    }
  })

  it('CB-244: acima de 3 pontas de faca vale a medida comum, sem fatia; o que nenhuma medida alcança fica sem medida', () => {
    expect(medidaParaMostrar(MARGARINA, 24)?.texto).toBe('3 colheres de chá')
    expect(medidaParaMostrar(MARGARINA, 2000)).toBeNull()
  })

  it('CA-781 (com a D-295 da conduta-da-nutricionista): mais de 4 pedaços dá lugar a outra medida que sirva; até 4, aparece', () => {
    // Antes da conduta, 130 g de banana saíam sem medida; a parceira pediu a medida de contar que serve.
    expect(medidaParaMostrar(BANANA_PRATA, 130)?.texto).toBe('1 unidade e meia')
    // D-423 (spec alimentos-e-gramaturas, seção 6): a banana prata não se lê mais em fatia; 104 g é 1 unidade e meia.
    expect(medidaParaMostrar(BANANA_PRATA, 104)?.texto).toBe('1 unidade e meia')
    expect(medidaParaMostrar(3, 150)?.texto).toBe('6 colheres de sopa')
  })

  it('a medida do planejador na busca (medidaEquivalente) continua a de antes (R-182)', () => {
    expect(medidaEquivalente(MARGARINA, 5)).toBeNull()
    // Desde a correção A (D-430), a gordura não tem mais a "fatia" de 32 g da POF; desde a C (D-483), nem a colher de
    // sopa cheia de 32 g: 23 g é 1 colher de sobremesa.
    expect(medidaEquivalente(MANTEIGA, 23)?.texto).toBe('1 colher de sobremesa')
    // D-423: a fruta pequena só em unidade, também no planejador (eram "5 fatias").
    expect(medidaEquivalente(BANANA_PRATA, 130)?.texto).toBe('1 unidade e meia')
  })
})

describe('medida caseira para o paciente (spec conduta-da-nutricionista, D-295 e D-297)', () => {
  it('prefere uma medida de até 4 unidades ou pedaços quando outra medida do alimento serve', () => {
    // Ovo frito, 55 g: era "5 fatias e meia" no planejador; desde a correção A (D-430) o ovo frito só tem a unidade.
    expect(medidaEquivalente(490, 55)?.texto).toBe('1 unidade')
    expect(medidaCaseiraParaPaciente(490, 55)?.texto).toBe('1 unidade')
    // Banana prata, 130 g: "5 fatias" vira "1 unidade e meia".
    expect(medidaCaseiraParaPaciente(182, 130)?.texto).toBe('1 unidade e meia')
  })

  it('sem outra medida que sirva, fica a do planejador, mesmo com mais de 4 pedaços', () => {
    // Torrada: só a unidade de 8 g serve para 56 g.
    expect(medidaCaseiraParaPaciente(63, 56)).toEqual(medidaEquivalente(63, 56))
    expect(medidaCaseiraParaPaciente(63, 56)?.texto).toBe('7 unidades')
  })

  it('com até 4 pedaços, é a mesma do planejador', () => {
    expect(medidaCaseiraParaPaciente(3, 150)).toEqual(medidaEquivalente(3, 150))
    // D-423: a maçã de 130 g era "3 fatias e meia"; D-484 (correção C): nem "1 unidade pequena e meia".
    expect(medidaCaseiraParaPaciente(222, 130)?.texto).toBe('1 unidade')
    expect(medidaCaseiraParaPaciente(40, 100)).toBeNull()
  })

  it('D-431 (correção A): a folha crua sai em folhas, o milho de lata em colheres, a manga Palmer em gramas', () => {
    expect(medidaParaMostrar(78, 30)?.texto).toBe('3 folhas') // Alface, crespa, crua
    expect(medidaParaMostrar(80, 200)?.medida).not.toBe('unidade') // Alface roxa: nunca "1 unidade · 200 g"
    expect(medidaParaMostrar(45, 48)?.texto).toBe('2 colheres de sopa') // Milho enlatado: nunca "unidade"
    expect(medidaParaMostrar(229, 198)).toBeNull() // Manga Palmer: sem colher de servir
  })

  it('as medidas de contar são as de unidade e pedaço', () => {
    expect([...MEDIDAS_DE_CONTAR].sort()).toEqual(
      ['banda', 'bife', 'coxa', 'fatia', 'filé', 'gomo', 'metade', 'pedaço', 'peito', 'posta', 'rodela', 'sobrecoxa', 'unidade', 'unidade pequena'].sort(),
    )
  })
})

describe('entrada rápida que acerta (spec alimentos-e-gramaturas)', () => {
  it('D-372: palavras, frações, "e meia", ml, litro e nome curto da medida', () => {
    expect(interpretarEntrada('meia xícara de aveia')).toEqual({ quantidade: 0.5, medida: 'xícara', unidade: null, termos: ['aveia'] })
    expect(interpretarEntrada('duas conchas de feijão')).toMatchObject({ quantidade: 2, medida: 'concha', termos: ['feijao'] })
    expect(interpretarEntrada('três ovos')).toMatchObject({ quantidade: 3, medida: null, termos: ['ovos'] })
    expect(interpretarEntrada('1½ concha de feijão')).toMatchObject({ quantidade: 1.5, medida: 'concha' })
    expect(interpretarEntrada('uma e meia concha de feijão')).toMatchObject({ quantidade: 1.5, medida: 'concha' })
    expect(interpretarEntrada('3/4 xícara de leite')).toMatchObject({ quantidade: 0.75, medida: 'xícara', termos: ['leite'] })
    expect(interpretarEntrada('100 ml de leite')).toEqual({ quantidade: 100, medida: null, unidade: 'ml', termos: ['leite'] })
    expect(interpretarEntrada('1,5 litro de leite')).toMatchObject({ quantidade: 1500, unidade: 'ml', termos: ['leite'] })
    expect(interpretarEntrada('2 copos de leite')).toMatchObject({ quantidade: 2, medida: 'copo', termos: ['leite'] })
    expect(interpretarEntrada('1 colher de sopa de azeite')).toMatchObject({ medida: 'colher de sopa', termos: ['azeite'] })
  })

  it('a última palavra da medida também é o alimento quando nada sobra ("1 xícara de café")', () => {
    expect(interpretarEntrada('1 xícara de café')).toMatchObject({ medida: 'xícara de café', termos: ['cafe'] })
  })

  it('o plural do alimento acha o singular', () => {
    expect(variantesDoTermo('ovos')).toEqual(['ovos', 'ovo'])
    expect(variantesDoTermo('paes')).toEqual(['paes', 'pao'])
    expect(variantesDoTermo('limoes')).toEqual(['limoes', 'limao'])
    expect(variantesDoTermo('pasteis')).toEqual(['pasteis', 'pastel'])
    expect(variantesDoTermo('nozes')).toEqual(['nozes', 'noz'])
    expect(variantesDoTermo('arroz')).toEqual(['arroz'])
  })

  it('D-371: abaixo de 20 conta unidades só quando o alimento tem medida de contar', () => {
    expect(medidaDeContar(182)).toEqual({ nome: 'unidade', gramas: 75 })
    expect(medidaDeContar(3)).toBeNull()
    expect(buscarAlimentos('19 banana prata', ALIMENTOS).resultados[0]).toMatchObject({ gramas: 1425, medida: { nome: 'unidade', quantidade: 19 } })
    expect(buscarAlimentos('20 banana prata', ALIMENTOS).resultados[0]).toMatchObject({ gramas: 20, medida: null })
  })

  it('o nome curto só vale quando o alimento tem a medida', () => {
    expect(medidaPedida(458, 'copo')?.nome).toBe('copo americano')
    expect(medidaPedida(7, 'xícara')).toBeNull()
    expect(medidaPedida(3, 'colher')?.nome).toBe('colher de sopa')
  })

  it('CA-1111: o alimento mais usado pela conta vem primeiro', () => {
    const uso = new Map([[1, 4]])
    expect(buscarAlimentos('150 arroz', ALIMENTOS, { uso }).resultados[0]?.alimento.descricao).toBe('Arroz, integral, cozido')
  })

  it('o alimento próprio vem antes da base no empate de uso', () => {
    const proprio = { ...(ALIMENTOS[2] as Alimento), id: PRIMEIRO_ID_PRODUTO, descricao: 'Arroz da casa' }
    expect(buscarAlimentos('150 arroz', [...ALIMENTOS, proprio]).resultados[0]?.alimento.id).toBe(PRIMEIRO_ID_PRODUTO)
    expect(PRIMEIRO_ID_PROPRIO).toBe(PRIMEIRO_ID_PRODUTO)
  })

  it('D-373: a leitura escreve como a folha', () => {
    expect(leituraDoResultado({ gramas: 210, medida: { nome: 'concha', quantidade: 1.5, gramasPorMedida: 140 }, unidade: 'g' })).toBe('1 concha e meia · 210 g')
    expect(leituraDoResultado({ gramas: 37.5, medida: { nome: 'unidade', quantidade: 0.5, gramasPorMedida: 75 }, unidade: 'g' })).toBe('meia unidade · 37,5 g')
    expect(leituraDoResultado({ gramas: 200, medida: null, unidade: 'ml' })).toBe('200 ml')
    expect(leituraDoResultado({ gramas: null, medida: null, unidade: 'g' })).toBeNull()
    expect(formatarQuantidadeMedida(0.25, 'xícara de chá')).toBe('0,25 xícara de chá')
    expect(formatarQuantidadeMedida(2.75, 'colher de sopa')).toBe('2,75 colheres de sopa')
  })

  it('CB-360 e CB-379: só número, só medida, uma letra ou só "de" não acham nada', () => {
    for (const texto of ['150', '1 concha', 'a', '150 de', '']) expect(buscarAlimentos(texto, ALIMENTOS).resultados).toEqual([])
  })

  it('a lista de consumo da POF só tem ids da base, sem repetir', () => {
    const ids = new Set(ALIMENTOS.map((a) => a.id))
    for (const id of CONSUMO_POF) expect(ids.has(id)).toBe(true)
    expect(new Set(CONSUMO_POF).size).toBe(CONSUMO_POF.length)
  })

  it('D-378: leite, bebida e suco são líquidos; leite em pó não', () => {
    const porId = (id: number) => ALIMENTOS.find((a) => a.id === id) as Alimento
    expect([458, 457, 471, 215, 478].map((id) => ehLiquido(porId(id)))).toEqual([true, true, true, true, true])
    expect([459, 456, 3, 448].map((id) => ehLiquido(porId(id)))).toEqual([false, false, false, false])
    expect(ehLiquido({ descricao: 'Kefir da casa', categoria: 'Leite e derivados', unidade: 'ml' })).toBe(true)
  })
})

describe('um copo por nome e a unidade emprestada (spec alimentos-e-gramaturas, D-424 e D-425)', () => {
  it('CA-1209: 240 g de iogurte natural e de iogurte desnatado se leem no mesmo copo', () => {
    expect(medidaParaMostrar(448, 240)?.texto).toBe('1 copo de requeijão')
    expect(medidaParaMostrar(449, 240)?.texto).toBe('1 copo de requeijão')
  })

  it('CA-1209: quem escreve "copo médio" acha o copo de requeijão, o mesmo copo de 240 ml', () => {
    expect(medidaPedida(449, 'copo médio')).toEqual({ nome: 'copo de requeijão', gramas: 240 })
    const r = buscarAlimentos('1 copo médio de iogurte natural desnatado', ALIMENTOS).resultados[0]
    expect(r?.alimento.id).toBe(449)
    expect(r?.medida).toEqual({ nome: 'copo de requeijão', quantidade: 1, gramasPorMedida: 240 })
  })

  it('CA-1208 (D-423): a fruta inteira se lê em unidade; fatia e pedaço só na fruta grande, até 2', () => {
    const MACA_FUJI = 222
    const maca = medidaCaseiraParaPaciente(MACA_FUJI, 130)
    expect(['unidade', 'unidade pequena']).toContain(maca?.medida)
    expect(medidaParaMostrar(182, 75)?.texto).toBe('1 unidade')
    expect(medidaParaMostrar(225, 170)?.texto).toBe('1 fatia')
    expect(medidaParaMostrar(235, 400)?.texto).toBe('2 fatias')
    const frutas = ALIMENTOS.filter((a) => a.categoria === 'Frutas e derivados' && a.preparo === 'cru' && !/suco|polpa/i.test(a.descricao))
    expect(frutas.length).toBeGreaterThan(50)
    for (const a of frutas) {
      for (let gramas = 20; gramas <= 400; gramas += 10) {
        const m = medidaCaseiraParaPaciente(a.id, gramas)
        if (!m) continue
        const rotulo = `${a.descricao} ${gramas} g: ${m.texto}`
        expect(['banda', 'metade', 'gomo', 'rodela'], rotulo).not.toContain(m.medida)
        if (m.medida === 'fatia' || m.medida === 'pedaço') expect(m.quantidade, rotulo).toBeLessThanOrEqual(2)
      }
    }
    // Maçã, pera, laranja e banana prata (unidade de até 250 g): nunca em fatia ou pedaço.
    for (const id of [MACA_FUJI, 221, 242, 214, 182]) {
      for (let gramas = 20; gramas <= 400; gramas += 10) expect(['fatia', 'pedaço'], `${id} ${gramas} g`).not.toContain(medidaCaseiraParaPaciente(id, gramas)?.medida)
    }
  })

  it('CB-392 (D-423): a medida que a nutricionista criou para a fruta vale', () => {
    registrarMedidasProprias([{ alimentoId: 222, nome: 'fatia', gramas: 30 }])
    try {
      expect(medidaCaseiraParaPaciente(222, 60)?.texto).toBe('2 fatias')
    } finally {
      registrarMedidasProprias([])
    }
  })

  it('CA-1210: "1 banana maçã" entra com a unidade emprestada da prata, 75 g', () => {
    const r = buscarAlimentos('1 banana maçã', ALIMENTOS).resultados[0]
    expect(r?.alimento.descricao).toBe('Banana, maçã, crua')
    expect(r?.gramas).toBe(75)
  })
})

describe('fruta inteira em peça inteira (spec alimentos-e-gramaturas, correção C, D-484)', () => {
  it('CA-1334: maçã e laranja nunca "unidade pequena e meia"; banana prata em 1 unidade ou meia', () => {
    for (const [id, gramas] of [
      [222, 130],
      [214, 135],
    ] as const) {
      const m = medidaCaseiraParaPaciente(id, gramas)
      expect(m?.texto ?? `${gramas} g`, `${id} ${gramas} g`).not.toMatch(/unidade pequena e meia|meia unidade pequena/)
    }
    expect(medidaCaseiraParaPaciente(182, 75)?.texto).toBe('1 unidade')
    expect(medidaCaseiraParaPaciente(182, 40)?.texto).toBe('meia unidade')
    // A folga de 20% vale só para uma peça (ou meia): 225 g de laranja pera não são "1 unidade e meia" (270 g, 20% a mais).
    expect(medidaCaseiraParaPaciente(214, 225)?.texto).not.toBe('1 unidade e meia')
    // Nenhuma fruta inteira crua lê "unidade pequena" com meia, de 20 a 400 g.
    for (const a of ALIMENTOS.filter((x) => x.categoria === 'Frutas e derivados' && x.preparo === 'cru' && !/suco|polpa/i.test(x.descricao))) {
      for (let gramas = 20; gramas <= 400; gramas += 5) {
        const m = medidaCaseiraParaPaciente(a.id, gramas)
        if (m?.medida === 'unidade pequena') expect(Number.isInteger(m.quantidade), `${a.descricao} ${gramas} g: ${m.texto}`).toBe(true)
      }
    }
  })
})

describe('o número conta peças na entrada rápida (spec alimentos-e-gramaturas, correção C, D-482)', () => {
  it('CA-1330: "2 ovos" escolhe o ovo inteiro em 2 unidades; gema e clara só quando pedidas', () => {
    const { resultados } = buscarAlimentos('2 ovos', ALIMENTOS)
    expect(resultados[0]?.alimento.descricao).toMatch(/^Ovo, de galinha, inteiro/)
    expect(resultados[0]?.medida).toMatchObject({ nome: 'unidade', quantidade: 2 })
    for (const r of resultados) expect(r.alimento.descricao, r.alimento.descricao).not.toMatch(/gema|clara/)
    expect(buscarAlimentos('2 gemas', ALIMENTOS).resultados.map((r) => r.alimento.descricao)).toContain('Ovo, de galinha, gema, cozida/10minutos')
    expect(buscarAlimentos('clara de ovo', ALIMENTOS).resultados.map((r) => r.alimento.descricao)).toContain('Ovo, de galinha, clara, cozida/10minutos')
  })

  it('CA-1331: "2 ovos" só traz ovos que se contam; "15 aveia" continua a aveia com 15 g (D-371)', () => {
    const ovos = buscarAlimentos('2 ovos', ALIMENTOS).resultados.filter((r) => r.alimento.descricao.startsWith('Ovo'))
    expect(ovos.length).toBeGreaterThan(0)
    for (const r of ovos) expect(medidaDeContar(r.alimento.id), r.alimento.descricao).not.toBeNull()
    // O número não puxa para a frente quem tem medida de contar: o pão de aveia viraria 15 fatias.
    const [aveia] = buscarAlimentos('15 aveia', ALIMENTOS).resultados
    expect(aveia?.alimento.descricao).toBe('Aveia, flocos, crua')
    expect(aveia?.gramas).toBe(15)
  })
})

describe('sobras do G2 na 2ª revisão (spec alimentos-e-gramaturas, correção C, D-483)', () => {
  const ATUM = 277

  it('CA-1333: 120 g de atum não se leem "7 colheres de sopa e meia"; carne e peixe nunca mais de 4 colheres', () => {
    expect(medidaParaMostrar(ATUM, 120)?.medida ?? 'gramas').not.toMatch(/^colher/)
    for (const a of ALIMENTOS.filter((x) => x.categoria === 'Carnes e derivados' || x.categoria === 'Pescados e frutos do mar')) {
      for (let gramas = 20; gramas <= 250; gramas += 10) {
        const m = medidaParaMostrar(a.id, gramas)
        if (m && m.medida.startsWith('colher')) expect(m.quantidade, `${a.descricao} ${gramas} g: ${m.texto}`).toBeLessThanOrEqual(4)
      }
    }
    // Até 4 colheres continua: 2 colheres de sopa de atum (32 g).
    expect(medidaParaMostrar(ATUM, 32)?.texto).toBe('2 colheres de sopa')
  })

  it('CA-1333: "1 copo de leite" não acha o creme de leite', () => {
    const { resultados } = buscarAlimentos('1 copo de leite', ALIMENTOS)
    expect(resultados.length).toBeGreaterThan(0)
    for (const r of resultados) expect(r.alimento.descricao).not.toMatch(/^Creme de Leite/i)
  })
})

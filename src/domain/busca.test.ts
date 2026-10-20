import { buscarAlimentos, formatarQuantidadeMedida, interpretarEntrada, MEDIDAS, MEDIDAS_DE_CONTAR, medidaCaseiraParaPaciente, medidaEquivalente, medidaParaMostrar } from './busca.ts'
import { ALIMENTOS } from './tabelas.ts'

describe('interpretarEntrada', () => {
  it.each([
    ['150 arroz int', { quantidade: 150, medida: null, termos: ['arroz', 'int'] }],
    ['150g arroz', { quantidade: 150, medida: null, termos: ['arroz'] }],
    ['150 g de arroz', { quantidade: 150, medida: null, termos: ['arroz'] }],
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
    expect(interpretarEntrada(texto)).toEqual(esperado)
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
    expect(macarrao).toMatchObject({ gramas: null, medida: null })
    expect(macarrao?.aviso).toMatch(/colher de sopa.*não está cadastrada.*gramas/)
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

  it('CA-780: manteiga e margarina nunca saem em fatia; 30 g é "1 colher de sopa"', () => {
    expect(medidaParaMostrar(MANTEIGA, 30)?.texto).toBe('1 colher de sopa')
    expect(medidaParaMostrar(MARGARINA, 30)?.texto).toBe('1 colher de sopa')
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
    expect(medidaParaMostrar(BANANA_PRATA, 104)?.texto).toBe('4 fatias')
    expect(medidaParaMostrar(3, 150)?.texto).toBe('6 colheres de sopa')
  })

  it('a medida do planejador na busca (medidaEquivalente) continua a de antes (R-182)', () => {
    expect(medidaEquivalente(MARGARINA, 5)).toBeNull()
    expect(medidaEquivalente(MANTEIGA, 30)?.texto).toBe('1 fatia')
    expect(medidaEquivalente(BANANA_PRATA, 130)?.texto).toBe('5 fatias')
  })
})

describe('medida caseira para o paciente (spec conduta-da-nutricionista, D-295 e D-297)', () => {
  it('prefere uma medida de até 4 unidades ou pedaços quando outra medida do alimento serve', () => {
    // Ovo frito, 55 g: o planejador diz "5 fatias e meia"; para o paciente, "1 unidade".
    expect(medidaEquivalente(490, 55)?.texto).toBe('5 fatias e meia')
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
    expect(medidaCaseiraParaPaciente(222, 130)?.texto).toBe('3 fatias e meia')
    expect(medidaCaseiraParaPaciente(40, 100)).toBeNull()
  })

  it('as medidas de contar são as de unidade e pedaço', () => {
    expect([...MEDIDAS_DE_CONTAR].sort()).toEqual(
      ['banda', 'bife', 'coxa', 'fatia', 'filé', 'gomo', 'metade', 'pedaço', 'peito', 'posta', 'rodela', 'sobrecoxa', 'unidade', 'unidade pequena'].sort(),
    )
  })
})

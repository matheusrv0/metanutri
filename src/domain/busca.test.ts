import { buscarAlimentos, formatarQuantidadeMedida, interpretarEntrada, MEDIDAS, medidaEquivalente } from './busca.ts'
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

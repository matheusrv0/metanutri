// CA-1110 (spec alimentos-e-gramaturas): entradas reais da entrada rápida, com o alimento e os gramas esperados. O Enter
// põe o 1º resultado, então é ele que conta. `gramas: null` = a medida não existe no alimento e a lista pede gramas.
import { buscarAlimentos, leituraDoResultado } from './busca.ts'
import { ALIMENTOS } from './tabelas.ts'

const ENTRADAS: readonly (readonly [texto: string, alimento: string, gramas: number | null, leitura: string | null])[] = [
  ['150 arroz', 'Arroz, tipo 1, cozido', 150, '150 g'],
  ['150 arroz integral', 'Arroz, integral, cozido', 150, '150 g'],
  ['150 arroz tipo 1 cozido', 'Arroz, tipo 1, cozido', 150, '150 g'],
  ['2 colheres arroz', 'Arroz, tipo 1, cozido', 50, '2 colheres de sopa · 50 g'],
  ['1 colher de arroz', 'Arroz, tipo 1, cozido', 25, '1 colher de sopa · 25 g'],
  ['1 escumadeira de arroz', 'Arroz, tipo 1, cozido', 85, '1 escumadeira · 85 g'],
  // D-482b (3ª revisão): número abaixo de 20 sem unidade nem medida de contar avisa, e nada entra.
  ['3 arroz', 'Arroz, tipo 1, cozido', null, null],
  ['1 concha de feijão', 'Feijão, carioca, cozido', 140, '1 concha · 140 g'],
  ['uma concha de feijão', 'Feijão, carioca, cozido', 140, '1 concha · 140 g'],
  ['meia concha de feijão', 'Feijão, carioca, cozido', 70, 'meia concha · 70 g'],
  ['½ concha de feijão', 'Feijão, carioca, cozido', 70, 'meia concha · 70 g'],
  ['1 e meia concha de feijão', 'Feijão, carioca, cozido', 210, '1 concha e meia · 210 g'],
  ['1 concha e meia de feijão', 'Feijão, carioca, cozido', 210, '1 concha e meia · 210 g'],
  ['2 colheres de feijão', 'Feijão, carioca, cozido', 34, '2 colheres de sopa · 34 g'],
  ['100 feijao', 'Feijão, carioca, cozido', 100, '100 g'],
  ['1 banana', 'Banana, prata, crua', 75, '1 unidade · 75 g'],
  ['25 banana', 'Banana, prata, crua', 25, '25 g'],
  ['5 g banana', 'Banana, prata, crua', 5, '5 g'],
  ['1 copo de leite', 'Leite, de vaca, integral', 150, '1 copo americano · 150 ml'],
  ['1 copo americano de leite', 'Leite, de vaca, integral', 150, '1 copo americano · 150 ml'],
  ['200 leite', 'Leite, de vaca, integral', 200, '200 ml'],
  ['200 ml de leite', 'Leite, de vaca, integral', 200, '200 ml'],
  ['200 ml de leite desnatado', 'Leite, de vaca, desnatado, UHT', 200, '200 ml'],
  ['1 litro de leite', 'Leite, de vaca, integral', 1000, '1000 ml'],
  ['100 frango', 'Frango, peito, sem pele, grelhado', 100, '100 g'],
  ['150 g de frango', 'Frango, peito, sem pele, grelhado', 150, '150 g'],
  ['1 filé de frango', 'Frango, peito, sem pele, grelhado', 100, '1 filé · 100 g'],
  ['2 ovos', 'Ovo, de galinha, inteiro, cozido/10minutos', 90, '2 unidades · 90 g'],
  ['2 ovos cozidos', 'Ovo, de galinha, inteiro, cozido/10minutos', 90, '2 unidades · 90 g'],
  ['1 unidade de ovo', 'Ovo, de galinha, inteiro, cozido/10minutos', 45, '1 unidade · 45 g'],
  ['meia xícara de aveia', 'Aveia, flocos, crua', null, null],
  ['2 colheres de sopa de aveia', 'Aveia, flocos, crua', 30, '2 colheres de sopa · 30 g'],
  ['100 carne', 'Carne, bovina, patinho, sem gordura, grelhado', 100, '100 g'],
  ['100 patinho', 'Carne, bovina, patinho, sem gordura, grelhado', 100, '100 g'],
  ['50 pao', 'Pão, trigo, francês', 50, '50 g'],
  ['2 pães', 'Pão, trigo, francês', 100, '2 unidades · 100 g'],
  ['1 pão francês', 'Pão, trigo, francês', 50, '1 unidade · 50 g'],
  ['1 fatia de pão integral', 'Pão, trigo, forma, integral', 25, '1 fatia · 25 g'],
  ['1 maçã', 'Maçã, Fuji, com casca, crua', 150, '1 unidade · 150 g'],
  ['2 maçãs', 'Maçã, Fuji, com casca, crua', 300, '2 unidades · 300 g'],
  ['1 laranja', 'Laranja, pêra, crua', 180, '1 unidade · 180 g'],
  ['meio mamão papaia', 'Mamão, Papaia, cru', 155, 'meia unidade · 155 g'],
  ['5 morangos', 'Morango, cru', 60, '5 unidades · 60 g'],
  ['30 queijo minas', 'Queijo, minas, frescal', 30, '30 g'],
  ['2 fatias de queijo minas', 'Queijo, minas, frescal', 90, '2 fatias · 90 g'],
  ['1 pote de iogurte natural', 'Iogurte, natural', 200, '1 pote · 200 g'],
  ['1 colher de azeite', 'Azeite, de oliva, extra virgem', 8, '1 colher de sopa · 8 g'],
  ['10 castanha', 'Castanha-do-Brasil, crua', 40, '10 unidades · 40 g'],
  ['100 batata', 'Batata, inglesa, cozida', 100, '100 g'],
  ['100 mandioca', 'Mandioca, cozida', 100, '100 g'],
  ['2 colheres de farinha de mandioca', 'Farinha, de mandioca, torrada', 32, '2 colheres de sopa · 32 g'],
  ['150 macarrão', 'Macarrão, trigo, cru', 150, '150 g'],
  ['100 cuscuz', 'Cuscuz, de milho, cozido com sal', 100, '100 g'],
  ['200 café', 'Café, infusão 10%', 200, '200 ml'],
  ['1 xícara de café', 'Café, infusão 10%', 50, '1 xícara de café · 50 ml'],
  ['1 colher de mel', 'Mel, de abelha', 15, '1 colher de sopa · 15 g'],
  ['1 tomate', 'Tomate, com semente, cru', 100, '1 unidade · 100 g'],
  ['100 alface', 'Alface, lisa, crua', 100, '100 g'],
  // 3ª revisão (D-482a e D-482b): cortes com 20 ou mais são peso; abaixo de 20, nada vira gramas calado.
  ['100 peito de frango', 'Frango, peito, sem pele, grelhado', 100, '100 g'],
  ['2 filés de frango', 'Frango, peito, sem pele, grelhado', 200, '2 filés · 200 g'],
  ['1 iogurte', 'Iogurte, natural', 200, '1 pote · 200 g'],
  ['200 iogurte', 'Iogurte, natural', 200, '200 g'],
  // D-482c: apelidos e gênero.
  ['120 filé de frango', 'Frango, peito, sem pele, grelhado', 120, '120 g'],
  ['100 fígado bovino', 'Carne, bovina, fígado, grelhado', 100, '100 g'],
  ['1 fatia de queijo branco', 'Queijo, minas, frescal', 45, '1 fatia · 45 g'],
]

describe('CA-1110: a entrada rápida com entradas reais', () => {
  it('tem pelo menos 40 entradas', () => {
    expect(ENTRADAS.length).toBeGreaterThanOrEqual(40)
  })

  it.each(ENTRADAS)('"%s" → %s (%s g)', (texto, alimento, gramas, leitura) => {
    const primeiro = buscarAlimentos(texto, ALIMENTOS).resultados[0]
    expect(primeiro?.alimento.descricao.trim()).toBe(alimento)
    expect(primeiro?.gramas).toBe(gramas)
    expect(primeiro ? leituraDoResultado(primeiro) : null).toBe(leitura)
  })

  it('CA-1100: "Arroz, integral, cru" nunca vem antes de um arroz cozido', () => {
    const lista = buscarAlimentos('150 arroz', ALIMENTOS).resultados.map((r) => r.alimento.descricao)
    const cru = lista.indexOf('Arroz, integral, cru')
    for (const cozido of lista.filter((d) => /cozido/.test(d))) expect(cru === -1 || lista.indexOf(cozido) < cru).toBe(true)
  })

  it('CA-1228: "meia xícara de aveia" pede gramas ou a medida, sem inventar a conversão (CB-361), e diz as medidas que há', () => {
    const aveia = buscarAlimentos('meia xícara de aveia', ALIMENTOS).resultados[0]
    expect(aveia).toMatchObject({ gramas: null, faltaMedida: { nome: 'xícara de chá', quantidade: 0.5 } })
    expect(aveia?.aviso).toBe('Sem “xícara de chá” · tem colher de sopa (15 g), colher de servir (30 g), colher de sobremesa (7 g)')
  })

  it('CA-1242 (Menores da revisão de código): "2 pães franceses" acha o pão francês; "1.000 ml de leite" são 1.000 ml', () => {
    const pao = buscarAlimentos('2 pães franceses', ALIMENTOS).resultados[0]
    expect(pao?.alimento.descricao).toBe('Pão, trigo, francês')
    expect(pao).toMatchObject({ gramas: 100, medida: { nome: 'unidade', quantidade: 2 } })
    expect(buscarAlimentos('1.000 ml de leite', ALIMENTOS).resultados[0]).toMatchObject({ gramas: 1000, unidade: 'ml' })
    expect(buscarAlimentos('1.500 g de arroz', ALIMENTOS).resultados[0]?.gramas).toBe(1500)
    // A vírgula decimal continua: "1,5 concha".
    expect(buscarAlimentos('1,5 concha de feijão', ALIMENTOS).resultados[0]?.gramas).toBe(210)
  })

  it('CA-1258: "1 banana nanica" não vira 1 g nem 1 fatia: a fruta sem a unidade pede gramas ou a medida', () => {
    const nanica = buscarAlimentos('1 banana nanica', ALIMENTOS).resultados[0]
    expect(nanica?.alimento.descricao).toBe('Banana, nanica, crua')
    expect(nanica).toMatchObject({ gramas: null, faltaMedida: { nome: 'unidade', quantidade: 1 } })
    expect(nanica?.aviso).toBe('Sem “unidade” · tem fatia (26 g), pedaço (16 g)')
    // A prata tem a unidade da POF; "3 arroz" avisa desde a D-482b (antes, 3 g, CA-1102).
    expect(buscarAlimentos('1 banana prata', ALIMENTOS).resultados[0]?.gramas).toBe(75)
    expect(buscarAlimentos('3 arroz', ALIMENTOS).resultados[0]?.gramas).toBeNull()
  })
})

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
  ['3 arroz', 'Arroz, tipo 1, cozido', 3, '3 g'],
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

  it('"meia xícara de aveia" pede gramas, sem inventar a conversão (CB-361)', () => {
    expect(buscarAlimentos('meia xícara de aveia', ALIMENTOS).resultados[0]?.aviso).toBe(
      'A medida “xícara de chá” não está cadastrada para Aveia, flocos, crua. Informe a quantidade em gramas.',
    )
  })
})

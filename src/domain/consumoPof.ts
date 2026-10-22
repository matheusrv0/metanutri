// Os alimentos mais consumidos no Brasil, na forma mais comum, para ordenar a busca (spec alimentos-e-gramaturas,
// D-370, item 6).
//
// A ordem segue a "Análise do consumo alimentar pessoal no Brasil" da POF 2017-2018 (IBGE): café, arroz, feijão, pão
// de sal, carne bovina, frango, leite, frutas (banana, laranja, maçã), ovo, verduras e legumes. É só a ordem de nomes
// comuns, sem percentual: serve para desempatar, depois do uso da conta, da forma preparada e do uso comum.
// Os ids são da TACO (`src/data/alimentos.json`); um teste confere que cada um existe com a descrição anotada.

/** Ids da TACO, do mais consumido para o menos. */
export const CONSUMO_POF: readonly number[] = [
  471, // Café, infusão 10%
  3, // Arroz, tipo 1, cozido
  561, // Feijão, carioca, cozido
  53, // Pão, trigo, francês
  377, // Carne, bovina, patinho, sem gordura, grelhado
  326, // Carne, bovina, acém, moído, cozido
  410, // Frango, peito, sem pele, grelhado
  458, // Leite, de vaca, integral
  182, // Banana, prata, crua
  488, // Ovo, de galinha, inteiro, cozido/10minutos
  567, // Feijão, preto, cozido
  214, // Laranja, pêra, crua
  222, // Maçã, Fuji, com casca, crua
  179, // Banana, nanica, crua
  79, // Alface, lisa, crua
  157, // Tomate, com semente, cru
  91, // Batata, inglesa, cozida
  461, // Queijo, minas, frescal
  225, // Mamão, Formosa, cru
  109, // Cenoura, cozida
  129, // Mandioca, cozida
  122, // Farinha, de mandioca, torrada
  533, // Cuscuz, de milho, cozido com sal
  448, // Iogurte, natural
  261, // Manteiga, com sal
  52, // Pão, trigo, forma, integral
  7, // Aveia, flocos, crua
  457, // Leite, de vaca, desnatado, UHT
  1, // Arroz, integral, cozido
  577, // Lentilha, cozida
  88, // Batata, doce, cozida
  100, // Brócolis, cozido
  116, // Couve, manteiga, refogada
  164, // Abacaxi, cru
  235, // Melancia, crua
  226, // Mamão, Papaia, cru
  215, // Laranja, pêra, suco
  463, // Queijo, mozarela
  260, // Azeite, de oliva, extra virgem
]

const POSICAO = new Map(CONSUMO_POF.map((id, i) => [id, i]))

/** A posição do alimento na lista de consumo; fora dela, depois de todos. */
export function posicaoNoConsumo(alimentoId: number): number {
  return POSICAO.get(alimentoId) ?? Number.POSITIVE_INFINITY
}

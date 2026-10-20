// Spec impressao-do-plano, D-183 e D-189: a quantidade que a folha do paciente mostra.
import { criarExemplo } from './exemplo.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { medidaVaga, quantidadeNaFolha, type QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { buscarAlimento } from './tabelas.ts'

/** Como a folha escreve: a medida, e o peso depois de " · " quando a medida é vaga; sem medida, só o peso. */
const texto = (q: QuantidadeNaFolha) => (q.medida === null ? `${q.gramas} g` : q.comPeso ? `${q.medida} · ${q.gramas} g` : q.medida)

const MARGARINA = 263
const MANTEIGA = 261
const OMELETE = 484
const OVO_FRITO = 490
const LARANJA_BAIA = 208
const BANANA_PRATA = 182
const BATATA_INGLESA_COZIDA = 91

describe('quantidade na folha', () => {
  it('CA-641, CA-629 e CA-630: no plano de exemplo, o peso vai ao lado só das medidas vagas', () => {
    let n = 0
    const { plano } = criarExemplo(() => `id${++n}`, '2026-10-15')
    const itens = plano.refeicoes.flatMap((r) => [...r.opcoes.principal, ...r.opcoes.substituto1, ...r.opcoes.substituto2])
    const linhas = Object.fromEntries(itens.map((i) => [nomeParaPaciente(buscarAlimento(i.alimentoId)), texto(quantidadeNaFolha(i.alimentoId, i.gramas, buscarAlimento))]))
    expect(linhas).toMatchObject({
      // Mais de 4 pedaços: só o peso (CA-644).
      'Banana prata': '130 g',
      'Maçã Fuji com casca': '3 fatias e meia · 130 g',
      'Filé de merluza assado': 'meia unidade · 100 g',
      'Peito de frango grelhado sem pele': '1 bife · 100 g',
      'Patinho grelhado sem gordura': '1 bife · 100 g',
      'Alface crespa': '4 colheres de servir e meia · 70 g',
      'Mamão Formosa': '3 colheres de sopa · 120 g',
      'Brócolis cozido': '4 colheres de servir · 80 g',
      'Cenoura crua': 'meia unidade · 60 g',
      'Batata inglesa cozida': '2 colheres de servir e meia · 150 g',
      'Pão francês': '1 unidade e meia',
      'Arroz branco cozido': '6 colheres de sopa',
      'Feijão carioca cozido': '6 colheres de sopa',
      'Ovo cozido': '2 unidades',
      'Castanha-do-pará': '4 unidades',
      'Iogurte natural': '1 copo americano',
      'Aveia em flocos': '2 colheres de sopa',
      'Queijo minas frescal': '30 g',
    })
  })

  it('CA-642: manteiga e margarina em ponta de faca, até 3 e dentro de 15% do peso', () => {
    expect(texto(quantidadeNaFolha(MARGARINA, 5, buscarAlimento))).toBe('1 ponta de faca')
    expect(texto(quantidadeNaFolha(MARGARINA, 2.5, buscarAlimento))).toBe('meia ponta de faca')
    expect(texto(quantidadeNaFolha(MANTEIGA, 7.5, buscarAlimento))).toBe('1 ponta de faca e meia')
    expect(texto(quantidadeNaFolha(MANTEIGA, 10, buscarAlimento))).toBe('2 pontas de faca')
    // Mais que 3 pontas de faca: a regra comum (colher de chá de gordura é medida clara).
    expect(texto(quantidadeNaFolha(MARGARINA, 24, buscarAlimento))).toBe('3 colheres de chá')
  })

  it('CA-780 (spec revisao-geral-trabalho): manteiga e margarina nunca em fatia na folha', () => {
    expect(texto(quantidadeNaFolha(MANTEIGA, 30, buscarAlimento))).toBe('1 colher de sopa')
    expect(texto(quantidadeNaFolha(MARGARINA, 30, buscarAlimento))).toBe('1 colher de sopa')
  })

  it('CA-644: medida de pedaço com mais de 4 pedaços vira o peso, na refeição, na lista de compras e na troca', () => {
    expect(texto(quantidadeNaFolha(OMELETE, 50, buscarAlimento))).toBe('50 g')
    expect(texto(quantidadeNaFolha(OVO_FRITO, 55, buscarAlimento))).toBe('55 g')
    expect(texto(quantidadeNaFolha(LARANJA_BAIA, 117, buscarAlimento))).toBe('117 g')
    expect(texto(quantidadeNaFolha(BANANA_PRATA, 130, buscarAlimento))).toBe('130 g')
    expect(texto(quantidadeNaFolha(BATATA_INGLESA_COZIDA, 120, buscarAlimento))).toBe('120 g')
    // Até 4 pedaços, a medida com o peso ao lado (D-189).
    expect(texto(quantidadeNaFolha(BANANA_PRATA, 104, buscarAlimento))).toBe('4 fatias · 104 g')
  })

  it('D-189: o que é vago depende da medida e do tipo de alimento', () => {
    expect(medidaVaga('fatia', 'Cereais e derivados')).toBe(true)
    expect(medidaVaga('bife', 'Carnes e derivados')).toBe(true)
    expect(medidaVaga('unidade', 'Pescados e frutos do mar')).toBe(true)
    expect(medidaVaga('unidade', 'Verduras, hortaliças e derivados')).toBe(true)
    expect(medidaVaga('unidade', 'Frutas e derivados')).toBe(false)
    expect(medidaVaga('unidade', 'Ovos e derivados')).toBe(false)
    expect(medidaVaga('colher de sopa', 'Frutas e derivados')).toBe(true)
    expect(medidaVaga('colher de servir', 'Verduras, hortaliças e derivados')).toBe(true)
    expect(medidaVaga('colher de sopa', 'Cereais e derivados')).toBe(false)
    expect(medidaVaga('concha', 'Leguminosas e derivados')).toBe(false)
    expect(medidaVaga('copo americano', 'Leite e derivados')).toBe(false)
    expect(medidaVaga('colher de chá', 'Carnes e derivados')).toBe(false)
  })

  it('alimento sem medida, produto e alimento removido: só o peso', () => {
    expect(quantidadeNaFolha(999_999, 40, buscarAlimento)).toEqual({ medida: null, gramas: 40, comPeso: false })
  })
})

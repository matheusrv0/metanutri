// A quantidade que a paciente lê: a nutricionista escolhe, por plano, entre medida caseira e gramas (spec
// conduta-da-nutricionista, D-297, que substitui o D-183 e o D-189 da impressao-do-plano).
import { criarExemplo } from './exemplo.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { quantidadeNaFolha, type QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { buscarAlimento } from './tabelas.ts'
import type { ModoQuantidade } from './tipos.ts'

/** Como a folha escreve: a medida; sem medida, o peso. */
const texto = (q: QuantidadeNaFolha) => q.medida ?? `${q.gramas} g`

const MARGARINA = 265
const MARGARINA_HIDROGENADA = 263
const MANTEIGA = 261
const OVO_FRITO = 490
const BANANA_PRATA = 182
const TORRADA = 63

function linhasDoExemplo(modo: ModoQuantidade): Record<string, string> {
  let n = 0
  const { plano } = criarExemplo(() => `id${++n}`, '2026-10-20')
  const itens = plano.refeicoes.flatMap((r) => [...r.opcoes.principal, ...r.opcoes.substituto1, ...r.opcoes.substituto2])
  return Object.fromEntries(itens.map((i) => [nomeParaPaciente(buscarAlimento(i.alimentoId)), texto(quantidadeNaFolha(i.alimentoId, i.gramas, modo))]))
}

describe('quantidade para a paciente (spec conduta-da-nutricionista, D-297)', () => {
  it('CA-925: em "Gramas", só o peso, em todo alimento do exemplo', () => {
    const linhas = linhasDoExemplo('gramas')
    expect(linhas).toMatchObject({ 'Pão francês': '70 g', 'Margarina com sal': '5 g', 'Banana prata': '130 g', 'Arroz branco cozido': '150 g', 'Ovo cozido': '90 g' })
    for (const [nome, linha] of Object.entries(linhas)) expect(linha, nome).toMatch(/^\d+ g$/)
  })

  it('CA-926: em "Medida caseira", só a medida, sem o peso ao lado; o peso só sem medida que sirva', () => {
    expect(linhasDoExemplo('medida-caseira')).toMatchObject({
      'Pão francês': '1 unidade e meia',
      'Maçã Fuji com casca': '1 unidade', // D-423: eram "3 fatias e meia"; D-484: nem "unidade pequena e meia"
      'Filé de merluza assado': '100 g', // D-483a: filé de peixe só em filé ou porção (era "meia unidade")
      'Peito de frango grelhado sem pele': '1 bife',
      'Patinho grelhado sem gordura': '1 bife',
      // Correção A (D-430): a alface só se mede em folha, e o mamão Formosa só tem a fatia de 170 g, que não serve a 120 g.
      'Alface crespa': '7 folhas',
      'Mamão Formosa': '120 g',
      'Brócolis cozido': '4 colheres de servir',
      'Cenoura crua': 'meia unidade',
      'Batata inglesa cozida': '2 colheres de servir e meia',
      'Arroz branco cozido': '6 colheres de sopa',
      'Feijão carioca cozido': '6 colheres de sopa',
      'Ovo cozido': '2 unidades',
      // Uma castanha, a unidade da POF (spec vitaminas-usda, D-301).
      'Castanha-do-pará': '1 unidade',
      'Iogurte natural': '1 copo americano',
      'Aveia em flocos': '2 colheres de sopa',
      // D-295: "5 fatias" vira a medida de até 4 pedaços que serve.
      'Banana prata': '1 unidade e meia',
      // Sem medida caseira que sirva, o peso.
      'Queijo minas frescal': '30 g',
      'Macarrão (peso cru)': '90 g',
    })
  })

  it('CA-926: o padrão é "Medida caseira"; a medida tem até 4 pedaços quando outra serve, e a do planejador quando não', () => {
    expect(quantidadeNaFolha(OVO_FRITO, 55)).toMatchObject({ medida: '1 unidade', gramas: 55 })
    expect(texto(quantidadeNaFolha(BANANA_PRATA, 104))).toBe('1 unidade e meia') // D-423: eram "4 fatias"
    // A torrada só tem a unidade de 8 g: 56 g ficam "7 unidades" (na troca, ela nem entra, D-295).
    expect(texto(quantidadeNaFolha(TORRADA, 56))).toBe('7 unidades')
  })

  it('CA-780 (spec revisao-geral-trabalho): manteiga e margarina nunca em fatia na folha', () => {
    // Correção C (D-483): sem a colher de sopa cheia de 32 g da POF; 23 g é 1 colher de sobremesa.
    expect(texto(quantidadeNaFolha(MANTEIGA, 23))).toBe('1 colher de sobremesa')
    expect(texto(quantidadeNaFolha(MARGARINA, 23))).toBe('1 colher de sobremesa')
  })

  it('CA-927: manteiga e margarina em ponta de faca, até 3 e dentro de 15% do peso; em "Gramas", o peso', () => {
    expect(texto(quantidadeNaFolha(MARGARINA, 5, 'medida-caseira'))).toBe('1 ponta de faca')
    expect(texto(quantidadeNaFolha(MARGARINA_HIDROGENADA, 2.5, 'medida-caseira'))).toBe('meia ponta de faca')
    expect(texto(quantidadeNaFolha(MANTEIGA, 7.5, 'medida-caseira'))).toBe('1 ponta de faca e meia')
    expect(texto(quantidadeNaFolha(MANTEIGA, 10, 'medida-caseira'))).toBe('2 pontas de faca')
    // Mais que 3 pontas de faca: a medida comum.
    expect(texto(quantidadeNaFolha(MARGARINA_HIDROGENADA, 24, 'medida-caseira'))).toBe('3 colheres de chá')
    expect(texto(quantidadeNaFolha(MARGARINA, 5, 'gramas'))).toBe('5 g')
  })

  it('alimento sem medida, produto e alimento removido: só o peso, nos dois modos', () => {
    expect(quantidadeNaFolha(999_999, 40, 'medida-caseira')).toMatchObject({ medida: null, gramas: 40 })
    expect(quantidadeNaFolha(999_999, 40, 'gramas')).toMatchObject({ medida: null, gramas: 40 })
  })
})

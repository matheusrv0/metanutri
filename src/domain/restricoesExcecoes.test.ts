// Spec base-ampliada, D-716n (re-revisão, achado 1, segurança de alergia): a exceção não vale para o nome inteiro. O
// trecho que casou a exceção sai do nome e os termos são procurados no que sobra; só o qualificador ("sem lactose",
// "vegano", "sem glúten") vale para o nome inteiro.
import { montarRestricoes, restricaoDoAlimento } from './restricoes.ts'

const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })
// Um alimento próprio (Meus alimentos), lido pelo nome.
let proximo = 900_100
const pega = (descricao: string, restricao: string): boolean => restricaoDoAlimento({ id: proximo++, descricao }, marcadas(restricao)) !== null

describe('D-716n: a exceção sai do nome, e o resto ainda é lido', () => {
  it.each([
    ['Macarrão de arroz com molho shoyu', 'gluten'],
    ['Couve manteiga refogada na manteiga', 'leite'],
    ['Ovo de galinha com bacon', 'vegetariano'],
    ['Pão de queijo com presunto', 'vegetariano'],
    ['Leite de coco com leite condensado', 'leite'],
    ['Leite de coco com leite condensado', 'lactose'],
    ['Farinha de arroz com farinha de trigo', 'trigo'],
    ['Óleo de soja com tofu', 'soja'],
    ['Hambúrguer vegetal com queijo', 'leite'],
    ['Biscoito de arroz com cobertura de chocolate e trigo', 'trigo'],
    ['Noz-moscada com nozes', 'castanhas'],
    ['Macarrão de milho com queijo ralado e pão', 'gluten'],
  ])('"%s" pega %s', (nome, restricao) => {
    expect(pega(nome, restricao)).toBe(true)
  })

  it.each([
    ['Couve, manteiga, refogada', 'leite'],
    ['Couve manteiga refogada', 'leite'],
    ['Macarrão de arroz', 'gluten'],
    ['Macarrão de arroz com legumes', 'gluten'],
    ['Ovo de galinha caipira', 'vegetariano'],
    ['Pão de queijo congelado', 'trigo'],
    ['Hambúrguer vegetal com queijo', 'vegetariano'],
    ['Óleo de soja', 'soja'],
    ['Noz-moscada em pó', 'castanhas'],
    // O qualificador vale para o nome inteiro.
    ['Leite sem lactose', 'lactose'],
    ['Iogurte zero lactose', 'lactose'],
    ['Pão sem glúten', 'gluten'],
    ['Biscoito de polvilho', 'trigo'],
    ['Requeijão vegano', 'leite'],
  ])('"%s" não pega %s', (nome, restricao) => {
    expect(pega(nome, restricao)).toBe(false)
  })
})

describe('D-716t: tapioca e polvilho não livram o nome inteiro (revisão da base-ajustes, falha alta)', () => {
  it.each([
    ['Tapioca com granola', 'gluten'],
    ['Tapioca com aveia e banana', 'gluten'],
    ['Panqueca de tapioca com aveia', 'gluten'],
    ['Cuscuz de tapioca com cevada', 'gluten'],
    ['Mingau de tapioca com farinha láctea', 'gluten'],
    ['Mingau de tapioca com farinha láctea', 'trigo'],
    ['Biscoito de polvilho com farinha de trigo', 'gluten'],
    ['Biscoito de polvilho com farinha de trigo', 'trigo'],
    ['Pão de tapioca com farinha de trigo', 'gluten'],
    ['Pão de tapioca com farinha de trigo', 'trigo'],
    ['Farinha láctea', 'gluten'],
  ])('"%s" pega %s', (nome, restricao) => {
    expect(pega(nome, restricao)).toBe(true)
  })

  it.each([
    ['Biscoito de polvilho', 'gluten'],
    ['Biscoito de polvilho com queijo', 'gluten'],
    ['Biscoito polvilho doce', 'trigo'],
    ['Pão de polvilho', 'gluten'],
    ['Pão de tapioca', 'gluten'],
    ['Bolo de tapioca', 'trigo'],
    ['Tapioca com queijo', 'gluten'],
    ['Bolo de farinha de arroz', 'gluten'],
    ['Pão de farinha de arroz', 'gluten'],
    ['Panqueca de farinha de arroz', 'trigo'],
    ['Massa de mandioca para pastel', 'gluten'],
  ])('"%s" não pega %s', (nome, restricao) => {
    expect(pega(nome, restricao)).toBe(false)
  })
})

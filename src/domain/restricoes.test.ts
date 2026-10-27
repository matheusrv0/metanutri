// As restrições do paciente (spec ficha-unica, D-351 a D-354; CA-1078 a CA-1081).
import { ID_DE_RECEITA } from './receitaNoPlano.ts'
import {
  casaRestricao,
  comoRestricoes,
  ehNaoGosta,
  montarRestricoes,
  RESTRICOES,
  restricaoDoAlimento,
  restricaoDoItem,
  SEM_RESTRICOES,
} from './restricoes.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Alimento, ItemPlano } from './tipos.ts'

const porNome = (descricao: string): Alimento => {
  const achado = ALIMENTOS.find((a) => a.descricao.trim() === descricao)
  if (!achado) throw new Error(`"${descricao}" não está na base.`)
  return achado
}
const proprio = (descricao: string, id = 900_001) => ({ id, descricao })
const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })

describe('O catálogo (D-351)', () => {
  it('tem as alergias, as intolerâncias e as escolhas, na ordem da tela', () => {
    expect(RESTRICOES.filter((r) => r.tipo === 'alergia').map((r) => r.rotulo)).toEqual([
      'Leite e derivados',
      'Ovo',
      'Trigo',
      'Soja',
      'Amendoim',
      'Castanhas',
      'Peixe',
      'Crustáceos e frutos do mar',
    ])
    expect(RESTRICOES.filter((r) => r.tipo === 'intolerancia').map((r) => r.rotulo)).toEqual(['Lactose', 'Glúten'])
    expect(RESTRICOES.filter((r) => r.tipo === 'escolha').map((r) => r.rotulo)).toEqual(['Vegetariano', 'Vegano'])
  })
})

describe('Montar as restrições do paciente', () => {
  it('sem nada, não restringe nada', () => {
    expect(montarRestricoes({ marcadas: [], texto: '', doencas: [], naoGosta: '' })).toEqual(SEM_RESTRICOES)
    expect(casaRestricao(porNome('Leite, de vaca, integral'), SEM_RESTRICOES)).toBe(false)
  })

  it('id desconhecido não conta (CA-1088)', () => {
    expect(marcadas('mostarda-do-futuro').grupos).toEqual([])
  })

  it('doença celíaca liga o glúten (D-351)', () => {
    const r = montarRestricoes({ marcadas: [], texto: '', doencas: ['celiaca'], naoGosta: '' })
    expect(restricaoDoAlimento(porNome('Pão, trigo, francês'), r)).toBe('Doença celíaca: glúten')
  })

  it('CA-1079: a linha de texto que nomeia um grupo liga o grupo; as outras valem pelo pedaço do nome', () => {
    const r = montarRestricoes({ marcadas: [], texto: 'lactose\nGlúten, jiló', doencas: [], naoGosta: '' })
    expect(restricaoDoAlimento(porNome('Iogurte, natural'), r)).toBe('Não come: lactose')
    expect(restricaoDoAlimento(porNome('Macarrão, trigo, cru'), r)).toBe('Não come: glúten')
    expect(restricaoDoAlimento(porNome('Jiló, cru'), r)).toBe('Não come: jiló')
    expect(restricaoDoAlimento(porNome('Queijo, parmesão'), r)).toBeNull()
  })

  it('"leite" escrito à mão liga Leite e derivados e continua pegando o que tem leite no nome', () => {
    const r = montarRestricoes({ marcadas: [], texto: 'leite', doencas: [], naoGosta: '' })
    expect(casaRestricao(porNome('Queijo, minas, frescal'), r)).toBe(true)
    expect(casaRestricao(porNome('Leite, de coco'), r)).toBe(true)
  })

  it('a lista de texto antiga (de antes da ficha única) vira texto', () => {
    expect(comoRestricoes(['queijo'])).toEqual({ grupos: [], textos: ['queijo'], naoGosta: [] })
    expect(comoRestricoes(undefined)).toEqual(SEM_RESTRICOES)
  })
})

describe('O aviso de cada tipo (D-353)', () => {
  it('diz o tipo e o grupo', () => {
    expect(restricaoDoAlimento(porNome('Queijo, minas, frescal'), marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(porNome('Leite, de vaca, integral'), marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoAlimento(porNome('Feijoada'), marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    expect(restricaoDoAlimento(porNome('Camarão, Rio Grande, grande, cozido'), marcadas('frutos-do-mar'))).toBe('Alergia: crustáceos e frutos do mar')
  })

  it('com duas restrições que pegam o mesmo alimento, vale a alergia', () => {
    expect(restricaoDoAlimento(porNome('Leite, de vaca, integral'), marcadas('lactose', 'leite'))).toBe('Alergia: leite e derivados')
  })
})

describe('Alimento próprio pelo nome (CA-1078)', () => {
  it('iogurte zero lactose tem leite, mas não lactose', () => {
    expect(casaRestricao(proprio('Iogurte grego zero lactose (Marca)'), marcadas('leite'))).toBe(true)
    expect(casaRestricao(proprio('Iogurte grego zero lactose (Marca)'), marcadas('lactose'))).toBe(false)
  })

  it('pão de queijo congelado tem leite e não tem glúten', () => {
    expect(casaRestricao(proprio('Pão de queijo congelado'), marcadas('leite'))).toBe(true)
    expect(casaRestricao(proprio('Pão de queijo congelado'), marcadas('gluten'))).toBe(false)
    expect(casaRestricao(proprio('Pão de forma integral'), marcadas('gluten'))).toBe(true)
  })

  it('bebida de amêndoas é castanha e não é leite; couve manteiga não é leite', () => {
    expect(casaRestricao(proprio('Bebida de amêndoas'), marcadas('castanhas'))).toBe(true)
    expect(casaRestricao(proprio('Bebida de amêndoas'), marcadas('leite'))).toBe(false)
    expect(casaRestricao(proprio('Couve manteiga picada'), marcadas('leite'))).toBe(false)
  })

  it('a palavra inteira: "mel" não pega melancia, "ovo" não pega "novo"', () => {
    expect(casaRestricao(proprio('Melancia em cubos'), marcadas('vegano'))).toBe(false)
    expect(casaRestricao(proprio('Mel orgânico'), marcadas('vegano'))).toBe(true)
    expect(casaRestricao(proprio('Granola sabor novo'), marcadas('ovo'))).toBe(false)
    expect(casaRestricao(proprio('Granola sabor novo'), marcadas('gluten'))).toBe(true)
  })

  it('torrada só no começo do nome é pão', () => {
    expect(casaRestricao(proprio('Torradas integrais'), marcadas('trigo'))).toBe(true)
    expect(casaRestricao(proprio('Castanha torrada'), marcadas('trigo'))).toBe(false)
  })

  it('vegano junta vegetariano, leite e ovo pelo nome', () => {
    const vegano = marcadas('vegano')
    expect(casaRestricao(proprio('Hambúrguer de frango'), vegano)).toBe(true)
    expect(casaRestricao(proprio('Iogurte natural'), vegano)).toBe(true)
    expect(casaRestricao(proprio('Hambúrguer vegetal de grão-de-bico'), vegano)).toBe(false)
  })
})

describe('Alimento próprio pelo grupo (D-492)', () => {
  const doGrupo = (descricao: string, categoria: string, id = 900_001) => ({ id, descricao, categoria })

  it('CA-1348: "Leite e derivados" pega a alergia a leite, a lactose e o vegano, com o nome neutro', () => {
    const coalho = doGrupo('Coalho do Sertão', 'Leite e derivados')
    expect(restricaoDoAlimento(coalho, marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(coalho, marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(casaRestricao(coalho, marcadas('vegano'))).toBe(true)
    expect(casaRestricao(coalho, marcadas('ovo', 'trigo', 'vegetariano'))).toBe(false)
  })

  it('CA-1349: ovos, pescados e carnes pelo grupo; cereais, não', () => {
    expect(restricaoDoAlimento(doGrupo('Fritada da casa', 'Ovos e derivados'), marcadas('ovo'))).toBe('Alergia: ovo')
    const caldeirada = doGrupo('Caldeirada do Pará', 'Pescados e frutos do mar')
    // D-511: pelo grupo, o aviso diz o grupo.
    expect(restricaoDoAlimento(caldeirada, marcadas('peixe'))).toBe('Alergia: peixe (grupo Pescados e frutos do mar)')
    expect(restricaoDoAlimento(caldeirada, marcadas('frutos-do-mar'))).toBe('Alergia: crustáceos e frutos do mar (grupo Pescados e frutos do mar)')
    expect(restricaoDoAlimento(caldeirada, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    expect(restricaoDoAlimento(doGrupo('Paçoca de pilão', 'Carnes e derivados'), marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    expect(casaRestricao(doGrupo('Paçoca de pilão', 'Carnes e derivados'), marcadas('vegano'))).toBe(true)
    expect(casaRestricao(doGrupo('Cuscuz da casa', 'Cereais e derivados'), marcadas('leite', 'ovo', 'peixe', 'frutos-do-mar', 'vegano'))).toBe(false)
  })

  it('CA-1377 (D-511): o aviso que vem do grupo "Pescados e frutos do mar" diz o grupo; o que vem do nome, não (CB-470)', () => {
    const pirarucu = doGrupo('Pirarucu de manta', 'Pescados e frutos do mar')
    const sururu = doGrupo('Sururu do Mundaú', 'Pescados e frutos do mar', 900_002)
    expect(restricaoDoAlimento(pirarucu, marcadas('frutos-do-mar'))).toBe('Alergia: crustáceos e frutos do mar (grupo Pescados e frutos do mar)')
    expect(restricaoDoAlimento(sururu, marcadas('frutos-do-mar'))).toBe('Alergia: crustáceos e frutos do mar')
    expect(restricaoDoAlimento(pirarucu, marcadas('peixe'))).toBe('Alergia: peixe')
    expect(restricaoDoAlimento(sururu, marcadas('peixe'))).toBe('Alergia: peixe (grupo Pescados e frutos do mar)')
    // A linha de texto que nomeia o grupo também diz de onde vem; o vegetariano não muda.
    expect(restricaoDoAlimento(pirarucu, { grupos: [{ id: 'frutos-do-mar', aviso: 'Não come: crustáceos e frutos do mar' }], textos: [], naoGosta: [] })).toBe(
      'Não come: crustáceos e frutos do mar (grupo Pescados e frutos do mar)',
    )
    expect(restricaoDoAlimento(pirarucu, marcadas('vegetariano'))).toBe('Não come por escolha: vegetariano')
    // O alimento da base vale pela lista revisada, sem o grupo no texto.
    expect(restricaoDoAlimento(porNome('Camarão, Rio Grande, grande, cozido'), marcadas('frutos-do-mar'))).toBe('Alergia: crustáceos e frutos do mar')
  })

  it('CA-1350: "vegetal" sozinho não tira o leite; leite, bebida e queijo vegetais e vegano tiram', () => {
    const requeijao = doGrupo('Requeijão cremoso com gordura vegetal (Serra Azul)', 'Outros alimentos industrializados')
    expect(restricaoDoAlimento(requeijao, marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoAlimento(requeijao, marcadas('lactose'))).toBe('Intolerância: lactose')
    for (const nome of ['Leite vegetal de castanha', 'Bebida vegetal de aveia', 'Queijo vegano de castanha']) {
      expect(casaRestricao(proprio(nome), marcadas('leite')), nome).toBe(false)
    }
    expect(casaRestricao(proprio('Hambúrguer vegetal de grão-de-bico'), marcadas('vegetariano'))).toBe(false)
    expect(casaRestricao(proprio('Frango com legumes e gordura vegetal'), marcadas('vegetariano'))).toBe(true)
    // "Coalho" é queijo, também sem a palavra "queijo".
    expect(casaRestricao(proprio('Coalho do Sertão'), marcadas('leite'))).toBe(true)
  })

  it('CA-1351: o leite sem lactose do grupo tem leite e não tem lactose', () => {
    const semLactose = doGrupo('Leite sem lactose (Marca)', 'Leite e derivados')
    expect(casaRestricao(semLactose, marcadas('leite'))).toBe(true)
    expect(casaRestricao(semLactose, marcadas('lactose'))).toBe(false)
  })

  it('CB-457: sem grupo (item antigo), vale só o nome', () => {
    expect(casaRestricao(doGrupo('Coalho do Sertão', 'Meus alimentos'), marcadas('lactose'))).toBe(false)
    expect(casaRestricao(proprio('Fritada da casa'), marcadas('ovo'))).toBe(false)
  })

  it('a base continua pela lista revisada, não pelo grupo', () => {
    // O queijo parmesão da base não tem lactose na lista (D-352), mesmo no grupo Leite e derivados.
    expect(casaRestricao(porNome('Queijo, parmesão'), marcadas('lactose'))).toBe(false)
  })
})

describe('Item do plano e receita (D-353)', () => {
  const item = (alimentoId: number, extra: Partial<ItemPlano> = {}): ItemPlano => ({ id: 'i1', alimentoId, gramas: 100, ...extra })

  it('o alimento da base', () => {
    expect(restricaoDoItem(item(porNome('Queijo, minas, frescal').id), buscarAlimento, marcadas('leite'))).toBe('Alergia: leite e derivados')
    expect(restricaoDoItem(item(porNome('Arroz, tipo 1, cozido').id), buscarAlimento, marcadas('leite'))).toBeNull()
  })

  it('a receita, por qualquer ingrediente', () => {
    const receita = item(ID_DE_RECEITA, {
      receita: {
        origemId: 'r1',
        nome: 'Vitamina de banana',
        ingredientes: [
          { alimentoId: porNome('Banana, prata, crua').id, gramas: 100 },
          { alimentoId: porNome('Leite, de vaca, integral').id, gramas: 200 },
        ],
        porcoes: 1,
        nomeDaPorcao: 'copo',
        pesoProntoG: null,
        preparo: '',
      },
    })
    expect(restricaoDoItem(receita, buscarAlimento, marcadas('lactose'))).toBe('Intolerância: lactose')
    expect(restricaoDoItem(receita, buscarAlimento, marcadas('ovo'))).toBeNull()
  })

  it('alimento que não existe mais não ganha aviso', () => {
    expect(restricaoDoItem(item(123_456_789), buscarAlimento, marcadas('leite'))).toBeNull()
  })
})

describe('Não gosta (D-354)', () => {
  it('separa por vírgula, ponto e vírgula, linha e " e "', () => {
    const r = montarRestricoes({ marcadas: [], texto: '', doencas: [], naoGosta: 'Fígado, jiló e quiabo\nchuchu' })
    expect(r.naoGosta).toEqual(['figado', 'jilo', 'quiabo', 'chuchu'])
    expect(ehNaoGosta(porNome('Carne, bovina, fígado, grelhado'), r)).toBe(true)
    expect(ehNaoGosta(porNome('Chuchu, cozido'), r)).toBe(true)
    expect(ehNaoGosta(porNome('Arroz, tipo 1, cozido'), r)).toBe(false)
    // Não gostar não é restrição: o alimento continua podendo ser sugerido.
    expect(casaRestricao(porNome('Chuchu, cozido'), r)).toBe(false)
  })
})

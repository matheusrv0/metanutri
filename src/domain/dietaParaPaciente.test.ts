// Spec revisao-geral-publica, D-231: "Meu plano" com as regras da folha impressa, a partir da cópia guardada no link.
import { copiarDieta, dietaDoPlano, type ItemDaDieta } from './dietaDoLink.ts'
import { paraOPaciente } from './dietaParaPaciente.ts'
import { criarExemplo } from './exemplo.ts'
import type { QuantidadeNaFolha } from './quantidadeNaFolha.ts'
import { ALIMENTOS } from './tabelas.ts'

/** Como a tela escreve: uma quantidade só, a medida; sem medida, o peso (spec conduta-da-nutricionista, D-297). */
const texto = (q: QuantidadeNaFolha) => q.medida ?? `${q.gramas} g`

/** A cópia do link como o app faz hoje (D-151): o nome da tabela e a medida do planejador. */
function copiaDoExemplo(): readonly ItemDaDieta[] {
  let n = 0
  const { caso, plano } = criarExemplo(() => `id${++n}`, '2026-10-15')
  const dieta = copiarDieta(dietaDoPlano(caso, plano), '2026-10-15')
  return dieta.refeicoes.flatMap((r) => r.opcoes.flat())
}

describe('a dieta do link para o paciente (D-231)', () => {
  it('CA-748: a cópia guardada com o nome da tabela sai com o nome da folha impressa', () => {
    expect(copiaDoExemplo().map((item) => paraOPaciente(item).nome)).toEqual([
      'Pão francês',
      'Margarina com sal',
      'Queijo minas frescal',
      'Mamão Formosa',
      'Banana prata',
      'Castanha-do-pará',
      'Arroz branco cozido',
      'Feijão carioca cozido',
      'Peito de frango grelhado sem pele',
      'Brócolis cozido',
      'Cenoura crua',
      'Macarrão (peso cru)',
      'Patinho grelhado sem gordura',
      'Batata inglesa cozida',
      'Filé de merluza assado',
      'Iogurte natural',
      'Aveia em flocos',
      'Arroz integral cozido',
      'Lentilha cozida',
      'Ovo cozido',
      'Alface crespa',
      'Maçã Fuji com casca',
    ])
  })

  it('CA-749 (com a D-295 e a D-297 da conduta-da-nutricionista): a quantidade é a da folha, uma só, com ponta de faca e até 4 pedaços', () => {
    const linhas = Object.fromEntries(copiaDoExemplo().map((item) => [paraOPaciente(item).nome, texto(paraOPaciente(item).quantidade)]))
    expect(linhas).toMatchObject({
      'Pão francês': '1 unidade e meia',
      'Arroz branco cozido': '6 colheres de sopa',
      'Ovo cozido': '2 unidades',
      'Iogurte natural': '1 copo americano',
      'Maçã Fuji com casca': '3 fatias e meia',
      'Filé de merluza assado': 'meia unidade',
      'Peito de frango grelhado sem pele': '1 bife',
      'Banana prata': '1 unidade e meia',
      'Margarina com sal': '1 ponta de faca',
      'Queijo minas frescal': '30 g',
      'Macarrão (peso cru)': '90 g',
    })
  })

  it('CA-750: nome que não é da base sai como foi guardado, com a quantidade de antes', () => {
    const produto = paraOPaciente({ medida: null, gramas: 45, alimento: 'Barra de proteína da Ana, sabor cacau' })
    expect(produto.nome).toBe('Barra de proteína da Ana, sabor cacau')
    expect(texto(produto.quantidade)).toBe('45 g')

    const removido = paraOPaciente({ medida: null, gramas: 80, alimento: 'Alimento removido' })
    expect(removido.nome).toBe('Alimento removido')
    expect(texto(removido.quantidade)).toBe('80 g')

    // Um nome que a base mudou depois da cópia: a medida guardada.
    const mudou = paraOPaciente({ medida: '2 unidades', gramas: 60, alimento: 'Pão, de queijo, nome antigo' })
    expect(mudou.nome).toBe('Pão, de queijo, nome antigo')
    expect(texto(mudou.quantidade)).toBe('2 unidades')
  })

  it('CA-971 (integracao-rodada-1910): item de receita com o nome de um prato da base sai com a porção da receita', () => {
    // "Feijoada" e "Quindim" existem na base; marcados como receita, nunca são procurados lá.
    const feijoada = paraOPaciente({ medida: '1 porção', gramas: 300, alimento: 'Feijoada', receita: true })
    expect(feijoada.nome).toBe('Feijoada')
    expect(texto(feijoada.quantidade)).toBe('1 porção')
    const quindim = paraOPaciente({ medida: '1 unidade', gramas: 50, alimento: 'Quindim', receita: true })
    expect(texto(quindim.quantidade)).toBe('1 unidade')
    // O mesmo item, se fosse alimento da base, viraria só o peso: é isso que a marca evita.
    expect(texto(paraOPaciente({ medida: '1 porção', gramas: 300, alimento: 'Feijoada' }).quantidade)).toBe('300 g')
  })

  it('CA-972 (integracao-rodada-1910): item de receita sem porção na cópia sai só com o peso e o nome guardado', () => {
    const estragada = paraOPaciente({ medida: null, gramas: 300, alimento: 'Feijoada', receita: true })
    expect(estragada.nome).toBe('Feijoada')
    expect(texto(estragada.quantidade)).toBe('300 g')
  })

  it('D-319 (integracao-rodada-1910): com o plano em "Gramas", só o peso, sem refazer a medida pela base', () => {
    expect(texto(paraOPaciente({ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }, 'gramas').quantidade)).toBe('150 g')
    expect(paraOPaciente({ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }, 'gramas').nome).toBe('Arroz branco cozido')
    expect(texto(paraOPaciente({ medida: '1 porção', gramas: 300, alimento: 'Feijoada', receita: true }, 'gramas').quantidade)).toBe('300 g')
    expect(texto(paraOPaciente({ medida: '2 unidades', gramas: 60, alimento: 'Pão, de queijo, nome antigo' }, 'gramas').quantidade)).toBe('60 g')
    // Em "Medida caseira" (o padrão), a medida é refeita pela base, mesmo que a cópia não tenha guardado nenhuma.
    expect(texto(paraOPaciente({ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }).quantidade)).toBe('6 colheres de sopa')
  })

  it('CB-230: as 597 descrições da base são únicas, então o nome guardado acha um alimento só', () => {
    expect(new Set(ALIMENTOS.map((a) => a.descricao)).size).toBe(ALIMENTOS.length)
  })

  it('CB-232: a quantidade é a da base de hoje, não a medida guardada na cópia', () => {
    // A cópia guardou "5 fatias" (o planejador); a folha de hoje usa a medida de até 4 pedaços que serve (D-295).
    const banana = paraOPaciente({ medida: '5 fatias', gramas: 130, alimento: 'Banana, prata, crua' })
    expect(texto(banana.quantidade)).toBe('1 unidade e meia')
    // Uma medida guardada que a base não daria mais (a base de hoje é quem manda).
    const arroz = paraOPaciente({ medida: '1 xícara de chá', gramas: 150, alimento: 'Arroz, tipo 1, cozido' })
    expect(texto(arroz.quantidade)).toBe('6 colheres de sopa')
  })
})

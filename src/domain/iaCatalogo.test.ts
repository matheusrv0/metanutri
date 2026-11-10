import { CABECALHO_DO_CATALOGO, entraNoCatalogo, fonteDe, linhaDoCatalogo, montarCatalogoIa, porcaoUsual } from './iaCatalogo.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

const achar = (nome: string): Alimento => {
  const a = ALIMENTOS.find((x) => x.descricao.trim() === nome)
  if (!a) throw new Error(`sem ${nome}`)
  return a
}

describe('spec assistente-ia, D-1315: o catálogo da IA', () => {
  it('entra o alimento prescritível da tabela; não entram álcool, sal, doce, fritura nem a forma de ingrediente', () => {
    expect(entraNoCatalogo(achar('Arroz, integral, cozido'))).toBe(true)
    expect(entraNoCatalogo(achar('Feijão, carioca, cozido'))).toBe(true)
    for (const a of ALIMENTOS.filter((x) => /^(Cerveja|Sal,|Açúcar|Aguardente)/.test(x.descricao.trim()))) expect(entraNoCatalogo(a), a.descricao).toBe(false)
    expect(entraNoCatalogo(achar('Arroz, integral, cru'))).toBe(false)
  })

  it('não entram o alimento próprio, o sem energia e o da base ampliada que a curadoria não liberou', () => {
    const arroz = achar('Arroz, integral, cozido')
    expect(entraNoCatalogo({ ...arroz, id: 900_001, proprio: { tipo: 'alimento', nomeParaPaciente: '', sugerir: true, energiaIncoerente: false } })).toBe(false)
    expect(entraNoCatalogo({ ...arroz, nutrientes: { ...arroz.nutrientes, energia_kcal: null } })).toBe(false)
    const ampliada = { fdcId: 1, conjunto: 'SR Legacy', versao: '2018-04', nomeOriginal: 'x', nomeParaPaciente: 'x' }
    expect(entraNoCatalogo({ ...arroz, id: 100_500, ampliada: { ...ampliada, sugerivel: false } })).toBe(false)
    expect(entraNoCatalogo({ ...arroz, id: 100_501, ampliada: { ...ampliada, sugerivel: true } })).toBe(true)
  })

  it('a porção usual é a do grupo; fora dos grupos, a medida caseira mais legível; sem medida, 100 g', () => {
    const arroz = achar('Arroz, integral, cozido')
    expect(porcaoUsual(arroz)).toBe(150)
    const semGrupo: Alimento = { ...arroz, id: 100_999, descricao: 'Inventado', categoria: 'Outros', preparo: null, medidas: [{ nome: 'colher de sopa', gramas: 12 }, { nome: 'unidade', gramas: 40 }] }
    expect(porcaoUsual(semGrupo)).toBe(40)
    expect(porcaoUsual({ ...semGrupo, medidas: [] })).toBe(100)
  })

  it('fonte: a porção usual dá ao menos 15% do valor de referência de adulto', () => {
    const base = achar('Arroz, integral, cozido')
    const vazio = Object.fromEntries(Object.keys(base.nutrientes).map((k) => [k, 0])) as Alimento['nutrientes']
    const inventado: Alimento = { ...base, id: 100_998, descricao: 'Inventado', categoria: 'Outros', preparo: null, medidas: [], nutrientes: { ...vazio, energia_kcal: 50, calcio_mg: 150, ferro_mg: 2, fibra_g: 3.8 } }
    // 100 g: cálcio 150 de 1000 (15%) entra; ferro 2 de 14 (14,3%) não; fibra 3,8 de 25 (15,2%) entra.
    expect(fonteDe(inventado)).toEqual(['cálcio', 'fibra'])
  })

  it('a linha: id, nome, kcal inteiro, macros com uma casa, "-" sem dado e o [ml] do medido em ml', () => {
    const base = achar('Arroz, integral, cozido')
    const vazio = Object.fromEntries(Object.keys(base.nutrientes).map((k) => [k, 0])) as Alimento['nutrientes']
    const leite: Alimento = { ...base, id: 100_997, descricao: 'Bebida | de soja ', unidade: 'ml', medidas: [], nutrientes: { ...vazio, energia_kcal: 54.4, proteina_g: 3.27, carboidrato_g: 6.33, lipideos_g: null } }
    expect(linhaDoCatalogo(leite)).toBe('100997 | Bebida / de soja [ml] | 54 | 3.3 | 6.3 | -')
  })

  it('o texto: cabeçalho, grupos na ordem do menor id e alimentos por id; a mesma base dá o mesmo texto', () => {
    const ids = [561, 1, 448, 3]
    const lista = ids.map((id) => buscarAlimento(id)).filter((a): a is Alimento => a !== undefined)
    const um = montarCatalogoIa(lista)
    const outro = montarCatalogoIa([...lista].reverse())
    expect(um).toEqual(outro)
    expect(um.ids).toEqual([1, 3, 448, 561])
    const linhas = um.texto.split('\n')
    expect(linhas[0]).toBe(CABECALHO_DO_CATALOGO)
    expect(linhas.filter((l) => l.startsWith('## '))).toEqual(['## Cereais e derivados', '## Leite e derivados', '## Leguminosas e derivados'])
    expect(um.texto).not.toMatch(/\d{4}-\d{2}-\d{2}|\d{2}:\d{2}/)
  })
})

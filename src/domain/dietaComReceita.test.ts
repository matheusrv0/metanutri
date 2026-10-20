// Spec receitas-com-calculo, D-278: a receita na dieta do link (CA-883 a CA-885).
import { criarCasoVazio } from './caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta, temDieta } from './dietaDoLink.ts'
import { adicionarItem, adicionarReceita, atualizarGramas, criarPlanoPadrao } from './plano.ts'
import { LIMITE_NOME_RECEITA, LIMITE_PREPARO_RECEITA } from './receitas.ts'
import { PANQUECA } from './receitas.test-utils.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Caso, Plano } from './tipos.ts'

let n = 0
const ids = () => `id${++n}`

const ID_ARROZ = ALIMENTOS.find((a) => a.descricao === 'Arroz, tipo 1, cozido')?.id ?? 0

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

function comPanqueca(gramas = 120): Plano {
  const plano = criarPlanoPadrao(ids)
  const desjejum = plano.refeicoes[0]
  if (!desjejum) throw new Error('plano padrão mudou')
  return adicionarReceita(plano, desjejum.id, 'principal', { receita: PANQUECA, gramas }, ids)
}

const RECEITA_NO_LINK = {
  nome: 'Panqueca de banana',
  rendimento: 'Rende 2 unidades (120 g cada)',
  ingredientes: [
    { medida: '2 unidades', gramas: 150, alimento: 'Banana, prata, crua' },
    { medida: null, gramas: 100, alimento: 'Ovo, de galinha, inteiro, cru' },
    { medida: '2 colheres de sopa', gramas: 30, alimento: 'Aveia, flocos, crua' },
  ],
  preparo: PANQUECA.preparo,
}

describe('a receita na dieta do link', () => {
  it('CA-883 e CA-970 (integracao-rodada-1910): na refeição, a receita é um item com a porção, o peso, o nome dela e a marca de receita', () => {
    const dieta = dietaDoPlano(caso(), comPanqueca())
    expect(dieta.refeicoes[0]?.opcoes[0]).toEqual([{ medida: '1 unidade', gramas: 120, alimento: 'Panqueca de banana', receita: true }])
  })

  it('CA-970 (integracao-rodada-1910): só o item de receita leva a marca; os alimentos e os ingredientes, não', () => {
    let plano = comPanqueca()
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('plano padrão mudou')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: ID_ARROZ, gramas: 150 }, ids)
    const dieta = dietaDoPlano(caso(), plano)
    const itens = dieta.refeicoes.flatMap((r) => r.opcoes.flat())
    expect(itens.filter((i) => 'receita' in i).map((i) => i.alimento)).toEqual(['Panqueca de banana'])
    expect(dieta.receitasDoPlano?.flatMap((r) => r.ingredientes).some((i) => 'receita' in i)).toBe(false)
  })

  it('CA-970 (integracao-rodada-1910): a cópia de um plano sem receita não ganha a marca em lugar nenhum', () => {
    const vazio = criarPlanoPadrao(ids)
    const desjejum = vazio.refeicoes[0]
    if (!desjejum) throw new Error('plano padrão mudou')
    const copia = copiarDieta(dietaDoPlano(caso(), adicionarItem(vazio, desjejum.id, 'principal', { alimentoId: ID_ARROZ, gramas: 150 }, ids)), '2026-10-20')
    expect(copia.refeicoes).toHaveLength(1)
    expect(JSON.stringify(copia)).not.toContain('"receita"')
  })

  it('CA-973 (integracao-rodada-1910): a marca volta igual pela leitura; marca com outro valor é ignorada', () => {
    const copia = copiarDieta(dietaDoPlano(caso(), comPanqueca()), '2026-10-20')
    expect(lerDieta(JSON.parse(JSON.stringify(copia)))?.refeicoes[0]?.opcoes[0]?.[0]).toEqual({ medida: '1 unidade', gramas: 120, alimento: 'Panqueca de banana', receita: true })
    const estranha = lerDieta({
      refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 300, alimento: 'Feijoada', receita: 'sim' }, { medida: null, gramas: 50, alimento: 'Quindim', receita: 1 }]] }],
      orientacoes: '',
      receitas: '',
      copiadaEm: '2026-10-20',
    })
    expect(estranha?.refeicoes[0]?.opcoes[0]).toEqual([
      { medida: null, gramas: 300, alimento: 'Feijoada' },
      { medida: null, gramas: 50, alimento: 'Quindim' },
    ])
  })

  it('CA-884: a cópia leva cada receita do plano, inteira, em texto', () => {
    const dieta = dietaDoPlano(caso(), comPanqueca())
    expect(dieta.receitasDoPlano).toEqual([RECEITA_NO_LINK])
    expect(copiarDieta(dieta, '2026-10-19').receitasDoPlano).toEqual([RECEITA_NO_LINK])
    expect(temDieta(copiarDieta(dieta, '2026-10-19'))).toBe(true)
  })

  it('CA-983 (integracao-rodada-1910): o ingrediente apagado fica fora da cópia; a receita continua na refeição', () => {
    const comApagado = { ...PANQUECA, ingredientes: [...PANQUECA.ingredientes, { alimentoId: 900_001, gramas: 20 }] }
    const plano = criarPlanoPadrao(ids)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('plano padrão mudou')
    const dieta = dietaDoPlano(caso(), adicionarReceita(plano, desjejum.id, 'principal', { receita: comApagado, gramas: 120 }, ids))
    expect(dieta.refeicoes[0]?.opcoes[0]?.map((i) => i.alimento)).toEqual(['Panqueca de banana'])
    expect(dieta.receitasDoPlano?.[0]?.ingredientes.map((i) => i.alimento)).toEqual(['Banana, prata, crua', 'Ovo, de galinha, inteiro, cru', 'Aveia, flocos, crua'])
  })

  it('CB-317 (integracao-rodada-1910, revisão final M-5): receita sem o que comer fica fora da cópia do link', () => {
    const soApagados = { ...PANQUECA, ingredientes: [{ alimentoId: 900_001, gramas: 150 }] }
    const plano = criarPlanoPadrao(ids)
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('plano padrão mudou')
    let comReceitas = adicionarReceita(plano, desjejum.id, 'principal', { receita: soApagados, gramas: 120 }, ids)
    comReceitas = adicionarItem(comReceitas, desjejum.id, 'principal', { alimentoId: ID_ARROZ, gramas: 150 }, ids)
    const dieta = dietaDoPlano(caso(), comReceitas)
    expect(dieta.refeicoes[0]?.opcoes[0]?.map((i) => i.alimento)).toEqual(['Arroz, tipo 1, cozido'])
    expect(dieta).not.toHaveProperty('receitasDoPlano')
  })

  it('CA-884: a cópia guardada volta igual pela leitura, e receita estragada fica de fora', () => {
    const copia = copiarDieta(dietaDoPlano(caso(), comPanqueca()), '2026-10-19')
    const lida = lerDieta(JSON.parse(JSON.stringify(copia)))
    expect(lida).toEqual(copia)
    const estragada = lerDieta({ ...copia, receitasDoPlano: [RECEITA_NO_LINK, { nome: 3 }, { ...RECEITA_NO_LINK, ingredientes: 'x' }] })
    expect(estragada?.receitasDoPlano).toEqual([RECEITA_NO_LINK])
  })

  it('CA-885: plano sem receita não ganha campo novo, e o link de antes desta versão não aparece como mudado', () => {
    const semReceita = dietaDoPlano(caso({ orientacoes: 'Beber água.' }), criarPlanoPadrao(ids))
    expect('receitasDoPlano' in semReceita).toBe(false)
    const linkAntigo = lerDieta({ refeicoes: [], orientacoes: 'Beber água.', receitas: '', copiadaEm: '2026-10-01' })
    expect(linkAntigo).not.toBeNull()
    expect(linkAntigo && 'receitasDoPlano' in linkAntigo).toBe(false)
    expect(linkAntigo && dietaMudou(linkAntigo, semReceita)).toBe(false)
  })

  it('CB-277: dez receitas no limite de tamanho (nome de 120 e preparo de 4.000 letras, 12 ingredientes) cabem bem abaixo dos 256 KB do link', () => {
    let plano = criarPlanoPadrao(ids)
    for (let i = 0; i < 10; i++) {
      const refeicao = plano.refeicoes[i % plano.refeicoes.length]
      if (!refeicao) throw new Error('plano padrão mudou')
      const grande = {
        ...PANQUECA,
        origemId: `r${i}`,
        nome: `${i}`.padEnd(LIMITE_NOME_RECEITA, 'n'),
        preparo: 'p'.repeat(LIMITE_PREPARO_RECEITA),
        ingredientes: Array.from({ length: 12 }, (_, j) => ({ alimentoId: j + 1, gramas: 10 })),
      }
      plano = adicionarReceita(plano, refeicao.id, 'principal', { receita: grande, gramas: 100 }, ids)
    }
    const tamanho = new TextEncoder().encode(JSON.stringify(copiarDieta(dietaDoPlano(caso(), plano), '2026-10-19'))).length
    expect(tamanho).toBeLessThan(256 * 1024 * 0.25)
  })

  it('CA-885: pôr, mudar a quantidade ou tirar a receita conta como mudança', () => {
    const plano = comPanqueca()
    const noLink = copiarDieta(dietaDoPlano(caso(), plano), '2026-10-19')
    expect(dietaMudou(noLink, dietaDoPlano(caso(), plano))).toBe(false)
    const desjejum = plano.refeicoes[0]
    const item = desjejum?.opcoes.principal[0]
    if (!desjejum || !item) throw new Error('plano sem a receita')
    expect(dietaMudou(noLink, dietaDoPlano(caso(), atualizarGramas(plano, desjejum.id, 'principal', item.id, 240)))).toBe(true)
    expect(dietaMudou(noLink, dietaDoPlano(caso(), criarPlanoPadrao(ids)))).toBe(true)
    const semNada = copiarDieta(dietaDoPlano(caso(), criarPlanoPadrao(ids)), '2026-10-19')
    expect(dietaMudou(semNada, dietaDoPlano(caso(), plano))).toBe(true)
  })
})
